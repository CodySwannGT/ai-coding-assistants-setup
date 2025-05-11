/**
 * Pre-Rebase Hook
 *
 * Implements a pre-rebase hook for Git that uses Claude to analyze
 * the potential impact of a rebase and warn about conflicts or issues.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class PreRebaseHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'Claude Rebase Analyzer',
      description: 'Uses Claude to analyze rebase operations and detect potential issues',
      gitHookName: 'pre-rebase'
    });

    // Additional configuration specific to pre-rebase
    this.blockingMode = config.blockingMode || 'warn'; // 'block', 'warn', or 'none'
    this.maxDiffSize = config.maxDiffSize || 100000; // Maximum diff size to analyze
    this.checkConflicts = config.checkConflicts !== undefined ? config.checkConflicts !== false : true; // Whether to check for potential merge conflicts
    this.checkTestImpact = config.checkTestImpact !== undefined ? config.checkTestImpact : false; // Whether to check for impact on tests
    this.checkDependencies = config.checkDependencies !== undefined ? config.checkDependencies : true; // Whether to check for dependency changes
    this.blockOnSeverity = config.blockOnSeverity || 'high'; // 'critical', 'high', 'medium', 'low', 'none'
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

# Run the hook script, passing all arguments received by the hook
"${nodePath}" "${scriptPath}" pre-rebase "$@"

# Check the exit code from the hook script
exit_code=$?
if [ $exit_code -ne 0 ]; then
  echo "Pre-rebase hook failed with exit code $exit_code"
  exit $exit_code
fi

exit 0
`;
  }

  /**
   * Determine if the hook should execute
   * @returns {Promise<boolean>} Whether the hook should execute
   */
  async shouldExecute() {
    // Skip if hook is disabled
    if (!this.enabled) {
      return false;
    }

    // Skip if environment variable is set
    if (process.env.CLAUDE_SKIP_PRE_REBASE === 'true') {
      this.debug('Skipping pre-rebase hook due to CLAUDE_SKIP_PRE_REBASE environment variable');
      return false;
    }

    return true;
  }

  /**
   * Execute the pre-rebase hook logic
   * @param {Array<string>} args Command-line arguments
   * @returns {Promise<void>}
   */
  async execute(args) {
    this.info('Executing pre-rebase hook...');

    // Check if hook should execute
    if (!await this.shouldExecute()) {
      this.debug('Hook execution skipped');
      return;
    }

    try {
      // Load prompt templates
      await this.loadPromptTemplates();

      // Extract arguments
      const upstreamBranch = args[0]; // The upstream branch being rebased onto
      const rebaseBranch = args[1] || 'HEAD'; // The branch being rebased (or HEAD if not specified)

      this.info(`Analyzing rebase of ${rebaseBranch} onto ${upstreamBranch}`);

      // Get the common ancestor
      const ancestorSha = await this.getCommonAncestor(upstreamBranch, rebaseBranch);

      if (!ancestorSha) {
        this.warn('Could not determine common ancestor, skipping analysis');
        return;
      }

      // Get the list of commits that will be rebased
      const commitsToRebase = await this.getCommitsToRebase(ancestorSha, rebaseBranch);

      if (commitsToRebase.length === 0) {
        this.info('No commits to rebase, skipping analysis');
        return;
      }

      this.info(`Found ${commitsToRebase.length} commits to rebase`);

      // Get the list of files that will be affected by the rebase
      const affectedFiles = await this.getAffectedFiles(ancestorSha, rebaseBranch, upstreamBranch);

      if (affectedFiles.common.length === 0) {
        this.info('No overlapping files between branches, low risk of conflicts');
        return;
      }

      this.info(`Found ${affectedFiles.common.length} files that may have conflicts`);

      // Check for potential conflicts
      if (this.checkConflicts) {
        // Get the diff between the branches
        const diff = await this.getDiff(ancestorSha, upstreamBranch, rebaseBranch);

        if (diff.length > this.maxDiffSize) {
          this.warn(`Diff too large (${diff.length} bytes), skipping detailed analysis`);

          // Just do a basic check without Claude
          const hasConflicts = await this.hasBasicConflicts(upstreamBranch, rebaseBranch);

          if (hasConflicts) {
            this.warn('Potential conflicts detected from basic analysis');

            if (this.blockingMode === 'block') {
              this.error('Rebase blocked due to potential conflicts');
              process.exit(1);
            }
          }

          return;
        }

        // Analyze the rebase with Claude
        const analysis = await this.analyzeRebase(
          diff,
          commitsToRebase,
          affectedFiles,
          upstreamBranch,
          rebaseBranch
        );

        // Check if there are any issues that should block the rebase
        if (analysis.issues && analysis.issues.length > 0) {
          // Log the issues
          this.warn('Potential issues detected in rebase:');
          analysis.issues.forEach(issue => {
            const severityLabel = {
              critical: chalk.red('CRITICAL'),
              high: chalk.yellow('HIGH'),
              medium: chalk.blue('MEDIUM'),
              low: chalk.green('LOW')
            }[issue.severity] || issue.severity.toUpperCase();

            this.warn(`${severityLabel}: ${issue.description}`);
          });

          // Check if we should block the rebase
          if (this.shouldBlockRebase(analysis.issues)) {
            this.error('Rebase blocked due to detected issues');
            process.exit(1);
          }
        } else {
          this.success('No significant issues detected in rebase');
        }

        // Display the summary
        if (analysis.summary) {
          console.log('\nRebase Analysis Summary:');
          console.log(analysis.summary);
        }
      }
    } catch (err) {
      this.error(`Failed to execute pre-rebase hook: ${err.message}`);

      // Only exit with an error if we're in blocking mode
      if (this.blockingMode === 'block') {
        process.exit(1);
      }
    }
  }

  /**
   * Get the common ancestor between two branches
   * @param {string} branch1 First branch
   * @param {string} branch2 Second branch
   * @returns {Promise<string>} SHA of the common ancestor
   */
  async getCommonAncestor(branch1, branch2) {
    try {
      return this.executeCommand(`git merge-base ${branch1} ${branch2}`).trim();
    } catch (err) {
      this.error(`Failed to get common ancestor: ${err.message}`);
      return '';
    }
  }

  /**
   * Get the list of commits that will be rebased
   * @param {string} ancestorSha Common ancestor SHA
   * @param {string} rebaseBranch Branch being rebased
   * @returns {Promise<Array<Object>>} List of commits to rebase
   */
  async getCommitsToRebase(ancestorSha, rebaseBranch) {
    try {
      const output = this.executeCommand(`git log --format="%H|%an|%s" ${ancestorSha}..${rebaseBranch}`);

      return output.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [hash, author, subject] = line.split('|');
          return { hash, author, subject };
        });
    } catch (err) {
      this.error(`Failed to get commits to rebase: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the list of files that might be affected by the rebase
   * @param {string} ancestorSha Common ancestor SHA
   * @param {string} rebaseBranch Branch being rebased
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @returns {Promise<Object>} Object with lists of affected files
   */
  async getAffectedFiles(ancestorSha, rebaseBranch, upstreamBranch) {
    try {
      // Get files changed in the rebase branch
      const rebaseOutput = this.executeCommand(`git diff --name-only ${ancestorSha} ${rebaseBranch}`);
      const rebaseFiles = rebaseOutput.split('\n').filter(line => line.trim() !== '');

      // Get files changed in the upstream branch
      const upstreamOutput = this.executeCommand(`git diff --name-only ${ancestorSha} ${upstreamBranch}`);
      const upstreamFiles = upstreamOutput.split('\n').filter(line => line.trim() !== '');

      // Find files that changed in both branches (potential conflicts)
      const commonFiles = rebaseFiles.filter(file => upstreamFiles.includes(file));

      return {
        rebase: rebaseFiles,
        upstream: upstreamFiles,
        common: commonFiles
      };
    } catch (err) {
      this.error(`Failed to get affected files: ${err.message}`);
      return { rebase: [], upstream: [], common: [] };
    }
  }

  /**
   * Do a basic check for conflicts without using Claude
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @param {string} rebaseBranch Branch being rebased
   * @returns {Promise<boolean>} Whether conflicts are likely
   */
  async hasBasicConflicts(upstreamBranch, rebaseBranch) {
    try {
      // Use git's built-in merge-tree command to check for conflicts
      const mergeTree = this.executeCommand(`git merge-tree $(git merge-base ${upstreamBranch} ${rebaseBranch}) ${upstreamBranch} ${rebaseBranch}`);

      // If the output contains "<<<<<<< " it indicates a conflict
      return mergeTree.includes('<<<<<<< ');
    } catch (err) {
      this.error(`Failed to check for basic conflicts: ${err.message}`);
      // Assume there might be conflicts if we can't check
      return true;
    }
  }

  /**
   * Get the combined diff for analyzing rebase potential
   * @param {string} ancestorSha Common ancestor SHA
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @param {string} rebaseBranch Branch being rebased
   * @returns {Promise<string>} Combined diff information
   */
  async getDiff(ancestorSha, upstreamBranch, rebaseBranch) {
    try {
      // Get the diff between the ancestor and upstream branch
      const upstreamDiff = this.executeCommand(`git diff ${ancestorSha} ${upstreamBranch}`);

      // Get the diff between the ancestor and rebase branch
      const rebaseDiff = this.executeCommand(`git diff ${ancestorSha} ${rebaseBranch}`);

      return `# Upstream Branch Changes (${upstreamBranch})
\`\`\`diff
${upstreamDiff}
\`\`\`

# Rebase Branch Changes (${rebaseBranch})
\`\`\`diff
${rebaseDiff}
\`\`\``;
    } catch (err) {
      this.error(`Failed to get diffs: ${err.message}`);
      return '';
    }
  }

  /**
   * Analyze the rebase using Claude
   * @param {string} diff Combined diff information
   * @param {Array<Object>} commitsToRebase List of commits to rebase
   * @param {Object} affectedFiles Lists of affected files
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @param {string} rebaseBranch Branch being rebased
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeRebase(diff, commitsToRebase, affectedFiles, upstreamBranch, rebaseBranch) {
    // Check if Claude is available
    if (this.claudeAvailable === null) {
      await this.checkClaudeAvailability();
    }

    if (!this.claudeAvailable) {
      return this.analyzeRebaseFallback(diff, commitsToRebase, affectedFiles, upstreamBranch, rebaseBranch);
    }

    try {
      // Create variables for the template
      const variables = {
        rebaseBranch,
        upstreamBranch,
        commitsList: commitsToRebase.map(commit =>
          `- ${commit.hash.substring(0, 7)}: ${commit.subject} (${commit.author})`
        ).join('\n'),
        commonFilesList: affectedFiles.common.map(file => `- ${file}`).join('\n'),
        rebaseFileCount: affectedFiles.rebase.length.toString(),
        upstreamFileCount: affectedFiles.upstream.length.toString(),
        commonFileCount: affectedFiles.common.length.toString(),
        diff,
        checkDependencies: this.checkDependencies ? 'true' : 'false',
        checkTestImpact: this.checkTestImpact ? 'true' : 'false'
      };

      // Format the prompt using template
      const prompt = this.formatPrompt('rebaseAnalysis', variables);

      // Call Claude API
      const response = await this.callClaudeApi({
        prompt,
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        cacheResponse: false // Don't cache this as each rebase might be different
      });

      // Extract the analysis from the response
      const message = response.content[0]?.text || '';

      // Parse the analysis
      return this.parseAnalysis(message);
    } catch (err) {
      this.error(`Failed to analyze rebase with Claude: ${err.message}`);
      return this.analyzeRebaseFallback(diff, commitsToRebase, affectedFiles, upstreamBranch, rebaseBranch);
    }
  }

  /**
   * Basic analysis when Claude is unavailable
   * @param {string} diff Combined diff information
   * @param {Array<Object>} commitsToRebase List of commits to rebase
   * @param {Object} affectedFiles Lists of affected files
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @param {string} rebaseBranch Branch being rebased
   * @returns {Object} Analysis results
   */
  analyzeRebaseFallback(diff, commitsToRebase, affectedFiles, upstreamBranch, rebaseBranch) {
    this.debug('Falling back to basic rebase analysis without Claude');

    const issues = [];

    // Check for common files (potential conflicts)
    if (affectedFiles.common.length > 0) {
      issues.push({
        severity: 'medium',
        description: `${affectedFiles.common.length} files have been modified in both branches and may have conflicts`
      });
    }

    // Check for dependency files
    if (this.checkDependencies) {
      const dependencyFiles = affectedFiles.common.filter(file =>
        file.includes('package.json') ||
        file.includes('package-lock.json') ||
        file.includes('yarn.lock') ||
        file.includes('requirements.txt') ||
        file.includes('Gemfile') ||
        file.includes('Gemfile.lock') ||
        file.includes('go.mod') ||
        file.includes('pom.xml') ||
        file.includes('build.gradle')
      );

      if (dependencyFiles.length > 0) {
        issues.push({
          severity: 'high',
          description: `Dependency files (${dependencyFiles.join(', ')}) have been modified in both branches`
        });
      }
    }

    // Check for test files if requested
    if (this.checkTestImpact) {
      const testFiles = affectedFiles.common.filter(file =>
        file.includes('test') ||
        file.includes('spec') ||
        file.includes('__tests__')
      );

      if (testFiles.length > 0) {
        issues.push({
          severity: 'medium',
          description: `Test files (${testFiles.join(', ')}) have been modified in both branches`
        });
      }
    }

    return {
      issues,
      summary: `Basic analysis without Claude:
- Files modified in ${rebaseBranch}: ${affectedFiles.rebase.length}
- Files modified in ${upstreamBranch}: ${affectedFiles.upstream.length}
- Files modified in both branches: ${affectedFiles.common.length}
- Number of commits to rebase: ${commitsToRebase.length}`
    };
  }

  /**
   * Create the default prompt templates for this hook
   * This is called when no templates are found
   * @returns {Promise<void>}
   */
  async createPromptTemplates() {
    this.debug('Creating default prompt templates for pre-rebase hook');

    const templatesDir = path.join(this.projectRoot, '.claude', 'templates');
    await fs.ensureDir(templatesDir);

    const templates = {
      rebaseAnalysis: `You are a Git expert assistant helping analyze a rebase operation. Please analyze the following Git rebase scenario and identify potential issues or conflicts.

# Rebase Information
- Rebasing branch: {{rebaseBranch}}
- Onto branch: {{upstreamBranch}}

# Commits to be Rebased
{{commitsList}}

# Files Changed
## Files modified in both branches (potential conflicts)
{{commonFilesList}}

## Total files modified in {{rebaseBranch}}: {{rebaseFileCount}}
## Total files modified in {{upstreamBranch}}: {{upstreamFileCount}}
## Total files modified in both branches: {{commonFileCount}}

# Diff Information
{{diff}}

Please analyze this rebase scenario and:

1. Identify specific potential conflicts or issues that might occur during the rebase
2. Assign a severity level to each issue: "critical", "high", "medium", or "low"
3. {{#checkDependencies}}Analyze dependency changes in both branches (package.json, requirements.txt, etc.) and identify conflicts or version mismatches{{/checkDependencies}}
4. {{#checkTestImpact}}Evaluate the impact on tests - identify if tests may fail after the rebase due to conflicting changes{{/checkTestImpact}}
5. Provide recommendations on how to handle the rebase safely
6. Generate a concise summary of your analysis

Format your response as a structured JSON object with the following schema:
\`\`\`json
{
  "issues": [
    {
      "severity": "high",
      "description": "Detailed description of the issue",
      "recommendation": "Suggestion to address this issue"
    }
  ],
  "summary": "Overall assessment of the rebase operation in a few sentences"
}
\`\`\`

Focus on concrete, specific issues rather than general warnings. If there are no significant issues, return an empty issues array.`
    };

    const templatePath = path.join(templatesDir, `${this.gitHookName}.json`);
    await fs.writeJson(templatePath, templates, { spaces: 2 });
    this.debug(`Created default prompt templates at ${templatePath}`);

    // Load the templates we just created
    await this.loadPromptTemplates();
  }

  /**
   * Get a fallback prompt template
   * @param {string} templateName The template name
   * @param {Object} variables Variables for the template
   * @returns {string} The fallback prompt
   */
  getFallbackPrompt(templateName, variables) {
    if (templateName === 'rebaseAnalysis') {
      return this.createAnalysisPrompt(
        variables.diff,
        variables.commitsList.split('\n').map(line => {
          const matches = line.match(/- ([a-f0-9]+): (.*) \((.*)\)/);
          if (matches) {
            return {
              hash: matches[1],
              subject: matches[2],
              author: matches[3]
            };
          }
          return null;
        }).filter(Boolean),
        {
          rebase: new Array(parseInt(variables.rebaseFileCount) || 0),
          upstream: new Array(parseInt(variables.upstreamFileCount) || 0),
          common: variables.commonFilesList.split('\n').map(line => line.replace(/^- /, '').trim()).filter(Boolean)
        },
        variables.upstreamBranch,
        variables.rebaseBranch
      );
    }

    return super.getFallbackPrompt(templateName, variables);
  }

  /**
   * Create a prompt for Claude to analyze the rebase
   * @param {string} diff Combined diff information
   * @param {Array<Object>} commitsToRebase List of commits to rebase
   * @param {Object} affectedFiles Lists of affected files
   * @param {string} upstreamBranch Upstream branch being rebased onto
   * @param {string} rebaseBranch Branch being rebased
   * @returns {string} Prompt for Claude
   */
  createAnalysisPrompt(diff, commitsToRebase, affectedFiles, upstreamBranch, rebaseBranch) {
    // Create a list of commits to rebase
    const commitsList = commitsToRebase.map(commit =>
      `- ${commit.hash.substring(0, 7)}: ${commit.subject} (${commit.author})`
    ).join('\n');

    // Create lists of affected files
    const commonFilesList = affectedFiles.common.map(file => `- ${file}`).join('\n');

    // Specific analysis requests
    const checkDependencies = this.checkDependencies
      ? 'Analyze dependency changes in both branches (package.json, requirements.txt, etc.) and identify conflicts or version mismatches'
      : '';

    const checkTestImpact = this.checkTestImpact
      ? 'Evaluate the impact on tests - identify if tests may fail after the rebase due to conflicting changes'
      : '';

    return `You are a Git expert assistant helping analyze a rebase operation. Please analyze the following Git rebase scenario and identify potential issues or conflicts.

# Rebase Information
- Rebasing branch: ${rebaseBranch}
- Onto branch: ${upstreamBranch}

# Commits to be Rebased
${commitsList}

# Files Changed
## Files modified in both branches (potential conflicts)
${commonFilesList || '(None)'}

## Total files modified in ${rebaseBranch}: ${affectedFiles.rebase.length}
## Total files modified in ${upstreamBranch}: ${affectedFiles.upstream.length}
## Total files modified in both branches: ${affectedFiles.common.length}

# Diff Information
${diff}

Please analyze this rebase scenario and:

1. Identify specific potential conflicts or issues that might occur during the rebase
2. Assign a severity level to each issue: "critical", "high", "medium", or "low"
3. ${checkDependencies}
4. ${checkTestImpact}
5. Provide recommendations on how to handle the rebase safely
6. Generate a concise summary of your analysis

Format your response as a structured JSON object with the following schema:
\`\`\`json
{
  "issues": [
    {
      "severity": "high",
      "description": "Detailed description of the issue",
      "recommendation": "Suggestion to address this issue"
    }
  ],
  "summary": "Overall assessment of the rebase operation in a few sentences"
}
\`\`\`

Focus on concrete, specific issues rather than general warnings. If there are no significant issues, return an empty issues array.`;
  }

  /**
   * Parse the Claude analysis response
   * @param {string} analysisText Analysis text from Claude
   * @returns {Object} Parsed analysis
   */
  parseAnalysis(analysisText) {
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);

      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // If no JSON block is found, look for any JSON-like structure
      const jsonRegex = /\{\s*"issues"\s*:\s*\[.*?\]\s*,\s*"summary"\s*:\s*".*?"\s*\}/s;
      const jsonMatch2 = analysisText.match(jsonRegex);

      if (jsonMatch2) {
        return JSON.parse(jsonMatch2[0]);
      }

      // If we can't parse JSON, just extract issues and summary using regex
      const issues = [];
      const issueMatches = analysisText.matchAll(/severity["'\s:]+([^"'\s,]+)["'\s,]+description["'\s:]+([^"]+?)["']/g);

      for (const match of issueMatches) {
        issues.push({
          severity: match[1].toLowerCase(),
          description: match[2].trim()
        });
      }

      const summaryMatch = analysisText.match(/summary["'\s:]+([^"]+?)["']/);
      const summary = summaryMatch ? summaryMatch[1].trim() : 'Analysis completed, but format could not be parsed properly.';

      return {
        issues,
        summary
      };
    } catch (err) {
      this.error(`Failed to parse analysis: ${err.message}`);
      return {
        issues: [],
        summary: 'Analysis completed, but response could not be parsed into a structured format.'
      };
    }
  }

  /**
   * Determine if the rebase should be blocked based on issue severity
   * @param {Array<Object>} issues List of issues
   * @returns {boolean} Whether to block the rebase
   */
  shouldBlockRebase(issues) {
    if (this.blockingMode === 'none') {
      return false;
    }

    if (this.blockingMode === 'warn') {
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
      const issueSeverityLevel = severityLevels[issue.severity.toLowerCase()] || 0;
      return issueSeverityLevel >= thresholdLevel;
    });
  }
}

export default PreRebaseHook;