/**
 * Branch Strategy Hook
 * 
 * Implements branch naming and workflow strategy enforcement using
 * custom rules and Claude-based validation.
 */

import fs from 'fs-extra';
import path from 'path';
import _chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class BranchStrategyHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Branch Strategy Enforcer',
      description: 'Enforces branch naming conventions and workflow rules',
      gitHookName: 'pre-push' // This hook gets installed as a pre-push hook
    });
    
    // Branch strategy configuration
    this.strategyType = config.strategyType || 'gitflow'; // 'gitflow', 'trunk', 'github-flow', or 'custom'
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.branchPrefixes = config.branchPrefixes || {
      feature: 'feature/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/',
      release: 'release/',
      support: 'support/'
    };
    this.mainBranches = config.mainBranches || ['main', 'master', 'develop'];
    this.protectedBranches = config.protectedBranches || ['main', 'master', 'develop', 'release/*'];
    this.releasePattern = config.releasePattern || '^release\\/v?(\\d+\\.\\d+\\.\\d+)$';
    this.validateWithClaude = config.validateWithClaude !== false;
    this.jiraIntegration = config.jiraIntegration || false;
    this.jiraPattern = config.jiraPattern || '[A-Z]+-\\d+';
    this.customRules = config.customRules || [];
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

# Extract local and remote information
local_branch=\`git symbolic-ref HEAD | sed -e 's,.*/\\(.*\\),\\1,'\`
remote="\${1}"
remote_url="\${2}"

# Run the hook script
"${nodePath}" "${scriptPath}" branch-strategy "$local_branch" "$remote" "$remote_url"

# Check the exit code from the hook script
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "Branch strategy validation failed with exit code $exit_code"
  exit $exit_code
fi

exit 0
`;
  }

  /**
   * Execute the branch strategy hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing branch strategy hook...');
    
    try {
      // Extract arguments
      const localBranch = args[0]; // Current branch
      const remote = args[1]; // Remote name
      const remoteUrl = args[2]; // Remote URL
      
      this.debug(`Local branch: ${localBranch}, Remote: ${remote}, URL: ${remoteUrl}`);
      
      if (!localBranch) {
        this.warn('Could not determine current branch, skipping validation');
        return;
      }
      
      // Load branch configuration if exists
      const branchConfig = await this.loadBranchConfig();
      
      // Merge loaded config with current config
      if (branchConfig) {
        // Only override if values exist in branch config
        this.strategyType = branchConfig.strategyType || this.strategyType;
        this.branchPrefixes = branchConfig.branchPrefixes || this.branchPrefixes;
        this.mainBranches = branchConfig.mainBranches || this.mainBranches;
        this.protectedBranches = branchConfig.protectedBranches || this.protectedBranches;
        this.releasePattern = branchConfig.releasePattern || this.releasePattern;
        this.customRules = branchConfig.customRules || this.customRules;
      }
      
      // Check if we're on a protected branch
      if (await this.isProtectedBranch(localBranch)) {
        const protectionViolations = await this.checkProtectedBranchRules(localBranch);
        
        if (protectionViolations.length > 0) {
          this.warn(`Protected branch violations found for ${localBranch}:`);
          protectionViolations.forEach(violation => {
            this.warn(`- ${violation}`);
          });
          
          if (this.blockingMode === 'block') {
            this.error('Push blocked due to protected branch violations');
            process.exit(1);
          }
        } else {
          this.success(`Branch ${localBranch} follows protected branch rules`);
        }
      }
      
      // Validate branch naming according to strategy
      const namingViolations = await this.validateBranchNaming(localBranch);
      
      if (namingViolations.length > 0) {
        this.warn(`Branch naming violations found for ${localBranch}:`);
        namingViolations.forEach(violation => {
          this.warn(`- ${violation}`);
        });
        
        if (this.blockingMode === 'block') {
          this.error('Push blocked due to branch naming violations');
          process.exit(1);
        }
      } else {
        this.success(`Branch ${localBranch} follows naming conventions`);
      }
      
      // Check workflow rules
      const workflowViolations = await this.checkWorkflowRules(localBranch, remote);
      
      if (workflowViolations.length > 0) {
        this.warn(`Workflow violations found for ${localBranch}:`);
        workflowViolations.forEach(violation => {
          this.warn(`- ${violation}`);
        });
        
        if (this.blockingMode === 'block') {
          this.error('Push blocked due to workflow violations');
          process.exit(1);
        }
      } else {
        this.success(`Branch ${localBranch} follows workflow rules`);
      }
      
      // Apply custom rules if any
      const customViolations = await this.applyCustomRules(localBranch, remote);
      
      if (customViolations.length > 0) {
        this.warn(`Custom rule violations found for ${localBranch}:`);
        customViolations.forEach(violation => {
          this.warn(`- ${violation}`);
        });
        
        if (this.blockingMode === 'block') {
          this.error('Push blocked due to custom rule violations');
          process.exit(1);
        }
      } else if (this.customRules.length > 0) {
        this.success(`Branch ${localBranch} follows all custom rules`);
      }
      
      // Validate branch purpose with Claude if enabled
      if (this.validateWithClaude) {
        const claudeValidation = await this.validateWithClaudeAI(localBranch);
        
        if (!claudeValidation.valid) {
          this.warn(`Claude validation issues for ${localBranch}:`);
          claudeValidation.issues.forEach(issue => {
            this.warn(`- ${issue}`);
          });
          
          if (claudeValidation.suggestion) {
            this.info(`Suggestion: ${claudeValidation.suggestion}`);
          }
          
          if (this.blockingMode === 'block' && claudeValidation.severity === 'high') {
            this.error('Push blocked due to branch validation issues');
            process.exit(1);
          }
        } else {
          this.success(`Claude AI validated branch ${localBranch}`);
          if (claudeValidation.message) {
            this.info(claudeValidation.message);
          }
        }
      }
      
    } catch (err) {
      this.error(`Failed to execute branch strategy hook: ${err.message}`);
      
      // Only exit with error if in blocking mode
      if (this.blockingMode === 'block') {
        process.exit(1);
      }
    }
  }

  /**
   * Load branch configuration from file
   * @returns {Promise<Object|null>} Branch strategy configuration
   */
  async loadBranchConfig() {
    try {
      const configPath = path.join(this.projectRoot, '.claude', 'branch-strategy.json');
      
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        this.debug('Loaded branch strategy configuration from file');
        return config;
      }
    } catch (err) {
      this.error(`Failed to load branch strategy configuration: ${err.message}`);
    }
    
    return null;
  }

  /**
   * Save branch configuration to file
   * @returns {Promise<boolean>} Whether the configuration was saved successfully
   */
  async saveBranchConfig() {
    try {
      // Create config object
      const config = {
        strategyType: this.strategyType,
        branchPrefixes: this.branchPrefixes,
        mainBranches: this.mainBranches,
        protectedBranches: this.protectedBranches,
        releasePattern: this.releasePattern,
        customRules: this.customRules
      };
      
      // Create config directory if it doesn't exist
      const configDir = path.join(this.projectRoot, '.claude');
      await fs.ensureDir(configDir);
      
      // Write config file
      const configPath = path.join(configDir, 'branch-strategy.json');
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      this.debug('Saved branch strategy configuration to file');
      return true;
    } catch (err) {
      this.error(`Failed to save branch strategy configuration: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if a branch is protected
   * @param {string} branch Branch name
   * @returns {Promise<boolean>} Whether the branch is protected
   */
  async isProtectedBranch(branch) {
    return this.protectedBranches.some(pattern => {
      // Check for exact match
      if (pattern === branch) {
        return true;
      }
      
      // Check for wildcard match
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(branch);
      }
      
      return false;
    });
  }

  /**
   * Check protected branch rules
   * @param {string} branch Branch name
   * @returns {Promise<Array<string>>} List of rule violations
   */
  async checkProtectedBranchRules(branch) {
    const violations = [];
    
    // Add your protected branch validation logic here
    // Example: Only allow specific users to push to protected branches
    const currentUser = await this.getCurrentUser();
    const allowedUsers = await this.getAllowedUsers(branch);
    
    if (allowedUsers.length > 0 && !allowedUsers.includes(currentUser)) {
      violations.push(`User ${currentUser} is not allowed to push to protected branch ${branch}`);
    }
    
    // Example: Require code review for protected branches
    const hasReview = await this.hasCodeReview(branch);
    if (!hasReview) {
      violations.push(`Protected branch ${branch} requires a code review before pushing`);
    }
    
    // Example: Ensure tests are passing
    const testsPassing = await this.areTestsPassing();
    if (!testsPassing) {
      violations.push(`All tests must pass before pushing to protected branch ${branch}`);
    }
    
    return violations;
  }

  /**
   * Validate branch naming according to the chosen strategy
   * @param {string} branch Branch name
   * @returns {Promise<Array<string>>} List of naming violations
   */
  async validateBranchNaming(branch) {
    const violations = [];
    
    // Skip validation for main branches
    if (this.mainBranches.includes(branch)) {
      return [];
    }
    
    // GitFlow strategy
    if (this.strategyType === 'gitflow') {
      // Check if branch has a valid prefix
      const validPrefix = Object.values(this.branchPrefixes).some(prefix => 
        branch.startsWith(prefix)
      );
      
      if (!validPrefix) {
        const validPrefixes = Object.values(this.branchPrefixes).join(', ');
        violations.push(`Branch name must start with one of these prefixes: ${validPrefixes}`);
      }
      
      // Check release branch pattern
      if (branch.startsWith(this.branchPrefixes.release)) {
        const releaseRegex = new RegExp(this.releasePattern);
        if (!releaseRegex.test(branch)) {
          violations.push(`Release branch must match pattern: ${this.releasePattern}`);
        }
      }
      
      // Enforce Jira ticket ID in branch name if enabled
      if (this.jiraIntegration) {
        const jiraRegex = new RegExp(this.jiraPattern);
        if (!jiraRegex.test(branch)) {
          violations.push(`Branch name must include a Jira ticket ID (e.g., ${this.jiraPattern})`);
        }
      }
    }
    // Trunk-based development
    else if (this.strategyType === 'trunk') {
      // Trunk-based development typically uses short-lived feature branches
      if (!branch.startsWith('feature/') && !branch.startsWith('fix/') && !branch.startsWith('chore/')) {
        violations.push('Branch name should start with feature/, fix/, or chore/');
      }
      
      // Check if branch name includes the developer's username
      const username = await this.getCurrentUser();
      if (!branch.includes(username)) {
        violations.push(`Branch name should include your username: ${username}`);
      }
    }
    // GitHub Flow
    else if (this.strategyType === 'github-flow') {
      // GitHub Flow typically uses descriptive branch names
      if (branch.split('/').length < 2) {
        violations.push('Branch name should be descriptive and include a category (e.g., feature/add-login)');
      }
    }
    // Custom strategy - apply custom naming rules
    else if (this.strategyType === 'custom') {
      // Process custom branch naming rules from this.customRules
      const namingRules = this.customRules.filter(rule => rule.type === 'naming');
      
      for (const rule of namingRules) {
        if (rule.pattern && !new RegExp(rule.pattern).test(branch)) {
          violations.push(rule.message || `Branch name does not match pattern: ${rule.pattern}`);
        }
      }
    }
    
    return violations;
  }

  /**
   * Check workflow rules according to the chosen strategy
   * @param {string} branch Branch name
   * @param {string} remote Remote name
   * @returns {Promise<Array<string>>} List of workflow violations
   */
  async checkWorkflowRules(branch, remote) {
    const violations = [];
    
    // GitFlow strategy
    if (this.strategyType === 'gitflow') {
      // Feature branches should merge into develop, not main
      if (branch.startsWith(this.branchPrefixes.feature)) {
        const targetBranch = await this.getPushTargetBranch(branch, remote);
        if (targetBranch === 'main' || targetBranch === 'master') {
          violations.push(`Feature branches should merge into develop, not ${targetBranch}`);
        }
      }
      
      // Release branches can only merge into main/master and develop
      if (branch.startsWith(this.branchPrefixes.release)) {
        const targetBranch = await this.getPushTargetBranch(branch, remote);
        if (targetBranch !== 'main' && targetBranch !== 'master' && targetBranch !== 'develop') {
          violations.push('Release branches should only merge into main/master or develop');
        }
      }
      
      // Hotfix branches can merge into main/master and develop
      if (branch.startsWith(this.branchPrefixes.hotfix)) {
        const targetBranch = await this.getPushTargetBranch(branch, remote);
        if (targetBranch !== 'main' && targetBranch !== 'master' && targetBranch !== 'develop') {
          violations.push('Hotfix branches should only merge into main/master or develop');
        }
      }
    }
    // Trunk-based development
    else if (this.strategyType === 'trunk') {
      // All branches should be short-lived and merge into the trunk (main/master)
      const branchAge = await this.getBranchAge(branch);
      if (branchAge > 7) { // More than 7 days
        violations.push(`Branch is ${branchAge} days old. Trunk-based development prefers short-lived branches (< 7 days)`);
      }
    }
    // GitHub Flow
    else if (this.strategyType === 'github-flow') {
      // All branches should merge into main/master
      const targetBranch = await this.getPushTargetBranch(branch, remote);
      if (targetBranch !== 'main' && targetBranch !== 'master') {
        violations.push(`GitHub Flow branches should merge into main/master, not ${targetBranch}`);
      }
    }
    // Custom strategy - apply custom workflow rules
    else if (this.strategyType === 'custom') {
      // Process custom workflow rules from this.customRules
      const workflowRules = this.customRules.filter(rule => rule.type === 'workflow');
      
      for (const rule of workflowRules) {
        // Apply rule based on branch pattern
        if (rule.branchPattern && new RegExp(rule.branchPattern).test(branch)) {
          // Target branch rule
          if (rule.targetBranch) {
            const targetBranch = await this.getPushTargetBranch(branch, remote);
            const targetMatches = Array.isArray(rule.targetBranch)
              ? rule.targetBranch.includes(targetBranch)
              : rule.targetBranch === targetBranch;
            
            if (!targetMatches) {
              const validTargets = Array.isArray(rule.targetBranch)
                ? rule.targetBranch.join(', ')
                : rule.targetBranch;
              
              violations.push(rule.message || `Branch ${branch} should only merge into: ${validTargets}`);
            }
          }
          
          // Age limit rule
          if (rule.maxAge) {
            const branchAge = await this.getBranchAge(branch);
            if (branchAge > rule.maxAge) {
              violations.push(rule.message || `Branch ${branch} is too old (${branchAge} days). Maximum allowed age is ${rule.maxAge} days`);
            }
          }
        }
      }
    }
    
    return violations;
  }

  /**
   * Apply custom rules to branch
   * @param {string} branch Branch name
   * @param {string} remote Remote name
   * @returns {Promise<Array<string>>} List of custom rule violations
   */
  async applyCustomRules(branch, _remote) {
    const violations = [];
    
    // Ignore custom rules for standard strategies
    if (this.strategyType !== 'custom' || !this.customRules || this.customRules.length === 0) {
      return [];
    }
    
    // Apply custom rules that aren't naming or workflow specific
    const customRules = this.customRules.filter(rule => 
      rule.type !== 'naming' && rule.type !== 'workflow'
    );
    
    for (const rule of customRules) {
      // Skip rules that don't apply to this branch
      if (rule.branchPattern && !new RegExp(rule.branchPattern).test(branch)) {
        continue;
      }
      
      // Apply rule based on type
      if (rule.type === 'command') {
        // Run command and check result
        try {
          const result = this.executeCommand(rule.command);
          const success = rule.expectedOutput
            ? result.includes(rule.expectedOutput)
            : result.trim() !== '';
          
          if (!success) {
            violations.push(rule.message || `Command check failed: ${rule.command}`);
          }
        } catch (err) {
          violations.push(rule.message || `Command failed: ${rule.command} - ${err.message}`);
        }
      }
      else if (rule.type === 'fileCheck') {
        // Check if file exists or has specific content
        try {
          const filePath = path.join(this.projectRoot, rule.file);
          const fileExists = await fs.pathExists(filePath);
          
          if (!fileExists) {
            violations.push(rule.message || `Required file not found: ${rule.file}`);
            continue;
          }
          
          if (rule.content) {
            const content = await fs.readFile(filePath, 'utf8');
            if (!content.includes(rule.content)) {
              violations.push(rule.message || `File ${rule.file} does not contain required content`);
            }
          }
        } catch (err) {
          violations.push(rule.message || `File check failed: ${rule.file} - ${err.message}`);
        }
      }
    }
    
    return violations;
  }

  /**
   * Validate branch purpose with Claude AI
   * @param {string} branch Branch name
   * @returns {Promise<Object>} Validation result
   */
  async validateWithClaudeAI(branch) {
    // Load environment variables to get API key
    const env = this.loadEnv();
    this.setClaudeApiKey(env.ANTHROPIC_API_KEY || '');
    
    if (!this.claudeApiKey) {
      return {
        valid: true,
        message: 'Claude AI validation skipped - no API key found',
        issues: [],
        suggestion: null,
        severity: 'low'
      };
    }
    
    try {
      // Get recent commits for context
      const commits = await this.getRecentCommits(branch, 5);
      const commitMessages = commits.map(commit => `${commit.hash.substring(0, 7)}: ${commit.subject}`).join('\n');
      
      // Get target branch if available
      const targetBranch = await this.getPushTargetBranch(branch, 'origin');
      
      // Create prompt for Claude
      const prompt = this.createBranchValidationPrompt(
        branch,
        targetBranch,
        this.strategyType,
        commitMessages
      );
      
      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-haiku-20240307',
        maxTokens: 1000
      });
      
      // Extract the validation results from the response
      const message = response.content[0]?.text || '';
      
      // Parse the validation result
      return this.parseBranchValidation(message);
    } catch (err) {
      this.error(`Failed to validate branch with Claude: ${err.message}`);
      
      // Return a safe default response
      return {
        valid: true,
        message: `Claude validation failed: ${err.message}`,
        issues: [],
        suggestion: null,
        severity: 'low'
      };
    }
  }

  /**
   * Create a prompt for Claude to validate branch purpose
   * @param {string} branch Branch name
   * @param {string} targetBranch Target branch
   * @param {string} strategyType Branch strategy type
   * @param {string} commitMessages Recent commit messages
   * @returns {string} Prompt for Claude
   */
  createBranchValidationPrompt(branch, targetBranch, strategyType, commitMessages) {
    return `You are a Git branching strategy expert. Please analyze the following branch information and validate its adherence to best practices for the specified branching strategy.

# Branch Information
- Branch name: ${branch}
- Target branch: ${targetBranch || 'Unknown'}
- Strategy type: ${strategyType}

# Recent Commits
${commitMessages || 'No recent commits found'}

Based on this information, evaluate:
1. Whether the branch name follows conventions for the ${strategyType} strategy
2. Whether the branch purpose is clear from its name and commits
3. Whether there are any potential issues with this branch

Format your response as a structured JSON object with the following schema:
\`\`\`json
{
  "valid": true,
  "message": "Brief overall assessment of the branch",
  "issues": [
    "Issue 1 description",
    "Issue 2 description"
  ],
  "suggestion": "Suggestion for improvement if any",
  "severity": "low"
}
\`\`\`

The valid field should be true if the branch generally follows conventions and has no major issues, false otherwise.
The severity field should be one of "low", "medium", or "high" depending on how serious the issues are.
If there are no issues, return an empty array for issues and null for suggestion.`;
  }

  /**
   * Parse Claude's branch validation response
   * @param {string} validationText Validation text from Claude
   * @returns {Object} Parsed validation result
   */
  parseBranchValidation(validationText) {
    try {
      // Extract JSON from the response
      const jsonMatch = validationText.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // If no JSON block is found, look for any JSON-like structure
      const jsonRegex = /\{\s*"valid"\s*:\s*(true|false).*?\}/s;
      const jsonMatch2 = validationText.match(jsonRegex);
      
      if (jsonMatch2) {
        return JSON.parse(jsonMatch2[0]);
      }
      
      // If we can't parse JSON, extract as much information as possible
      const valid = !validationText.toLowerCase().includes('invalid') && 
                   !validationText.toLowerCase().includes('issue');
      
      const issues = [];
      const issueMatches = validationText.matchAll(/issue:?\s*([^\n]+)/gi);
      
      for (const match of issueMatches) {
        issues.push(match[1].trim());
      }
      
      const suggestionMatch = validationText.match(/suggestion:?\s*([^\n]+)/i);
      const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;
      
      return {
        valid,
        message: 'Validation response could not be parsed as JSON',
        issues,
        suggestion,
        severity: issues.length > 0 ? 'medium' : 'low'
      };
    } catch (err) {
      this.error(`Failed to parse branch validation: ${err.message}`);
      return {
        valid: true,
        message: 'Validation response parsing failed',
        issues: [],
        suggestion: null,
        severity: 'low'
      };
    }
  }

  /**
   * Get the current Git user name
   * @returns {Promise<string>} Git user name
   */
  async getCurrentUser() {
    try {
      return this.executeCommand('git config user.name').trim();
    } catch (err) {
      this.error(`Failed to get current user: ${err.message}`);
      return 'unknown';
    }
  }

  /**
   * Get allowed users for a protected branch
   * @param {string} branch Branch name
   * @returns {Promise<Array<string>>} List of allowed users
   */
  async getAllowedUsers(_branch) {
    // This would normally come from a configuration file or API
    // For now, return an empty array to allow all users
    return [];
  }

  /**
   * Check if branch has a code review
   * @param {string} branch Branch name
   * @returns {Promise<boolean>} Whether branch has a code review
   */
  async hasCodeReview(_branch) {
    // This would be implemented by checking PRs or a code review system
    // For now, return true to skip this check
    return true;
  }

  /**
   * Check if tests are passing
   * @returns {Promise<boolean>} Whether tests are passing
   */
  async areTestsPassing() {
    // This would run the test suite or check CI results
    // For now, return true to skip this check
    return true;
  }

  /**
   * Get the target branch for a push
   * @param {string} branch Branch name
   * @param {string} remote Remote name
   * @returns {Promise<string|null>} Target branch name
   */
  async getPushTargetBranch(branch, _remote) {
    try {
      // Get the configured push target
      const pushCmd = `git config --get branch.${branch}.merge`;
      const result = this.executeCommand(pushCmd).trim();
      
      if (result) {
        // Extract target branch name from refs/heads/branch-name
        return result.replace('refs/heads/', '');
      }
      
      // If no explicit push target, assume it's a main branch (if feature branch)
      if (branch.startsWith(this.branchPrefixes.feature)) {
        return 'develop';
      }
      
      // Default to main
      return this.mainBranches[0];
    } catch (err) {
      this.debug(`Failed to get push target branch: ${err.message}`);
      return null;
    }
  }

  /**
   * Get the age of a branch in days
   * @param {string} branch Branch name
   * @returns {Promise<number>} Branch age in days
   */
  async getBranchAge(branch) {
    try {
      // Get the timestamp of the first commit in the branch
      const cmd = `git log --format=%at $(git merge-base ${branch} ${this.mainBranches[0]})..${branch} | tail -1`;
      const result = this.executeCommand(cmd).trim();
      
      if (result) {
        const timestamp = parseInt(result);
        const now = Math.floor(Date.now() / 1000);
        const ageInSeconds = now - timestamp;
        return Math.floor(ageInSeconds / 86400); // Convert to days
      }
      
      return 0;
    } catch (err) {
      this.debug(`Failed to get branch age: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get recent commits in a branch
   * @param {string} branch Branch name
   * @param {number} count Number of commits to retrieve
   * @returns {Promise<Array<Object>>} List of recent commits
   */
  async getRecentCommits(branch, count = 5) {
    try {
      const cmd = `git log -${count} --format="%H|%an|%s" ${branch}`;
      const result = this.executeCommand(cmd).trim();
      
      if (!result) {
        return [];
      }
      
      return result.split('\n').map(line => {
        const [hash, author, subject] = line.split('|');
        return { hash, author, subject };
      });
    } catch (err) {
      this.debug(`Failed to get recent commits: ${err.message}`);
      return [];
    }
  }
}

export default BranchStrategyHook;