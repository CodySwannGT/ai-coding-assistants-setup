/**
 * Hook Utilities
 * 
 * Provides common utility functions for Git hooks in the AI Coding Assistants setup.
 * These utilities help with Git operations, file manipulations, and other common tasks.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { HookResultStatus } from './hook-interfaces.js';

/**
 * Git Operation Utilities
 */
export const GitUtils = {
  /**
   * Get the current Git branch
   * @param {string} projectRoot Project root directory
   * @returns {string|null} Current branch name or null if not in a branch
   */
  getCurrentBranch: (projectRoot) => {
    try {
      return execSync('git symbolic-ref --short HEAD', { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
    } catch (err) {
      return null;
    }
  },
  
  /**
   * Get the list of staged files
   * @param {string} projectRoot Project root directory
   * @returns {Array<string>} List of staged file paths
   */
  getStagedFiles: (projectRoot) => {
    try {
      const output = execSync('git diff --cached --name-only', { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
      
      return output ? output.split('\n') : [];
    } catch (err) {
      return [];
    }
  },
  
  /**
   * Get the diff of staged changes
   * @param {string} projectRoot Project root directory
   * @returns {string} Git diff output
   */
  getStagedDiff: (projectRoot) => {
    try {
      return execSync('git diff --cached', { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
    } catch (err) {
      return '';
    }
  },
  
  /**
   * Get the diff between two commits or refs
   * @param {string} projectRoot Project root directory
   * @param {string} from From commit or ref
   * @param {string} to To commit or ref
   * @returns {string} Git diff output
   */
  getDiff: (projectRoot, from, to) => {
    try {
      return execSync(`git diff ${from} ${to}`, { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
    } catch (err) {
      return '';
    }
  },
  
  /**
   * Get the list of files changed between two commits or refs
   * @param {string} projectRoot Project root directory
   * @param {string} from From commit or ref
   * @param {string} to To commit or ref
   * @returns {Array<string>} List of changed file paths
   */
  getChangedFiles: (projectRoot, from, to) => {
    try {
      const output = execSync(`git diff --name-only ${from} ${to}`, { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
      
      return output ? output.split('\n') : [];
    } catch (err) {
      return [];
    }
  },
  
  /**
   * Get recent commits
   * @param {string} projectRoot Project root directory
   * @param {number} count Number of commits to retrieve
   * @returns {Array<Object>} List of recent commits
   */
  getRecentCommits: (projectRoot, count = 5) => {
    try {
      const output = execSync(`git log -${count} --format="%H|%an|%s"`, { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
      
      if (!output) {
        return [];
      }
      
      return output.split('\n').map(line => {
        const [hash, author, subject] = line.split('|');
        return { hash, author, subject };
      });
    } catch (err) {
      return [];
    }
  },
  
  /**
   * Get the content of a commit message from a file
   * @param {string} filePath Path to the commit message file
   * @returns {string} The commit message
   */
  getCommitMessage: async (filePath) => {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      return '';
    }
  },
  
  /**
   * Set the content of a commit message file
   * @param {string} filePath Path to the commit message file
   * @param {string} message The commit message
   * @returns {boolean} Whether the message was successfully written
   */
  setCommitMessage: async (filePath, message) => {
    try {
      await fs.writeFile(filePath, message);
      return true;
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Get the Git root directory
   * @param {string} startDir Starting directory
   * @returns {string|null} Git root directory or null if not in a Git repo
   */
  getGitRoot: (startDir) => {
    try {
      return execSync('git rev-parse --show-toplevel', { 
        encoding: 'utf8', 
        cwd: startDir 
      }).trim();
    } catch (err) {
      return null;
    }
  },
  
  /**
   * Get the age of a branch in days
   * @param {string} projectRoot Project root directory
   * @param {string} branch Branch name
   * @returns {number} Branch age in days
   */
  getBranchAge: (projectRoot, branch) => {
    try {
      // Get the timestamp of the first commit in the branch
      const cmd = `git log --format=%at $(git merge-base ${branch} HEAD)..${branch} | tail -1`;
      const result = execSync(cmd, { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
      
      if (result) {
        const timestamp = parseInt(result);
        const now = Math.floor(Date.now() / 1000);
        const ageInSeconds = now - timestamp;
        return Math.floor(ageInSeconds / 86400); // Convert to days
      }
      
      return 0;
    } catch (err) {
      return 0;
    }
  },
  
  /**
   * Get the commits that will be pushed
   * @param {string} projectRoot Project root directory
   * @param {string} remote Remote name
   * @param {string} branch Branch name
   * @returns {Array<Object>} List of commits to be pushed
   */
  getCommitsToPush: (projectRoot, remote = 'origin', branch = '') => {
    try {
      const targetBranch = branch || GitUtils.getCurrentBranch(projectRoot);
      if (!targetBranch) return [];
      
      // Get the remote branch ref
      const remoteBranch = `${remote}/${targetBranch}`;
      
      // Check if remote branch exists
      try {
        execSync(`git rev-parse --verify ${remoteBranch}`, { 
          encoding: 'utf8', 
          cwd: projectRoot 
        });
      } catch (err) {
        // Remote branch doesn't exist, all commits will be pushed
        return GitUtils.getRecentCommits(projectRoot, 50);
      }
      
      // Get commits that will be pushed
      const output = execSync(`git log ${remoteBranch}..${targetBranch} --format="%H|%an|%s"`, { 
        encoding: 'utf8', 
        cwd: projectRoot 
      }).trim();
      
      if (!output) {
        return [];
      }
      
      return output.split('\n').map(line => {
        const [hash, author, subject] = line.split('|');
        return { hash, author, subject };
      });
    } catch (err) {
      return [];
    }
  }
};

/**
 * File Operation Utilities
 */
export const FileUtils = {
  /**
   * Read a file with error handling
   * @param {string} filePath Path to the file
   * @returns {string} File contents or empty string if file doesn't exist
   */
  readFile: async (filePath) => {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      return '';
    }
  },
  
  /**
   * Write to a file with error handling
   * @param {string} filePath Path to the file
   * @param {string} content Content to write
   * @returns {boolean} Whether the file was successfully written
   */
  writeFile: async (filePath, content) => {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      return true;
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Check if a file exists
   * @param {string} filePath Path to the file
   * @returns {boolean} Whether the file exists
   */
  fileExists: async (filePath) => {
    try {
      return await fs.pathExists(filePath);
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Check if a directory exists
   * @param {string} dirPath Path to the directory
   * @returns {boolean} Whether the directory exists
   */
  dirExists: async (dirPath) => {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Create a directory
   * @param {string} dirPath Path to the directory
   * @returns {boolean} Whether the directory was successfully created
   */
  createDir: async (dirPath) => {
    try {
      await fs.ensureDir(dirPath);
      return true;
    } catch (err) {
      return false;
    }
  },
  
  /**
   * Get the size of a file
   * @param {string} filePath Path to the file
   * @returns {number} File size in bytes
   */
  getFileSize: async (filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (err) {
      return 0;
    }
  },
  
  /**
   * Get file extension
   * @param {string} filePath Path to the file
   * @returns {string} File extension (including the dot)
   */
  getFileExtension: (filePath) => {
    return path.extname(filePath);
  },
  
  /**
   * Check if a file matches a pattern
   * @param {string} filePath Path to the file
   * @param {string|Array<string>} pattern Pattern(s) to match against
   * @returns {boolean} Whether the file matches the pattern
   */
  fileMatchesPattern: (filePath, pattern) => {
    if (Array.isArray(pattern)) {
      return pattern.some(p => FileUtils.fileMatchesPattern(filePath, p));
    }
    
    // Convert glob pattern to regex
    const regex = new RegExp(
      `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`
    );
    
    return regex.test(filePath);
  }
};

/**
 * Environment Utilities
 */
export const EnvUtils = {
  /**
   * Load environment variables from .env file
   * @param {string} projectRoot Project root directory
   * @returns {Object} Environment variables
   */
  loadEnv: (projectRoot) => {
    try {
      const envPath = path.join(projectRoot, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        
        envContent.split('\n').forEach(line => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            env[key] = value;
          }
        });
        
        return env;
      }
    } catch (err) {
      // Return empty object on error
    }
    
    return {};
  },
  
  /**
   * Get an environment variable
   * @param {string} name Environment variable name
   * @param {string} defaultValue Default value if not found
   * @returns {string} Environment variable value
   */
  getEnv: (name, defaultValue = '') => {
    return process.env[name] || defaultValue;
  },
  
  /**
   * Check if running in CI environment
   * @returns {boolean} Whether running in CI
   */
  isCI: () => {
    return !!process.env.CI;
  }
};

/**
 * Hook Result Utilities
 */
export const ResultUtils = {
  /**
   * Create a success result
   * @param {string} message Success message
   * @param {Object} data Additional data
   * @returns {Object} Success result
   */
  success: (message, data = {}) => {
    return {
      status: HookResultStatus.SUCCESS,
      message,
      data,
      shouldBlock: false,
      issues: []
    };
  },
  
  /**
   * Create a warning result
   * @param {string} message Warning message
   * @param {Array<Object>} issues List of issues
   * @param {Object} data Additional data
   * @returns {Object} Warning result
   */
  warning: (message, issues = [], data = {}) => {
    return {
      status: HookResultStatus.WARNING,
      message,
      data,
      shouldBlock: false,
      issues
    };
  },
  
  /**
   * Create an error result
   * @param {string} message Error message
   * @param {Array<Object>} issues List of issues
   * @param {Object} data Additional data
   * @param {boolean} shouldBlock Whether to block the Git operation
   * @returns {Object} Error result
   */
  error: (message, issues = [], data = {}, shouldBlock = true) => {
    return {
      status: HookResultStatus.ERROR,
      message,
      data,
      shouldBlock,
      issues
    };
  },
  
  /**
   * Create a skipped result
   * @param {string} message Skip reason
   * @returns {Object} Skipped result
   */
  skipped: (message) => {
    return {
      status: HookResultStatus.SKIPPED,
      message,
      data: {},
      shouldBlock: false,
      issues: []
    };
  },
  
  /**
   * Create a failure result
   * @param {string} message Failure message
   * @param {Error} error Error object
   * @param {boolean} shouldBlock Whether to block the Git operation
   * @returns {Object} Failure result
   */
  failure: (message, error, shouldBlock = false) => {
    return {
      status: HookResultStatus.FAILURE,
      message,
      data: { error: error.message, stack: error.stack },
      shouldBlock,
      issues: [{
        severity: 'high',
        description: error.message,
        file: '',
        line: ''
      }]
    };
  },
  
  /**
   * Check if a result should block the Git operation
   * @param {Object} result Hook result
   * @param {string} blockingMode How to respond to issues ('block', 'warn', 'none')
   * @param {string} blockOnSeverity Minimum severity to block on
   * @returns {boolean} Whether to block the Git operation
   */
  shouldBlock: (result, blockingMode, blockOnSeverity) => {
    // If explicit shouldBlock flag is set, respect it
    if (result.shouldBlock !== undefined) {
      return result.shouldBlock;
    }
    
    // Skip is never blocking
    if (result.status === HookResultStatus.SKIPPED) {
      return false;
    }
    
    // Success is never blocking
    if (result.status === HookResultStatus.SUCCESS) {
      return false;
    }
    
    // If not in blocking mode, don't block
    if (blockingMode !== 'block') {
      return false;
    }
    
    // Error and Failure are blocking in blocking mode
    if (result.status === HookResultStatus.ERROR ||
        result.status === HookResultStatus.FAILURE) {
      return true;
    }
    
    // Warning is blocking only if there are issues with severity >= blockOnSeverity
    if (result.status === HookResultStatus.WARNING) {
      const severityLevels = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1,
        'none': 0
      };
      
      const thresholdLevel = severityLevels[blockOnSeverity || 'none'];
      
      return result.issues.some(issue => {
        const issueSeverityLevel = severityLevels[issue.severity] || 0;
        return issueSeverityLevel >= thresholdLevel;
      });
    }
    
    return false;
  }
};

/**
 * Hook Utilities
 * 
 * Combines all utility modules
 */
export default {
  GitUtils,
  FileUtils,
  EnvUtils,
  ResultUtils
};