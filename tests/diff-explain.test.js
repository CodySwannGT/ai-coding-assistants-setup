/**
 * Tests for the diff-explain module
 */
import { jest } from '@jest/globals';
import path from 'path';

// Sample git diff output for testing
const sampleDiff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,5 +1,7 @@
 function test() {
-  return 'old';
+  // Added comment
+  return 'new';
+  // Another comment
 }
 
 module.exports = test;`;

// Mock dependencies
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  pathExists: jest.fn().mockResolvedValue(false)
}));

jest.mock('child_process', () => ({
  execSync: jest.fn().mockReturnValue(sampleDiff)
}));

jest.mock('../src/integrations/claude-cli.js', () => ({
  isClaudeCliAvailable: jest.fn().mockResolvedValue(true),
  callClaudeCli: jest.fn().mockResolvedValue({
    content: JSON.stringify({
      summary: 'Test summary',
      files: [
        {
          path: 'test.js',
          explanation: 'Test explanation',
          issues: []
        }
      ]
    })
  })
}));

jest.mock('../src/config/environment.js', () => ({
  loadEnvironmentVars: jest.fn().mockResolvedValue({
    ANTHROPIC_API_KEY: 'test-api-key'
  })
}));

jest.mock('../src/utils/logger.js', () => ({
  printHeader: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn(),
  printError: jest.fn(),
  printSuccess: jest.fn(),
  printDebug: jest.fn()
}));

// Import after mocking
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { isClaudeCliAvailable, callClaudeCli } from '../src/integrations/claude-cli.js';

// Import the module to test
import {
  getGitDiff,
  processDiff,
  createDiffExplainPrompt,
  explainDiffWithClaude,
  formatDiffOutput,
  explainDiff
} from '../src/integrations/diff-explain.js';

describe('diff-explain module', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('getGitDiff', () => {
    test('gets diff for staged changes', () => {
      getGitDiff({ staged: true });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff --staged',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
    
    test('gets diff for a specific commit', () => {
      getGitDiff({ commit: 'abc1234' });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff abc1234',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
    
    test('gets diff for a specific branch', () => {
      getGitDiff({ branch: 'main' });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff main',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
    
    test('gets diff between two references', () => {
      getGitDiff({ since: 'HEAD~3', until: 'HEAD' });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff HEAD~3..HEAD',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
    
    test('gets diff for specific files', () => {
      getGitDiff({ files: ['file1.js', 'file2.js'] });
      
      expect(execSync).toHaveBeenCalledWith(
        'git diff -- file1.js file2.js',
        expect.objectContaining({ encoding: 'utf8' })
      );
    });
    
    test('handles command failure gracefully', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('Command failed');
      });
      
      const result = getGitDiff({ staged: true });
      
      expect(result).toBe('');
    });
  });
  
  describe('processDiff', () => {
    test('processes valid diff output', () => {
      const result = processDiff(sampleDiff);
      
      expect(result.files.length).toBe(1);
      expect(result.files[0].path).toBe('test.js');
      expect(result.stats.additions).toBe(2);
      expect(result.stats.deletions).toBe(1);
      expect(result.stats.fileCount).toBe(1);
    });
    
    test('throws error for diff that exceeds size limit', () => {
      const largeDiff = 'a'.repeat(10001);
      
      expect(() => processDiff(largeDiff, { maxDiffSize: 10000 })).toThrow('Diff too large');
    });
    
    test('handles empty diff', () => {
      const result = processDiff('');
      
      expect(result.files.length).toBe(0);
      expect(result.stats.additions).toBe(0);
      expect(result.stats.deletions).toBe(0);
    });
  });
  
  describe('createDiffExplainPrompt', () => {
    test('creates a prompt with default options', () => {
      const diffInfo = processDiff(sampleDiff);
      const prompt = createDiffExplainPrompt(diffInfo);
      
      expect(prompt).toContain('You are an expert code reviewer');
      expect(prompt).toContain('Git Diff Stats');
      expect(prompt).toContain('Format your response as JSON with the following structure');
      expect(prompt).toContain(sampleDiff);
    });
    
    test('creates a prompt with custom options', () => {
      const diffInfo = processDiff(sampleDiff);
      const prompt = createDiffExplainPrompt(diffInfo, {
        verbosity: 'brief',
        focusAreas: ['security', 'performance'],
        highlightIssues: false,
        includeSuggestions: false
      });
      
      expect(prompt).toContain('Be concise, focus only on the most important aspects');
      expect(prompt).toContain('security');
      expect(prompt).toContain('performance');
      expect(prompt).toContain('Focus on explaining the changes without highlighting potential issues');
      expect(prompt).toContain('Do not include suggestions for improvement');
    });
  });
  
  describe('formatDiffOutput', () => {
    test('formats output with inline format', () => {
      const diffInfo = processDiff(sampleDiff);
      const explanation = {
        summary: 'Test summary',
        files: [
          {
            path: 'test.js',
            explanation: 'Test explanation',
            issues: []
          }
        ]
      };
      
      const output = formatDiffOutput(diffInfo, explanation, { outputFormat: 'inline' });
      
      expect(output).toContain('=== Claude AI Git Diff Explanation ===');
      expect(output).toContain('Test summary');
      expect(output).toContain('Test explanation');
      expect(output).toContain('File: test.js');
    });
    
    test('formats output with summary-only format', () => {
      const diffInfo = processDiff(sampleDiff);
      const explanation = {
        summary: 'Test summary',
        files: [
          {
            path: 'test.js',
            explanation: 'Test explanation',
            issues: [
              {
                severity: 'medium',
                description: 'Test issue',
                suggestion: 'Test suggestion'
              }
            ]
          }
        ]
      };
      
      const output = formatDiffOutput(diffInfo, explanation, { 
        outputFormat: 'summary-only',
        highlightIssues: true 
      });
      
      expect(output).toContain('Test summary');
      expect(output).toContain('Test explanation');
      expect(output).toContain('Issues:');
      expect(output).toContain('Test issue');
      expect(output).toContain('Suggestion: Test suggestion');
      expect(output).not.toContain(sampleDiff);
    });
  });
  
  describe('explainDiffWithClaude', () => {
    test('calls Claude CLI when available', async () => {
      await explainDiffWithClaude('test prompt', {
        claudeApiKey: 'test-api-key'
      });
      
      expect(callClaudeCli).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'test prompt',
        format: 'json'
      }));
    });
  });
  
  describe('explainDiff', () => {
    test('runs the full diff explanation process', async () => {
      const result = await explainDiff({
        staged: true
      });
      
      expect(execSync).toHaveBeenCalled();
      expect(result).toContain('Claude AI Git Diff Explanation');
    });
    
    test('handles empty diff', async () => {
      execSync.mockReturnValueOnce('');
      
      const result = await explainDiff({
        staged: true
      });
      
      expect(result).toBe('No changes to explain.');
    });
    
    test('handles errors gracefully', async () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('Command failed');
      });
      
      const result = await explainDiff({
        staged: true
      });
      
      expect(result).toContain('Error explaining diff');
    });
  });
});