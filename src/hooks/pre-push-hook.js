/**
 * Pre-Push Hook
 *
 * Implements a pre-push hook for Git that uses Claude to perform
 * security and quality audits before pushing code to a remote repository.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
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
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.auditTypes = config.auditTypes || ['security', 'credentials', 'sensitive-data', 'dependencies']; // What to audit for
    this.excludePatterns = config.excludePatterns || ['node_modules/**', 'dist/**', 'build/**', '**/*.lock']; // Files to exclude
    this.maxCommits = config.maxCommits || 10; // Maximum number of commits to audit
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to audit
    this.severityThreshold = config.severityThreshold || 'critical'; // Minimum severity to block on (critical, high, medium, low)
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
      // Check if hook should execute
      if (!await this.shouldExecute()) {
        this.debug('Skipping pre-push hook execution based on configuration');
        process.exit(0);
      }

      // Ensure prompt templates are available
      await this.createPromptTemplate();
      await this.loadPromptTemplates();

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

      // Check if too many commits
      if (commitsToPush.length > this.maxCommits) {
        this.warn(`Pushing ${commitsToPush.length} commits, which exceeds the maximum of ${this.maxCommits} for audit`);
        if (this.blockingMode === 'block') {
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
        this.warn(`Diff too large (${diff.length} bytes, max is ${this.maxDiffSize}), skipping audit`);
        if (this.blockingMode === 'block') {
          this.error('Blocking mode enabled, please push smaller changes or disable blocking mode');
          process.exit(1);
        } else {
          process.exit(0);
        }
      }

      // Get the list of changed files
      const changedFiles = await this.getChangedFiles(remoteSha, localSha);

      // Filter out excluded files
      const filteredFiles = this.filterFiles(changedFiles);

      if (filteredFiles.length === 0) {
        this.info('No files to audit after applying exclusion patterns, skipping audit');
        process.exit(0);
      }

      // Audit the changes with Claude
      this.info('Auditing code changes...');
      const auditResult = await this.auditChanges(diff, commitsToPush, filteredFiles);

      // Output the audit results
      this.outputAuditResults(auditResult);

      // Determine if there are issues that exceed the severity threshold
      const severityLevels = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const thresholdLevel = severityLevels[this.severityThreshold] || 4;

      const hasSeriousIssues = auditResult.issues.some(issue =>
        severityLevels[issue.severity] >= thresholdLevel &&
        this.auditTypes.includes(issue.type)
      );

      // Block push if necessary
      if (this.blockingMode === 'block' && hasSeriousIssues) {
        this.error(`Security issues at or above '${this.severityThreshold}' severity found, blocking push`);
        this.info('You can push anyway with git push --no-verify');
        process.exit(1);
      }
    } catch (err) {
      this.error(`Failed to execute pre-push hook: ${err.message}`);

      // Handle hook failure based on blocking mode
      if (this.blockingMode === 'block') {
        this.error('Blocking mode enabled, blocking push due to hook failure');
        process.exit(1);
      } else {
        this.warn('Allowing push to proceed despite hook failure');
        process.exit(0);
      }
    }
  }

  /**
   * Check if hook should execute
   * @returns {Promise<boolean>} Whether hook should execute
   */
  async shouldExecute() {
    // Skip if hook is disabled
    if (!this.enabled) {
      return false;
    }

    // Skip if environment variable is set to skip
    if (process.env.CLAUDE_SKIP_PRE_PUSH === 'true') {
      this.debug('Skipping pre-push hook due to CLAUDE_SKIP_PRE_PUSH environment variable');
      return false;
    }

    return true;
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

      if (!output || output.trim() === '') {
        return [];
      }

      // Parse the output into a list of commit objects
      return output.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split('|');
          if (parts.length >= 3) {
            const [hash, author, ...subjectParts] = parts;
            return {
              hash,
              author,
              subject: subjectParts.join('|') // Rejoin in case subject had pipe characters
            };
          }
          return { hash: parts[0] || '', author: parts[1] || '', subject: parts[2] || '' };
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
   * Get the list of changed files
   * @param {string} remoteSha The SHA of the remote branch
   * @param {string} localSha The SHA of the local branch
   * @returns {Promise<Array<string>>} List of changed files
   */
  async getChangedFiles(remoteSha, localSha) {
    try {
      const output = this.executeCommand(`git diff --name-only ${remoteSha}..${localSha}`);

      if (!output || output.trim() === '') {
        return [];
      }

      return output.split('\n').filter(file => file.trim() !== '');
    } catch (err) {
      this.error(`Failed to get changed files: ${err.message}`);
      return [];
    }
  }

  /**
   * Filter files based on exclude patterns
   * @param {Array<string>} files List of files
   * @returns {Array<string>} Filtered list of files
   */
  filterFiles(files) {
    if (!this.excludePatterns || this.excludePatterns.length === 0) {
      return files;
    }

    return files.filter(file => {
      // Check if file matches any exclude pattern
      for (const pattern of this.excludePatterns) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '.');

        const regex = new RegExp(`^${regexPattern}$`);

        if (regex.test(file)) {
          return false; // Exclude the file
        }
      }

      return true; // Include the file
    });
  }

  /**
   * Audit changes with Claude
   * @param {string} diff Git diff to audit
   * @param {Array<Object>} commits List of commits being pushed
   * @param {Array<string>} files List of files being changed
   * @returns {Promise<Object>} Audit results
   */
  async auditChanges(diff, commits, files) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.auditChangesFallback(diff, commits, files);
    }

    // Load prompt templates if not loaded yet
    if (Object.keys(this.promptTemplates).length === 0) {
      await this.loadPromptTemplates();
    }

    // Create variables for prompt template
    const variables = {
      diff: diff.length > 50000 ? diff.substring(0, 50000) + '\n... [diff truncated due to size] ...' : diff,
      commits: commits.map(commit => `${commit.hash} ${commit.author}: ${commit.subject}`).join('\n'),
      files: files.join('\n'),
      auditSecurity: this.auditTypes.includes('security') ? 'true' : 'false',
      auditCredentials: this.auditTypes.includes('credentials') ? 'true' : 'false',
      auditSensitiveData: this.auditTypes.includes('sensitive-data') ? 'true' : 'false',
      auditDependencies: this.auditTypes.includes('dependencies') ? 'true' : 'false'
    };

    // Get the appropriate prompt
    const prompt = this.formatPrompt('security-audit', variables);

    try {
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229', // Use Opus for security audits
        maxTokens: 2000,
        temperature: 0.2, // Lower temperature for more consistent responses
        cacheResponse: false // Don't cache security audits as contexts may be different
      });

      // Parse the response
      return this.parseAuditResponse(response);
    } catch (err) {
      this.error(`Failed to audit changes with Claude: ${err.message}`);
      return this.auditChangesFallback(diff, commits, files);
    }
  }

  /**
   * Fallback method to audit changes without Claude
   * @param {string} diff Git diff to audit
   * @param {Array<Object>} commits List of commits being pushed
   * @param {Array<string>} files List of files being changed
   * @returns {Object} Audit results
   */
  auditChangesFallback(diff, commits, files) {
    this.info('Using fallback security audit');

    const issues = [];
    const filesByExtension = {};

    // Group files by extension for basic analysis
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (!filesByExtension[ext]) {
        filesByExtension[ext] = [];
      }
      filesByExtension[ext].push(file);
    });

    // Simple pattern matching for basic checks
    if (this.auditTypes.includes('credentials')) {
      // Check for possible API keys and secrets in diff
      const apiKeyPatterns = [
        { pattern: /(['"])?(API|api|Api)(_|-)?([kK]ey|[tT]oken)(\1)?(\s*)(:|=)(\s*)(['"])[A-Za-z0-9+=\/]{16,}(\9)/g,
          description: 'Possible API key or token found in code' },
        { pattern: /(['"])?[a-zA-Z0-9_-]{20,}\.([a-zA-Z0-9_-]{20,}\.)?[a-zA-Z0-9_-]{20,}(\1)?/g,
          description: 'Possible JWT or authentication token' },
        { pattern: /(['"])?[A-Za-z0-9\/+]{40,}(\1)?/g,
          description: 'Possible base64 encoded secret' }
      ];

      for (const {pattern, description} of apiKeyPatterns) {
        const matches = [...diff.matchAll(pattern)];

        if (matches.length > 0) {
          issues.push({
            severity: 'high',
            type: 'credentials',
            description: description,
            recommendation: 'Remove credentials from code and use environment variables or a secure secret management system',
            file: '',
            line: ''
          });
          break; // Only add one issue per pattern type
        }
      }
    }

    // Check for sensitive data patterns
    if (this.auditTypes.includes('sensitive-data')) {
      const sensitivePatterns = [
        { pattern: /(['"])?(\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4})(\1)?/g,
          description: 'Possible credit card number found in code' },
        { pattern: /(['"])?[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\1)?/g,
          description: 'Email address found in code' },
        { pattern: /(['"])?(\d{3}[- ]?\d{2}[- ]?\d{4})(\1)?/g,
          description: 'Possible US Social Security Number found in code' }
      ];

      for (const {pattern, description} of sensitivePatterns) {
        const matches = [...diff.matchAll(pattern)];

        if (matches.length > 0) {
          issues.push({
            severity: 'medium',
            type: 'sensitive-data',
            description: description,
            recommendation: 'Remove sensitive data from code and use proper data handling techniques',
            file: '',
            line: ''
          });
          break; // Only add one issue per pattern type
        }
      }
    }

    // Check for common security vulnerabilities by file type
    if (this.auditTypes.includes('security')) {
      // Check JavaScript/TypeScript files
      if (filesByExtension['.js'] || filesByExtension['.ts'] || filesByExtension['.jsx'] || filesByExtension['.tsx']) {
        const jsVulnPatterns = [
          { pattern: /eval\s*\(/g,
            description: 'Use of eval() function which can lead to code injection vulnerabilities' },
          { pattern: /document\.write\s*\(/g,
            description: 'Use of document.write which can enable XSS attacks' },
          { pattern: /innerHTML\s*=/g,
            description: 'Direct manipulation of innerHTML which can enable XSS attacks' }
        ];

        for (const {pattern, description} of jsVulnPatterns) {
          if (pattern.test(diff)) {
            issues.push({
              severity: 'medium',
              type: 'security',
              description: description,
              recommendation: 'Use safer alternatives that don\'t execute strings as code',
              file: '',
              line: ''
            });
          }
        }
      }

      // Check SQL files or SQL queries in code
      if (filesByExtension['.sql'] || diff.includes('SELECT') || diff.includes('INSERT INTO')) {
        if (diff.includes('SELECT') && !diff.includes('?') && !diff.includes('$1') &&
            (diff.includes('WHERE') && diff.includes('='))) {
          issues.push({
            severity: 'high',
            type: 'security',
            description: 'Potential SQL injection vulnerability in query - use parameterized queries',
            recommendation: 'Use prepared statements or query parameterization',
            file: '',
            line: ''
          });
        }
      }
    }

    // Check for dependency vulnerabilities
    if (this.auditTypes.includes('dependencies')) {
      const packageJsonFiles = files.filter(file => file.endsWith('package.json'));
      if (packageJsonFiles.length > 0) {
        issues.push({
          severity: 'low',
          type: 'dependencies',
          description: 'Package dependencies updated - consider running security audit',
          recommendation: 'Run npm audit or yarn audit to check for vulnerabilities',
          file: packageJsonFiles[0],
          line: ''
        });
      }
    }

    return {
      summary: `Basic security scan performed on ${files.length} files across ${Object.keys(filesByExtension).length} file types. ${issues.length} potential issues found.`,
      issues
    };
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
                       message.match(/```([\s\S]*?)```/);

      if (jsonMatch && jsonMatch[1]) {
        const jsonStr = jsonMatch[1].trim();
        return JSON.parse(jsonStr);
      } else if (message.includes('{') && message.includes('}')) {
        // Try to find just the JSON object in the response
        const startIdx = message.indexOf('{');
        const endIdx = message.lastIndexOf('}') + 1;
        if (startIdx >= 0 && endIdx > startIdx) {
          const jsonStr = message.substring(startIdx, endIdx);
          return JSON.parse(jsonStr);
        }
      }

      // If no JSON found, try to create a basic structure from the text
      // Extract summary
      let summary = 'Claude response could not be parsed as JSON';
      const summaryMatch = message.match(/summary:?\s*([^\n]+)/i);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }

      // Try to extract issues from the message
      const issues = [];
      const issueMatches = message.matchAll(/(?:critical|high|medium|low)(?:\s+)(?:issue|severity)(?:[^\n]+)/gi);

      for (const match of issueMatches) {
        const issueLine = match[0].trim();
        const severityMatch = issueLine.match(/(?:critical|high|medium|low)/i);
        const severity = severityMatch ? severityMatch[0].toLowerCase() : 'low';

        issues.push({
          severity,
          type: 'security', // Default type
          description: issueLine,
          recommendation: 'See Claude\'s full response for details',
          file: '',
          line: ''
        });
      }

      return {
        summary,
        issues: issues.length > 0 ? issues : [{
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
        critical: chalk.bgRed.white, // White on red background
        high: chalk.red, // Red
        medium: chalk.yellow, // Yellow
        low: chalk.blue // Blue
      };

      audit.issues.forEach(issue => {
        const severityColor = severityColors[issue.severity] || chalk.white; // Default to white
        const location = issue.file ? `${issue.file}${issue.line ? `:${issue.line}` : ''}` : '';

        console.log(`\n${severityColor(`${issue.severity.toUpperCase()} [${issue.type}]`)}: ${location ? `[${location}] ` : ''}${issue.description}`);
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
        const severityColor = severityColors[severity] || chalk.white;
        console.log(`  ${severityColor(severity)}: ${count}`);
      });

      // By type
      console.log('By type:');
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    } else {
      console.log(chalk.green('\nNo security issues found!'));
    }

    console.log('\n============================\n');
  }

  /**
   * Get a fallback prompt template for security audit
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'security-audit') {
      return `You are a cybersecurity expert reviewing code changes before they are pushed to a remote repository. Please perform a security audit of the following Git diff and commits.

Focus on identifying the following issues:
${variables.auditSecurity === 'true' ? '- Security vulnerabilities (e.g., SQL injection, XSS, CSRF)' : ''}
${variables.auditCredentials === 'true' ? '- Credentials or API keys committed to the repository' : ''}
${variables.auditSensitiveData === 'true' ? '- Sensitive information disclosure (e.g., PII, secrets)' : ''}
${variables.auditDependencies === 'true' ? '- Vulnerable dependencies or packages' : ''}

# Files changed:
${variables.files}

# Commits being pushed:
${variables.commits}

# Git Diff:
\`\`\`diff
${variables.diff}
\`\`\`

Please analyze the code changes and provide:
1. A brief summary of the security implications of these changes
2. Any security issues found, categorized by severity (critical, high, medium, low) and type (security, credentials, sensitive-data, dependencies)
3. Recommendations for addressing any issues found

Format your response as JSON with the following structure:
\`\`\`json
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
}
\`\`\`

Return ONLY valid JSON with no additional explanation.`;
    }

    // Default fallback for unknown templates
    return super.getFallbackPrompt(templateName, variables);
  }

  /**
   * Create a prompt template file for this hook
   * @returns {Promise<void>}
   */
  async createPromptTemplate() {
    try {
      const templateDir = path.join(this.projectRoot, '.claude', 'templates');
      await fs.ensureDir(templateDir);

      const templatePath = path.join(templateDir, `${this.gitHookName}.json`);

      // Check if template already exists
      if (await fs.pathExists(templatePath)) {
        this.debug(`Prompt template file already exists at ${templatePath}`);
        return;
      }

      // Create default template
      const templates = {
        'security-audit': `You are a cybersecurity expert reviewing code changes before they are pushed to a remote repository. Please perform a security audit of the following Git diff and commits.

Focus on identifying the following issues:
{{#if auditSecurity == 'true'}}
- Security vulnerabilities (e.g., SQL injection, XSS, CSRF)
{{/if}}
{{#if auditCredentials == 'true'}}
- Credentials or API keys committed to the repository
{{/if}}
{{#if auditSensitiveData == 'true'}}
- Sensitive information disclosure (e.g., PII, secrets)
{{/if}}
{{#if auditDependencies == 'true'}}
- Vulnerable dependencies or packages
{{/if}}

# Files changed:
{{files}}

# Commits being pushed:
{{commits}}

# Git Diff:
\`\`\`diff
{{diff}}
\`\`\`

Please analyze the code changes and provide:
1. A brief summary of the security implications of these changes
2. Any security issues found, categorized by severity (critical, high, medium, low) and type (security, credentials, sensitive-data, dependencies)
3. Recommendations for addressing any issues found

Format your response as JSON with the following structure:
\`\`\`json
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
}
\`\`\`

Return ONLY valid JSON with no additional explanation.`
      };

      // Write template file
      await fs.writeJson(templatePath, templates, { spaces: 2 });
      this.debug(`Created prompt template file at ${templatePath}`);
    } catch (err) {
      this.debug(`Failed to create prompt template file: ${err.message}`);
    }
  }
}

export default PrePushHook;