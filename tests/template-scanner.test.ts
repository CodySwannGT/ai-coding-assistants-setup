import fs from 'fs-extra';
import path from 'path';
import {
  TemplateCategory,
  TemplateScanner,
} from '../src/utils/template-scanner';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/utils/feedback');

describe('TemplateScanner', () => {
  // Setup test data
  const templateDir = '/test/template-dir';
  const targetDir = '/test/target-dir';
  const mockFiles = [
    // Config files
    { path: '.roo/settings.json', category: TemplateCategory.CONFIG },
    { path: '.claude/settings.json', category: TemplateCategory.CONFIG },
    { path: '.mcp.json', category: TemplateCategory.CONFIG },
    { path: '.eslintrc.js', category: TemplateCategory.CONFIG },

    // Documentation files
    { path: 'README.md', category: TemplateCategory.DOCUMENTATION },
    { path: 'CLAUDE.md', category: TemplateCategory.DOCUMENTATION },
    { path: 'usage.docs', category: TemplateCategory.DOCUMENTATION },

    // Hook files
    { path: '.husky/pre-commit', category: TemplateCategory.HOOK },
    { path: 'hooks/commit-msg-hook.js', category: TemplateCategory.HOOK },

    // Tool files
    { path: 'scripts/setup.sh', category: TemplateCategory.TOOL },
    { path: 'src/tools/code-review.ts', category: TemplateCategory.TOOL },
  ];

  let scanner: TemplateScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new TemplateScanner(templateDir, targetDir);

    // Setup mock file system
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFileSystem: Record<string, any> = {
      [templateDir]: {
        '.roo': {
          'settings.json': '{ "setup": true }',
        },
        '.claude': {
          'settings.json': '{ "model": "claude-3-opus-20240229" }',
        },
        '.mcp.json': '{ "version": "1.0.0" }',
        '.eslintrc.js': 'module.exports = {}',
        'README.md': '# AI Coding Assistants',
        'CLAUDE.md': '# Claude Configuration',
        'usage.docs': 'Usage documentation',
        '.husky': {
          'pre-commit': '#!/bin/sh',
        },
        hooks: {
          'commit-msg-hook.js': 'console.log("hook")',
        },
        scripts: {
          'setup.sh': '#!/bin/bash',
        },
        src: {
          tools: {
            'code-review.ts': 'export class CodeReview {}',
          },
        },
        node_modules: {
          'some-package': 'should be skipped',
        },
        '.git': {
          config: 'should be skipped',
        },
      },
    };

    // Mock filesystem methods
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      // Check if path exists in our mock filesystem
      const parts = path.split('/').filter(Boolean);
      let current = mockFileSystem;

      for (const part of parts) {
        if (!current[part]) return false;
        current = current[part];
      }

      return true;
    });

    (fs.readdir as jest.Mock).mockImplementation((dir: string) => {
      // Get directory contents from our mock filesystem
      const parts = dir.split('/').filter(Boolean);
      let current = mockFileSystem;

      for (const part of parts) {
        if (!current[part]) throw new Error(`Directory not found: ${dir}`);
        current = current[part];
      }

      return Promise.resolve(Object.keys(current));
    });

    (fs.stat as jest.Mock).mockImplementation((itemPath: string) => {
      // Check if path is a directory or file in our mock filesystem
      const parts = itemPath.split('/').filter(Boolean);
      let current = mockFileSystem;
      let isDir = false;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) throw new Error(`Path not found: ${itemPath}`);

        if (i === parts.length - 1) {
          isDir = typeof current[part] === 'object';
        }

        current = current[part];
      }

      return Promise.resolve({
        isDirectory: () => isDir,
        isFile: () => !isDir,
      });
    });
  });

  describe('scan', () => {
    it('should scan template directory and find all template files', async () => {
      const templates = await scanner.scan();

      // Should find all template files but skip node_modules and .git
      expect(templates.length).toBe(mockFiles.length);

      // Check template paths
      mockFiles.forEach(mockFile => {
        const template = templates.find(t => t.relativePath === mockFile.path);
        expect(template).toBeDefined();
        expect(template?.sourcePath).toBe(
          path.join(templateDir, mockFile.path)
        );
        expect(template?.targetPath).toBe(path.join(targetDir, mockFile.path));
      });
    });

    it('should categorize templates correctly', async () => {
      const templates = await scanner.scan();

      // Check template categories
      mockFiles.forEach(mockFile => {
        const template = templates.find(t => t.relativePath === mockFile.path);
        expect(template?.category).toBe(mockFile.category);
      });
    });

    it('should return empty array if template directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const templates = await scanner.scan();

      expect(templates).toEqual([]);
    });

    it('should skip template pattern files', async () => {
      // Add a template pattern file to our mock filesystem
      const mockWithTemplate = {
        ...mockFileSystem,
        [templateDir]: {
          ...mockFileSystem[templateDir],
          'component.template.ts': 'template content',
        },
      };

      (fs.readdir as jest.Mock).mockImplementation((dir: string) => {
        // Get directory contents from our updated mock filesystem
        const parts = dir.split('/').filter(Boolean);
        let current = mockWithTemplate;

        for (const part of parts) {
          if (!current[part]) throw new Error(`Directory not found: ${dir}`);
          current = current[part];
        }

        return Promise.resolve(Object.keys(current));
      });

      const templates = await scanner.scan();

      // Should not include the template pattern file
      const templatePatternFile = templates.find(
        t => t.relativePath === 'component.template.ts'
      );
      expect(templatePatternFile).toBeUndefined();
    });
  });

  describe('getTemplateMap', () => {
    it('should return a map of source to target paths', async () => {
      await scanner.scan();
      const map = scanner.getTemplateMap();

      expect(map.size).toBe(mockFiles.length);

      mockFiles.forEach(mockFile => {
        const sourcePath = path.join(templateDir, mockFile.path);
        const targetPath = path.join(targetDir, mockFile.path);
        expect(map.get(sourcePath)).toBe(targetPath);
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates filtered by category', async () => {
      await scanner.scan();

      // Count expected templates per category
      const expectedCounts: Record<string, number> = {};
      mockFiles.forEach(file => {
        const category = file.category;
        expectedCounts[category] = (expectedCounts[category] || 0) + 1;
      });

      // Check each category
      Object.keys(expectedCounts).forEach(category => {
        const templates = scanner.getTemplatesByCategory(
          category as TemplateCategory
        );
        expect(templates.length).toBe(expectedCounts[category]);

        // All templates should have the correct category
        templates.forEach(template => {
          expect(template.category).toBe(category);
        });
      });
    });
  });
});
