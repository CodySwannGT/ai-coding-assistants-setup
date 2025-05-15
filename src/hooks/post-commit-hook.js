/**
 * Post-Commit Hook
 * 
 * This hook runs after a commit is created and stores commit information
 * in the project memory. It extracts metadata from the commit and saves it
 * to the memory storage (.ai/memory.jsonl), allowing AIs to reference
 * commit history for better context.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import BaseHook from './base-hook.js';

class PostCommitHook extends BaseHook {
  constructor(config = {}) {
    super({
      ...config,
      name: 'Post-Commit Memory',
      description: 'Stores commit information in project memory for Claude and Roo',
      gitHookName: 'post-commit'
    });

    this.memoryPath = config.memoryPath || '.ai/memory.jsonl';
    this.extractTypes = config.extractTypes || true;
  }

  /**
   * Execute the post-commit hook
   * @param {Array} args Arguments passed to the hook
   * @returns {Promise<Object>} Execution result
   */
  async execute(args = []) {
    try {
      // Get commit information
      const commitMsg = this.runGitCommand('log -1 --pretty=%B');
      const commitAuthor = this.runGitCommand('log -1 --pretty=%an');
      const commitDate = this.runGitCommand('log -1 --pretty=%ad --date=format:"%Y-%m-%d %H:%M:%S"');
      const commitHash = this.runGitCommand('log -1 --pretty=%H');
      const projectName = path.basename(this.runGitCommand('rev-parse --show-toplevel').trim());
      
      // Determine the absolute path to the memory file
      const projectRoot = this.runGitCommand('rev-parse --show-toplevel').trim();
      const absoluteMemoryPath = path.join(projectRoot, this.memoryPath);
      
      // Determine commit type (for conventional commits)
      let commitType = "other";
      if (this.extractTypes) {
        const conventionalTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
        for (const type of conventionalTypes) {
          if (commitMsg.startsWith(`${type}:`) || commitMsg.startsWith(`${type}(`)) {
            commitType = type;
            break;
          }
        }
      }
      
      // Ensure the memory directory exists
      const memoryDir = path.dirname(absoluteMemoryPath);
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }
      
      // Create memory entry for the commit
      const commitEntity = {
        type: "entity",
        name: `Commit:${commitHash}`,
        entityType: "Commit",
        observations: [
          `[${commitType}] ${commitMsg}`,
          `Author: ${commitAuthor}`,
          `Date: ${commitDate}`
        ]
      };
      
      // Create relation from project to commit
      const commitRelation = {
        type: "relation",
        from: `Project:${projectName}`,
        to: `Commit:${commitHash}`,
        relationType: "HAS_COMMIT"
      };
      
      // Write to memory file
      fs.appendFileSync(absoluteMemoryPath, JSON.stringify(commitEntity) + '\n');
      fs.appendFileSync(absoluteMemoryPath, JSON.stringify(commitRelation) + '\n');
      
      this.info(`Commit information stored in project memory at ${this.memoryPath}`);
      this.info(`Commit type detected: ${commitType}`);
      
      return {
        success: true,
        commitHash,
        commitType,
        memoryPath: this.memoryPath
      };
    } catch (error) {
      this.error(`Failed to execute post-commit hook: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Run a Git command and return the output
   * @param {string} command Git command to run
   * @returns {string} Command output
   */
  runGitCommand(command) {
    try {
      return execSync(`git ${command}`, { encoding: 'utf8' }).trim();
    } catch (error) {
      this.error(`Failed to run git command '${command}': ${error.message}`);
      throw error;
    }
  }
}

export default PostCommitHook;