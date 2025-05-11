/**
 * Test-First Development Hook
 * 
 * Implements a Git hook that detects when new files are added without corresponding test files
 * and uses Claude to suggest appropriate test cases.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class TestFirstDevelopmentHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Test-First Development Enforcer',
      description: 'Detects new files without tests and suggests test cases',
      gitHookName: 'pre-commit' // This hook is installed as a pre-commit hook
    });
    
    // Additional configuration specific to test-first development
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.fileExtensions = config.fileExtensions || ['.js', '.jsx', '.ts', '.tsx', '.py', '.rb']; // File extensions to check
    this.testDirectories = config.testDirectories || ['test', 'tests', '__tests__', 'spec']; // Directories where tests should be located
    this.testPatterns = config.testPatterns || [ // Patterns to identify test files
      '{name}.test{ext}',
      '{name}.spec{ext}',
      'test_{name}{ext}',
      '__tests__/{name}.test{ext}',
      '__tests__/{name}.spec{ext}',
      'tests/{name}{ext}',
      'test/{name}{ext}',
      'spec/{name}{ext}'
    ];
    this.excludePatterns = config.excludePatterns || [ // Patterns to exclude
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**'
    ];
    this.testFramework = config.testFramework || 'auto'; // 'jest', 'mocha', 'pytest', 'auto' for auto-detection
    this.suggestWithClaude = config.suggestWithClaude !== false; // Whether to use Claude for test suggestions
    this.maxFileSize = config.maxFileSize || 50000; // Maximum file size to analyze
  }

  /**
   * Generate the hook script content
   * @returns {string} The hook script content
   */
  generateHookScript() {
    // Get the Node executable path
    const nodePath = process.execPath;
    
    // Get the script path - this will be installed in the project's bin directory
    const scriptPath = path.join(this.projectRoot, 'node_modules', '.bin', 'claude-hook-runner');
    
    return `#!/bin/sh
# AI Coding Assistants Hook: ${this.name}
# Description: ${this.description}
# Generated: ${new Date().toISOString()}

# Check if there are any new files being added
new_files=$(git diff --cached --name-status | grep "^A" | cut -f2-)
if [ -z "$new_files" ]; then
  echo "No new files added, skipping ${this.name} hook"
  exit 0
fi

# Run the hook script with arguments for specific file extensions
"${nodePath}" "${scriptPath}" test-first-development "$@"
exit $?
`;
  }

  /**
   * Execute the test-first development hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing test-first development hook...');
    
    try {
      // Get staged files that are being added (new files)
      const newFiles = await this.getNewStagedFiles();
      
      if (newFiles.length === 0) {
        this.info('No new files being added, skipping check');
        return;
      }
      
      this.debug(`Found ${newFiles.length} new files: ${newFiles.join(', ')}`);
      
      // Filter files to only include relevant source files (not test files)
      const sourceFiles = this.filterSourceFiles(newFiles);
      
      if (sourceFiles.length === 0) {
        this.info('No new source files being added, skipping check');
        return;
      }
      
      this.debug(`Found ${sourceFiles.length} new source files: ${sourceFiles.join(', ')}`);
      
      // For each source file, check if a test file exists
      const missingTests = [];
      
      for (const sourceFile of sourceFiles) {
        const testFiles = this.findTestFiles(sourceFile);
        
        if (testFiles.length === 0) {
          missingTests.push(sourceFile);
        }
      }
      
      if (missingTests.length === 0) {
        this.success('All new source files have corresponding test files');
        return;
      }
      
      this.warn(`Found ${missingTests.length} new source files without tests:`);
      missingTests.forEach(file => {
        this.warn(`  - ${file}`);
      });
      
      // Generate test suggestions using Claude
      if (this.suggestWithClaude) {
        for (const file of missingTests) {
          await this.suggestTests(file);
        }
      }
      
      // Block commit if necessary based on blocking mode
      if (this.blockingMode === 'block') {
        this.error('Test-First Development enforced - please write tests for all new source files');
        this.info('Suggested test file paths:');
        
        missingTests.forEach(file => {
          const suggestedPaths = this.suggestTestPaths(file);
          this.info(`  For ${file}:`);
          suggestedPaths.forEach(testPath => {
            this.info(`    - ${testPath}`);
          });
        });
        
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute test-first development hook: ${err.message}`);
      
      // Don't block the commit in case of hook failure unless in blocking mode
      if (this.blockingMode === 'block') {
        process.exit(1);
      }
    }
  }

  /**
   * Get new files that are being staged
   * @returns {Promise<Array<string>>} List of new file paths
   */
  async getNewStagedFiles() {
    const output = this.executeCommand('git diff --cached --name-status');
    const files = [];
    
    output.split('\n').forEach(line => {
      const match = line.match(/^A\s+(.+)$/);
      if (match) {
        files.push(match[1]);
      }
    });
    
    return files;
  }

  /**
   * Filter out files that are not source files or already in excluded patterns
   * @param {Array<string>} files List of files to filter
   * @returns {Array<string>} Filtered list of source files
   */
  filterSourceFiles(files) {
    return files.filter(file => {
      // Skip files that match exclude patterns
      if (this.isExcluded(file)) {
        return false;
      }
      
      // Check if the file has a relevant extension
      const ext = path.extname(file);
      if (!this.fileExtensions.includes(ext)) {
        return false;
      }
      
      // Skip files that are already test files
      if (this.isTestFile(file)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Check if a file should be excluded based on exclude patterns
   * @param {string} filePath File path to check
   * @returns {boolean} Whether the file should be excluded
   */
  isExcluded(filePath) {
    return this.excludePatterns.some(pattern => {
      // Simple glob pattern matching for **
      if (pattern.includes('**')) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
        return regex.test(filePath);
      }
      
      // For simple patterns, check if the file path includes the pattern
      return filePath.includes(pattern);
    });
  }

  /**
   * Check if a file is a test file based on its path and name
   * @param {string} filePath File path to check
   * @returns {boolean} Whether the file is a test file
   */
  isTestFile(filePath) {
    // Check if file is in a test directory
    if (this.testDirectories.some(dir => filePath.includes(`/${dir}/`))) {
      return true;
    }
    
    // Check if file name matches test patterns
    const fileName = path.basename(filePath);
    return fileName.includes('.test.') || 
           fileName.includes('.spec.') || 
           fileName.startsWith('test_');
  }

  /**
   * Find existing test files for a source file
   * @param {string} sourceFile Source file path
   * @returns {Array<string>} List of test file paths
   */
  findTestFiles(sourceFile) {
    const testFiles = [];
    const dirName = path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const ext = path.extname(sourceFile);
    
    // Generate possible test file paths
    const possibleTestPaths = this.suggestTestPaths(sourceFile);
    
    // Check if any of the test files exist
    possibleTestPaths.forEach(testPath => {
      const fullPath = path.join(this.projectRoot, testPath);
      if (fs.existsSync(fullPath)) {
        testFiles.push(testPath);
      }
    });
    
    return testFiles;
  }

  /**
   * Suggest test file paths for a source file
   * @param {string} sourceFile Source file path
   * @returns {Array<string>} List of suggested test file paths
   */
  suggestTestPaths(sourceFile) {
    const dirName = path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const ext = path.extname(sourceFile);
    
    const testPaths = [];
    
    this.testPatterns.forEach(pattern => {
      let testPath = pattern
        .replace('{name}', baseName)
        .replace('{ext}', ext);
      
      // Handle absolute vs. relative paths
      if (testPath.startsWith('/')) {
        testPaths.push(testPath);
      } else if (testPath.includes('/')) {
        // Path contains directories, join with dirname
        const testDir = testPath.substring(0, testPath.lastIndexOf('/'));
        const testFile = testPath.substring(testPath.lastIndexOf('/') + 1);
        
        if (dirName === '.') {
          testPaths.push(testPath);
        } else {
          // Try both original directory and replacing src with test
          testPaths.push(path.join(dirName, testPath));
          
          // If source is in src/, suggest test in test/ with same subdirectory
          if (dirName.includes('/src/')) {
            const testDirPath = dirName.replace('/src/', '/test/');
            testPaths.push(path.join(testDirPath, testFile));
          }
        }
      } else {
        // Just a filename, add to current directory
        testPaths.push(path.join(dirName, testPath));
      }
    });
    
    return [...new Set(testPaths)]; // Remove duplicates
  }

  /**
   * Suggest tests for a source file using Claude
   * @param {string} sourceFile Source file path
   * @returns {Promise<void>}
   */
  async suggestTests(sourceFile) {
    try {
      // Read the source file content
      const fullPath = path.join(this.projectRoot, sourceFile);
      
      if (!await fs.pathExists(fullPath)) {
        this.warn(`Source file ${sourceFile} not found, skipping test suggestion`);
        return;
      }
      
      const fileContent = await fs.readFile(fullPath, 'utf8');
      
      if (fileContent.length > this.maxFileSize) {
        this.warn(`Source file ${sourceFile} is too large (${fileContent.length} bytes), skipping test suggestion`);
        return;
      }
      
      // Detect test framework if set to auto
      const framework = this.testFramework === 'auto' 
        ? await this.detectTestFramework() 
        : this.testFramework;
      
      // Load environment variables to get API key
      const env = this.loadEnv();
      this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
      
      if (!this.claudeApiKey && !this.claudeCliAvailable) {
        this.warn('No Claude API key or CLI found, skipping test suggestion');
        return;
      }
      
      // Create a prompt for Claude
      const prompt = this.createTestSuggestionPrompt(sourceFile, fileContent, framework);
      
      // Call Claude API
      this.info(`Asking Claude to suggest tests for ${sourceFile}...`);
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-haiku-20240307', // Use Haiku for faster response
        maxTokens: 2000,
        temperature: 0.2
      });
      
      // Parse the response
      const suggestion = this.parseTestSuggestion(response);
      
      // Print the test suggestion
      this.outputTestSuggestion(sourceFile, suggestion);
      
      // Create the test file if requested
      if (suggestion.testPath && suggestion.testContent && this.blockingMode === 'none') {
        const createTest = false; // Set to true if you want to automatically create test files
        if (createTest) {
          await this.createTestFile(suggestion.testPath, suggestion.testContent);
        }
      }
    } catch (err) {
      this.error(`Failed to suggest tests for ${sourceFile}: ${err.message}`);
    }
  }

  /**
   * Create a prompt for Claude to suggest tests
   * @param {string} sourceFile Source file path
   * @param {string} fileContent Source file content
   * @param {string} framework Test framework to use
   * @returns {string} Prompt for Claude
   */
  createTestSuggestionPrompt(sourceFile, fileContent, framework) {
    const fileExt = path.extname(sourceFile);
    const fileName = path.basename(sourceFile);
    const testPaths = this.suggestTestPaths(sourceFile);
    
    return `You are an expert test engineer. I need your help writing tests for a source file following test-first development principles.

Source file: ${sourceFile}
Test framework: ${framework}

Suggested test file paths:
${testPaths.map(p => `- ${p}`).join('\n')}

Please analyze the following source code and suggest appropriate tests:

\`\`\`${fileExt}
${fileContent}
\`\`\`

Your task:
1. Recommend the most appropriate test file path from the suggestions above
2. Write a complete test file for this source code using the ${framework} framework
3. Include tests for all public functions/methods
4. Include edge cases and error scenarios
5. Ensure tests are meaningful and cover the code's functionality

Format your response as a JSON object with the following structure:
{
  "testPath": "recommended test file path",
  "testContent": "complete test file content",
  "testCases": [
    {
      "name": "Name of test case",
      "description": "What this test case verifies"
    }
  ],
  "coverage": "Estimate of code coverage percentage",
  "frameworkUsed": "Test framework used"
}`;
  }

  /**
   * Parse Claude's test suggestion response
   * @param {Object} response Claude API response
   * @returns {Object} Parsed test suggestion
   */
  parseTestSuggestion(response) {
    try {
      const message = response.content[0]?.text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/) || 
                       message.match(/```([\s\S]*?)```/) ||
                       message.match(/\{[\s\S]*"testPath"[\s\S]*"testContent"[\s\S]*\}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      
      // If no JSON found, try to extract test content
      const codeMatch = message.match(/```[a-z]*\n([\s\S]*?)\n```/);
      if (codeMatch) {
        return {
          testContent: codeMatch[1],
          testCases: [],
          coverage: "unknown",
          frameworkUsed: "unknown"
        };
      }
      
      // If nothing can be parsed, return a basic structure
      return {
        testContent: "// Could not parse test suggestion from Claude",
        testCases: [],
        coverage: "unknown",
        frameworkUsed: "unknown"
      };
    } catch (err) {
      this.error(`Failed to parse test suggestion: ${err.message}`);
      return {
        testContent: "// Error parsing test suggestion",
        testCases: [],
        coverage: "unknown",
        frameworkUsed: "unknown"
      };
    }
  }

  /**
   * Output test suggestion to the console
   * @param {string} sourceFile Source file path
   * @param {Object} suggestion Test suggestion
   */
  outputTestSuggestion(sourceFile, suggestion) {
    console.log('\n=== Claude Test Suggestion ===\n');
    console.log(`Source file: ${chalk.cyan(sourceFile)}`);
    
    if (suggestion.testPath) {
      console.log(`Recommended test path: ${chalk.cyan(suggestion.testPath)}`);
    }
    
    if (suggestion.frameworkUsed) {
      console.log(`Test framework: ${chalk.cyan(suggestion.frameworkUsed)}`);
    }
    
    if (suggestion.coverage) {
      console.log(`Estimated coverage: ${chalk.cyan(suggestion.coverage)}`);
    }
    
    if (suggestion.testCases && suggestion.testCases.length > 0) {
      console.log('\nSuggested test cases:');
      suggestion.testCases.forEach(testCase => {
        console.log(`  * ${chalk.yellow(testCase.name)}: ${testCase.description}`);
      });
    }
    
    if (suggestion.testContent) {
      console.log('\nSuggested test file content:');
      console.log(chalk.gray('-----------------------------------'));
      console.log(suggestion.testContent);
      console.log(chalk.gray('-----------------------------------'));
    }
    
    console.log('\n===========================\n');
  }

  /**
   * Create a test file with the suggested content
   * @param {string} testPath Test file path
   * @param {string} testContent Test file content
   * @returns {Promise<boolean>} Whether the file was created successfully
   */
  async createTestFile(testPath, testContent) {
    try {
      const fullPath = path.join(this.projectRoot, testPath);
      
      // Create directory if it doesn't exist
      await fs.ensureDir(path.dirname(fullPath));
      
      // Check if file already exists
      if (await fs.pathExists(fullPath)) {
        this.warn(`Test file ${testPath} already exists, skipping creation`);
        return false;
      }
      
      // Write test file
      await fs.writeFile(fullPath, testContent);
      this.success(`Created test file ${testPath}`);
      
      // Stage the new test file
      this.executeCommand(`git add ${testPath}`);
      this.info(`Staged test file ${testPath}`);
      
      return true;
    } catch (err) {
      this.error(`Failed to create test file ${testPath}: ${err.message}`);
      return false;
    }
  }

  /**
   * Detect the test framework used in the project
   * @returns {Promise<string>} Detected test framework
   */
  async detectTestFramework() {
    try {
      // Check package.json for test frameworks
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJson(packagePath);
        
        const { dependencies = {}, devDependencies = {} } = packageJson;
        const allDeps = { ...dependencies, ...devDependencies };
        
        if (allDeps.jest) return 'jest';
        if (allDeps.mocha) return 'mocha';
        if (allDeps.jasmine) return 'jasmine';
        if (allDeps.cypress) return 'cypress';
        if (allDeps['@testing-library/react']) return 'react-testing-library';
        if (allDeps.vitest) return 'vitest';
      }
      
      // Check for Python test frameworks
      const requirements = path.join(this.projectRoot, 'requirements.txt');
      if (await fs.pathExists(requirements)) {
        const content = await fs.readFile(requirements, 'utf8');
        if (content.includes('pytest')) return 'pytest';
        if (content.includes('unittest')) return 'unittest';
      }
      
      // Check for Ruby test frameworks
      const gemfile = path.join(this.projectRoot, 'Gemfile');
      if (await fs.pathExists(gemfile)) {
        const content = await fs.readFile(gemfile, 'utf8');
        if (content.includes('rspec')) return 'rspec';
        if (content.includes('minitest')) return 'minitest';
      }
      
      // Default to jest for JavaScript projects
      if (this.fileExtensions.includes('.js') || this.fileExtensions.includes('.jsx')) {
        return 'jest';
      }
      
      // Default to pytest for Python projects
      if (this.fileExtensions.includes('.py')) {
        return 'pytest';
      }
      
      return 'unknown';
    } catch (err) {
      this.error(`Failed to detect test framework: ${err.message}`);
      return 'unknown';
    }
  }
}

export default TestFirstDevelopmentHook;