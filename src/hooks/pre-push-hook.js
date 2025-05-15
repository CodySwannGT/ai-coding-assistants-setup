/**
 * Pre-Push Hook
 * 
 * Implements a pre-push hook for Git that checks for potential security issues
 * before code is pushed to a remote repository.
 */

import path from 'path';
import { BaseHook } from './base-hook.js';

class PrePushHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Security Check Pre-Push Hook',
      description: 'Checks for security issues before pushing code',
      gitHookName: 'pre-push'
    });
    
    // Additional configuration specific to pre-push
    this.auditTypes = config.auditTypes || ['secrets', 'credentials', 'vulnerabilities'];
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to audit
    this.blockOnSeverity = config.blockOnSeverity || 'high'; // Block on this severity level or higher
    this.blockingMode = config.blockingMode !== undefined ? config.blockingMode : true; // Block push by default
  }

  /**
   * Generate the hook script content
   * @returns {string} The hook script content
   */
  generateHookScript() {
    return `#!/bin/sh
# AI Coding Assistants Hook: ${this.name}
# Description: ${this.description}
# Generated: ${new Date().toISOString()}

# Get the current branch name
BRANCH_NAME=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$BRANCH_NAME" ]; then
  echo "Not on a branch, using current commit as reference"
  BRANCH_NAME=$(git rev-parse HEAD)
fi

# Run the Claude hook for pre-push validation
npx ai-coding-assistants-setup claude-hook-runner pre-push --non-interactive "$BRANCH_NAME" "$@"
exit $?
`;
  }

  /**
   * Execute the pre-push hook logic
   * @param {Array<string>} _args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(_args) {
    const branchName = _args[0] || 'HEAD';
    
    this.info(`Executing pre-push hook for branch: ${branchName}`);
    
    try {
      // Check if there are any changes to push
      const remoteRef = await this.getRemoteRef(branchName);
      if (!remoteRef) {
        this.info('No remote reference found, new branch push detected');
        // For new branches, check all commits since the branch was created
        await this.auditNewBranch(branchName);
      } else {
        // For existing branches, check diff between local and remote
        await this.auditExistingBranch(branchName, remoteRef);
      }
    } catch (err) {
      this.error(`Failed to execute pre-push security audit: ${err.message}`);
      
      // Default behavior is to block the push in case of hook failure
      if (this.blockingMode) {
        this.error('Blocking mode enabled, blocking push due to hook failure');
        process.exit(1);
      } else {
        this.warn('Non-blocking mode enabled, allowing push despite hook failure');
        process.exit(0);
      }
    }
  }

  /**
   * Get the remote reference for a local branch
   * @param {string} branchName Local branch name
   * @returns {Promise<string|null>} Remote reference or null if not found
   */
  async getRemoteRef(branchName) {
    try {
      const remoteRef = this.executeCommand(`git rev-parse --abbrev-ref --symbolic-full-name ${branchName}@{u} 2>/dev/null || echo ""`).trim();
      return remoteRef || null;
    } catch (err) {
      // No tracking branch set up
      return null;
    }
  }

  /**
   * Audit a new branch (all commits)
   * @param {string} branchName Branch name
   * @returns {Promise<void>}
   */
  async auditNewBranch(branchName) {
    // Get the branch point (where it diverged from another branch)
    let baseBranch;
    try {
      const remoteBranches = this.executeCommand('git branch -r').split('\n').map(b => b.trim());
      if (remoteBranches.includes('origin/main')) {
        baseBranch = 'origin/main';
      } else if (remoteBranches.includes('origin/master')) {
        baseBranch = 'origin/master';
      } else {
        // Use first remote branch as base
        baseBranch = remoteBranches[0];
      }
    } catch (err) {
      this.warn(`Could not determine base branch: ${err.message}`);
      baseBranch = '';
    }

    let diff;
    if (baseBranch) {
      // Get diff from the point where branch diverged from base
      this.info(`Checking diff from ${baseBranch} to ${branchName}`);
      diff = this.executeCommand(`git diff ${baseBranch}..${branchName}`);
    } else {
      // Get all commits on this branch
      this.info(`Checking all commits in ${branchName}`);
      diff = this.executeCommand(`git diff $(git rev-list --max-parents=0 HEAD)..${branchName}`);
    }

    await this.auditDiff(diff);
  }

  /**
   * Audit an existing branch (diff between local and remote)
   * @param {string} branchName Local branch name
   * @param {string} remoteRef Remote reference
   * @returns {Promise<void>}
   */
  async auditExistingBranch(branchName, remoteRef) {
    this.info(`Checking diff from ${remoteRef} to ${branchName}`);
    const diff = this.executeCommand(`git diff ${remoteRef}..${branchName}`);
    
    if (!diff) {
      this.info('No changes to push, skipping security audit');
      return;
    }
    
    await this.auditDiff(diff);
  }

  /**
   * Audit a git diff for security issues
   * @param {string} diff Git diff to audit
   * @returns {Promise<void>}
   */
  async auditDiff(diff) {
    if (!diff || diff.length === 0) {
      this.info('No changes to audit, skipping security check');
      return;
    }
    
    if (diff.length > this.maxDiffSize) {
      this.warn(`Diff too large (${diff.length} bytes), security audit may be incomplete`);
      // We still try to audit but warn that it might not catch everything
    }
    
    const issues = [];
    
    // Check for secrets and credentials
    this.info('Checking for secrets and credentials in diff...');

    // Simple pattern matching for basic checks
    if (this.auditTypes.includes('credentials')) {
      // Check for possible API keys and secrets in diff
      const apiKeyPatterns = [
        { pattern: /(['"])?(API|api|Api)(_|-)?([kK]ey|[tT]oken)(\1)?(\s*)(:|=)(\s*)(['"])[A-Za-z0-9+=/]{16,}(\9)/g,
          description: 'Possible API key or token found in code' },
        { pattern: /(['"])?[a-zA-Z0-9_-]{20,}\.([a-zA-Z0-9_-]{20,}\.)?[a-zA-Z0-9_-]{20,}(\1)?/g,
          description: 'Possible JWT or authentication token' },
        { pattern: /(['"])?[A-Za-z0-9/+]{40,}(\1)?/g,
          description: 'Possible base64 encoded secret' }
      ];

      for (const {pattern, description} of apiKeyPatterns) {
        const matches = [...diff.matchAll(pattern)];
        if (matches.length > 0) {
          issues.push({
            severity: 'high',
            description: description,
            count: matches.length
          });
        }
      }
    }

    // Check for other security issues specific to the languages in the codebase
    // For example, SQL injection, XSS, etc.
    if (this.auditTypes.includes('vulnerabilities')) {
      const vulnerabilityPatterns = [
        { pattern: /\.execute\(\s*['"].*\$\{.*\}/g,
          description: 'Potential SQL injection vulnerability' },
        { pattern: /\.html\(\s*['"].*\$\{.*\}/g,
          description: 'Potential XSS vulnerability' },
        { pattern: /eval\s*\(/g,
          description: 'Use of eval() function - security risk' },
        { pattern: /require\s*\(\s*(.*\+.*)\s*\)/g,
          description: 'Dynamic require() - security risk' },
        { pattern: /process\.env\..*PASSWORD/g,
          description: 'Password in environment variable' },
        { pattern: /SECRET|secret|password|PASSWORD/g,
          description: 'Possible credential in code' },
      ];

      for (const {pattern, description} of vulnerabilityPatterns) {
        const matches = [...diff.matchAll(pattern)];
        if (matches.length > 0) {
          issues.push({
            severity: 'medium',
            description: description,
            count: matches.length
          });
        }
      }
    }

    // Output the results
    if (issues.length > 0) {
      this.outputIssues(issues);
      
      // Block push if necessary
      if (this.blockingMode && this.shouldBlockPush(issues)) {
        this.error(`Security issues with severity ${this.blockOnSeverity} or higher found, blocking push`);
        process.exit(1);
      } else {
        this.warn('Security issues found, but allowing push due to configuration');
      }
    } else {
      this.success('No security issues found in changes!');
    }
  }

  /**
   * Determine whether to block the push based on issue severity
   * @param {Array<Object>} issues Security issues
   * @returns {boolean} Whether to block the push
   */
  shouldBlockPush(issues) {
    if (this.blockOnSeverity === 'none') {
      return false;
    }

    const severityLevels = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1,
      'none': 0
    };

    const thresholdLevel = severityLevels[this.blockOnSeverity] || 0;

    return issues.some(issue => {
      const issueSeverityLevel = severityLevels[issue.severity] || 0;
      return issueSeverityLevel >= thresholdLevel;
    });
  }

  /**
   * Output security issues to the console
   * @param {Array<Object>} issues Security issues
   */
  outputIssues(issues) {
    console.log('\n=== Security Audit Results ===\n');
    console.log(`Found ${issues.length} potential security issues:\n`);
    
    // Group issues by severity
    const issuesBySeverity = {};
    for (const issue of issues) {
      if (!issuesBySeverity[issue.severity]) {
        issuesBySeverity[issue.severity] = [];
      }
      issuesBySeverity[issue.severity].push(issue);
    }
    
    // Output issues by severity (highest first)
    const severities = ['critical', 'high', 'medium', 'low'];
    for (const severity of severities) {
      const severityIssues = issuesBySeverity[severity];
      if (severityIssues && severityIssues.length > 0) {
        console.log(`${severity.toUpperCase()} severity issues:`);
        for (const issue of severityIssues) {
          console.log(`- ${issue.description} (${issue.count} instance${issue.count > 1 ? 's' : ''})`);
        }
        console.log('');
      }
    }
    
    console.log('===========================\n');
  }
}

export default PrePushHook;