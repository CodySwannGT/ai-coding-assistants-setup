import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';

/**
 * Object to represent a template file
 */
export interface TemplateFile {
  sourcePath: string;
  targetPath: string;
  relativePath: string;
  category: TemplateCategory;
}

/**
 * Template categories for organization
 */
export enum TemplateCategory {
  CONFIG = 'configuration',
  DOCUMENTATION = 'documentation',
  HOOK = 'hook',
  TEMPLATE = 'template',
  TOOL = 'tool',
  OTHER = 'other',
}

/**
 * Scanner for template files
 */
export class TemplateScanner {
  private templateDir: string;
  private targetDir: string;
  private templates: TemplateFile[] = [];
  private verbose: boolean;

  /**
   * Constructor for TemplateScanner
   *
   * @param templateDir Directory containing template files
   * @param targetDir Directory where templates will be copied/merged
   * @param verbose Whether to enable verbose logging
   */
  constructor(
    templateDir: string,
    targetDir: string,
    verbose: boolean = false
  ) {
    this.templateDir = templateDir;
    this.targetDir = targetDir;
    this.verbose = verbose;
  }

  /**
   * Scan the template directory for template files
   *
   * @returns Array of template files
   */
  async scan(): Promise<TemplateFile[]> {
    try {
      if (!fs.existsSync(this.templateDir)) {
        throw new Error(`Template directory not found: ${this.templateDir}`);
      }

      this.templates = [];
      await this.scanDirectory(this.templateDir);

      if (this.verbose) {
        Feedback.info(`Found ${this.templates.length} template files`);
      }

      return this.templates;
    } catch (error) {
      Feedback.error(
        `Error scanning templates: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Recursively scan a directory for template files
   *
   * @param dir Directory to scan
   * @param relativeDir Relative path from template root directory
   */
  private async scanDirectory(
    dir: string,
    relativeDir: string = ''
  ): Promise<void> {
    try {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const relItemPath = path.join(relativeDir, item);
        const targetPath = path.join(this.targetDir, relItemPath);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // Skip node_modules and .git directories
          if (item === 'node_modules' || item === '.git') {
            continue;
          }

          // Recurse into subdirectories
          await this.scanDirectory(itemPath, relItemPath);
        } else if (stats.isFile()) {
          // Skip if template file is itself a template pattern (e.g. *.template.*)
          if (item.includes('.template.')) {
            continue;
          }

          this.templates.push({
            sourcePath: itemPath,
            targetPath,
            relativePath: relItemPath,
            category: this.categorizeTemplate(relItemPath),
          });

          if (this.verbose) {
            Feedback.info(`Found template: ${relItemPath}`);
          }
        }
      }
    } catch (error) {
      Feedback.error(
        `Error scanning directory ${dir}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a mapping of source to target paths for template files
   *
   * @returns Map of source paths to target paths
   */
  getTemplateMap(): Map<string, string> {
    const map = new Map<string, string>();

    for (const template of this.templates) {
      // Special case for mcp.json - map it to both .mcp.json in the root and .roo/mcp.json
      if (template.relativePath === '.roo/mcp.json') {
        // Map to .mcp.json in the root
        const rootTargetPath = path.join(this.targetDir, '.mcp.json');
        map.set(template.sourcePath, rootTargetPath);

        // Also map to .roo/mcp.json in the parent project root
        const rooTargetPath = path.join(this.targetDir, '.roo', 'mcp.json');
        // We need to use a different key since Map can't have duplicate keys
        // Using a modified path with a special prefix to ensure uniqueness
        map.set(template.sourcePath + '.__roo_copy__', rooTargetPath);

        if (this.verbose) {
          Feedback.info(
            `Special mapping: ${template.relativePath} -> .mcp.json and .roo/mcp.json`
          );
        }
      } else {
        map.set(template.sourcePath, template.targetPath);
      }
    }

    return map;
  }

  /**
   * Ensure the .roo/mcp.json file is properly created
   *
   * @returns Promise resolving to true if setup was successful
   */
  async ensureMcpJson(): Promise<boolean> {
    try {
      // Find the mcp.json template
      const mcpTemplate = this.templates.find(
        t => t.relativePath === '.roo/mcp.json'
      );

      if (!mcpTemplate) {
        Feedback.warning('mcp.json template not found. Skipping.');
        return false;
      }

      // Read the template content
      const content = await fs.readFile(mcpTemplate.sourcePath, 'utf8');

      // Create .mcp.json in the root
      const rootMcpPath = path.join(this.targetDir, '.mcp.json');
      await fs.ensureFile(rootMcpPath);
      await fs.writeFile(rootMcpPath, content);
      Feedback.success(`Created .mcp.json at ${rootMcpPath}`);

      // Create .roo/mcp.json in the project root
      const rooDir = path.join(this.targetDir, '.roo');
      const rooMcpPath = path.join(rooDir, 'mcp.json');
      await fs.ensureDir(rooDir);
      await fs.writeFile(rooMcpPath, content);
      Feedback.success(`Created .roo/mcp.json at ${rooMcpPath}`);

      return true;
    } catch (error) {
      Feedback.error(
        `Failed to create mcp.json: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Get templates filtered by category
   *
   * @param category Category to filter by
   * @returns Filtered templates
   */
  getTemplatesByCategory(category: TemplateCategory): TemplateFile[] {
    return this.templates.filter(template => template.category === category);
  }

  /**
   * Categorize a template file based on its path
   *
   * @param relativePath Relative path of the template file
   * @returns Template category
   */
  private categorizeTemplate(relativePath: string): TemplateCategory {
    const lowerPath = relativePath.toLowerCase();

    // Configuration files
    if (
      lowerPath.startsWith('.roo/') ||
      lowerPath.startsWith('.claude/') ||
      lowerPath.startsWith('.github/') ||
      lowerPath.startsWith('.husky/') ||
      lowerPath.endsWith('.json') ||
      lowerPath.endsWith('.yml') ||
      lowerPath.endsWith('.yaml') ||
      lowerPath.endsWith('.config.js') ||
      lowerPath.endsWith('.rc') ||
      lowerPath.includes('.config')
    ) {
      return TemplateCategory.CONFIG;
    }

    // Documentation files
    if (
      lowerPath.endsWith('.md') ||
      lowerPath.endsWith('.txt') ||
      lowerPath.endsWith('.docs')
    ) {
      return TemplateCategory.DOCUMENTATION;
    }

    // Hook files
    if (
      lowerPath.includes('hook') ||
      lowerPath.includes('commit') ||
      lowerPath.includes('pre-') ||
      lowerPath.includes('post-')
    ) {
      return TemplateCategory.HOOK;
    }

    // Template files
    if (lowerPath.includes('template') || lowerPath.includes('scaffold')) {
      return TemplateCategory.TEMPLATE;
    }

    // Tool files
    if (
      lowerPath.endsWith('.sh') ||
      lowerPath.endsWith('.js') ||
      lowerPath.endsWith('.ts') ||
      lowerPath.includes('script') ||
      lowerPath.includes('tool')
    ) {
      return TemplateCategory.TOOL;
    }

    // Default to OTHER
    return TemplateCategory.OTHER;
  }
}
