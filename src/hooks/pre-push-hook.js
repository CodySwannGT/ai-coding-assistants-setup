/**
 * Pre-Push Hook
 * 
 * Implements a pre-push hook for Git that uses Claude to perform
 * security and quality audits before pushing code to a remote repository.
 */

import fs from 'fs-extra';
import path from 'path';
import { BaseHook } from './base-hook.js';

class PrePushHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Pre-Push Security Audit',
      description: 'Uses Claude to perform a security audit before pushing code',
      gitHookName: 'pre-push'
    });
    
    // Additional configuration specific to pre-push
    this.blockingMode = config.blockingMode || false; // Whether to block pushes on issues
    this.auditTypes = config.auditTypes || ['security', 'credentials', 'sensitive-data', 'dependencies']; // What to audit for
    this.excludePatterns = config.excludePatterns || ['node_modules/**', 'dist/**', 'build/**', '**/*.lock']; // Files to exclude
    this.maxCommits = config.maxCommits || 10; // Maximum number of commits to audit
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to audit
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

# Extract the remote repository and branch information from stdin
read local_ref local_sha remote_ref remote_sha

# Skip if pushing nothing (e.g., deleting a branch)
if [ -z "$local_sha" -o "$local_sha" = "0000000000000000000000000000000000000000" ]; then
  exit 0
fi

# Skip if force pushing
if [ -z "$remote_sha" -o "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
  echo "Force push detected, skipping ${this.name} hook"
  exit 0
fi

# Run the hook script, passing the remote and commit information
"${nodePath}" "${scriptPath}" pre-push "$local_ref" "$local_sha" "$remote_ref" "$remote_sha"
exit $?
`;
  }

  /**
   * Execute the pre-push hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing pre-push hook...');
    
    try {
      // Extract reference and SHA information from arguments
      const [localRef, localSha, remoteRef, remoteSha] = args;
      
      if (!localRef || !localSha || !remoteRef) {
        this.error('Missing reference or SHA information');
        process.exit(1);
      }
      
      // Get the branch name from the reference
      const branchName = localRef.replace('refs/heads/', '');
      this.info(`Pushing branch ${branchName} to remote`);
      
      // Get the list of commits to be pushed
      const commitsToPush = await this.getCommitsToPush(remoteSha, localSha);
      
      if (commitsToPush.length === 0) {
        this.info('No commits to push, skipping audit');
        process.exit(0);
      }
      
      if (commitsToPush.length > this.maxCommits) {
        this.warn(`Pushing ${commitsToPush.length} commits, which exceeds the maximum of ${this.maxCommits} for audit`);
        if (this.blockingMode) {
          this.error('Blocking mode enabled, please push fewer commits or disable blocking mode');
          process.exit(1);
        } else {
          this.warn('Skipping audit due to large number of commits. Consider pushing in smaller increments.');
          process.exit(0);
        }
      }
      
      // Get the diff for the commits to be pushed
      const diff = await this.getDiffForCommits(remoteSha, localSha);
      
      if (!diff || diff.length === 0) {
        this.info('No changes to push, skipping audit');
        process.exit(0);
      }
      
      // Check if the diff is too large
      if (diff.length > this.maxDiffSize) {
        this.warn(`Diff too large (${diff.length} bytes), skipping audit`);
        if (this.blockingMode) {
          this.error('Blocking mode enabled, please push smaller changes or disable blocking mode');
          process.exit(1);
        } else {
          process.exit(0);
        }
      }
      
      // Audit the changes with Claude
      const auditResult = await this.auditChanges(diff, commitsToPush);
      
      // Output the audit results
      this.outputAuditResults(auditResult);
      
      // Block push if necessary
      const hasCriticalIssues = auditResult.issues.some(issue => 
        issue.severity === 'critical' && 
        this.auditTypes.includes(issue.type)
      );
      
      if (this.blockingMode && hasCriticalIssues) {
        this.error('Critical security issues found, blocking push');
        this.info('You can push anyway with git push --no-verify');
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute pre-push hook: ${err.message}`);
      
      // Don't block the push in case of hook failure
      if (!this.blockingMode) {
        this.warn('Allowing push to proceed despite hook failure');
        process.exit(0);
      } else {
        this.error('Blocking mode enabled, blocking push due to hook failure');
        process.exit(1);
      }
    }
  }

  /**
   * Get the list of commits to be pushed
   * @param {string} remoteSha The SHA of the remote branch
   * @param {string} localSha The SHA of the local branch
   * @returns {Promise<Array<Object>>} List of commits to be pushed
   */
  async getCommitsToPush(remoteSha, localSha) {
    try {
      // Get the range of commits between the remote and local SHAs
      const range = `${remoteSha}..${localSha}`;
      const output = this.executeCommand(`git log ${range} --pretty=format:"%h|%an|%s"`);
      
      // Parse the output into a list of commit objects
      return output.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [hash, author, subject] = line.split('|');
          return { hash, author, subject };
        });
    } catch (err) {
      this.error(`Failed to get commits to push: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the diff for the commits to be pushed
   * @param {string} remoteSha The SHA of the remote branch
   * @param {string} localSha The SHA of the local branch
   * @returns {Promise<string>} Git diff output
   */
  async getDiffForCommits(remoteSha, localSha) {
    try {
      // Get the diff between the remote and local SHAs
      return this.executeCommand(`git diff ${remoteSha}..${localSha}`);
    } catch (err) {
      this.error(`Failed to get diff for commits: ${err.message}`);
      return '';
    }
  }

  /**
   * Audit changes with Claude
   * @param {string} diff Git diff to audit
   * @param {Array<Object>} commits List of commits being pushed
   * @returns {Promise<Object>} Audit results
   */
  async auditChanges(diff, commits) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      throw new Error('No Claude API key found. Please set ANTHROPIC_API_KEY in your .env file');
    }
    
    // Create a prompt for Claude
    const prompt = this.createAuditPrompt(diff, commits);
    
    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000
      });
      
      // Parse the response
      return this.parseAuditResponse(response);
    } catch (err) {
      this.error(`Failed to audit changes with Claude: ${err.message}`);
      return {
        summary: 'Failed to audit changes with Claude',
        issues: []
      };
    }
  }

  /**
   * Create a prompt for Claude to audit changes
   * @param {string} diff Git diff to audit
   * @param {Array<Object>} commits List of commits being pushed
   * @returns {string} Prompt for Claude
   */
  createAuditPrompt(diff, commits) {
    const commitsList = commits.map(commit => `${commit.hash} ${commit.author}: ${commit.subject}`).join('\n');
    
    return `You are a cybersecurity expert reviewing code changes before they are pushed to a remote repository. Please perform a security audit of the following Git diff and commits.

Focus on identifying the following issues:
${this.auditTypes.includes('security') ? '- Security vulnerabilities (e.g., SQL injection, XSS, CSRF)' : ''}
${this.auditTypes.includes('credentials') ? '- Credentials or API keys committed to the repository' : ''}
${this.auditTypes.includes('sensitive-data') ? '- Sensitive information disclosure (e.g., PII, secrets)' : ''}
${this.auditTypes.includes('dependencies') ? '- Vulnerable dependencies or packages' : ''}

# Commits being pushed:
${commitsList}

# Git Diff:
\`\`\`diff
${diff}
\`\`\`

Please analyze the code changes and provide:
1. A brief summary of the security implications of these changes
2. Any security issues found, categorized by severity (critical, high, medium, low) and type (security, credentials, sensitive-data, dependencies)
3. Recommendations for addressing any issues found

Format your response as JSON with the following structure:
{
  "summary": "Brief summary of security implications",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "type": "security|credentials|sensitive-data|dependencies",
      "description": "Issue description",
      "recommendation": "Recommended fix",
      "file": "affected file path",
      "line": "line number or range"
    }
  ]
}`;
  }

  /**
   * Parse Claude's response to extract audit information
   * @param {Object} response Claude API response
   * @returns {Object} Parsed audit information
   */
  parseAuditResponse(response) {
    try {
      const message = response.content[0]?.text || '';
      
      // Try to extract JSON from the response
      const jsonMatch = message.match(/```json\n([\s\S]*?)\n```/) || 
                       message.match(/```([\s\S]*?)```/) ||
                       message.match(/\{[\s\S]*"summary"[\s\S]*"issues"[\s\S]*\}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      }
      
      // If no JSON found, try to create a basic structure from the text
      return {
        summary: 'Claude response could not be parsed as JSON',
        issues: [{
          severity: 'low',
          type: 'security',
          description: 'Audit completed, but response format was not as expected',
          recommendation: 'Check the complete Claude response',
          file: '',
          line: ''
        }]
      };
    } catch (err) {
      this.error(`Failed to parse Claude audit response: ${err.message}`);
      return {
        summary: 'Failed to parse Claude audit response',
        issues: []
      };
    }
  }

  /**
   * Output the audit results to the console
   * @param {Object} audit Audit results
   */
  outputAuditResults(audit) {
    console.log('\n=== Claude Security Audit ===\n');
    console.log(audit.summary);
    
    if (audit.issues && audit.issues.length > 0) {
      console.log('\nIssues found:');
      
      const severityColors = {
        critical: '\x1b[41m\x1b[37m', // White on red background
        high: '\x1b[31m', // Red
        medium: '\x1b[33m', // Yellow
        low: '\x1b[34m' // Blue
      };
      
      const resetColor = '\x1b[0m';
      
      audit.issues.forEach(issue => {
        const severityColor = severityColors[issue.severity] || '\x1b[37m'; // Default to white
        const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';
        
        console.log(`\n${severityColor}${issue.severity.toUpperCase()} [${issue.type}]${resetColor}: ${location ? `[${location}] ` : ''}${issue.description}`);
        if (issue.recommendation) {
          console.log(`  Recommendation: ${issue.recommendation}`);
        }
      });
      
      // Summary of issues by severity and type
      const issuesBySeverity = {};
      const issuesByType = {};
      
      audit.issues.forEach(issue => {
        // Count by severity
        if (!issuesBySeverity[issue.severity]) {
          issuesBySeverity[issue.severity] = 0;
        }
        issuesBySeverity[issue.severity]++;
        
        // Count by type
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = 0;
        }
        issuesByType[issue.type]++;
      });
      
      console.log('\nIssue summary:');
      
      // By severity
      console.log('By severity:');
      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        const severityColor = severityColors[severity] || '\x1b[37m';
        console.log(`  ${severityColor}${severity}${resetColor}: ${count}`);
      });
      
      // By type
      console.log('By type:');
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log('\nNo security issues found!');
    }
    
    console.log('\n============================\n');
  }
}

export default PrePushHook;