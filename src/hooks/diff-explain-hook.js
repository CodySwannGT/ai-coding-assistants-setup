/**
 * Diff Explain Hook
 * 
 * This is not a traditional Git hook, but rather a feature that enables
 * the diff-explain command for explaining git diffs with Claude AI.
 */

import fs from 'fs-extra';
import path from 'path';
import _chalk from 'chalk';
import { BaseHook } from './base-hook.js';

class DiffExplainHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'AI-Enhanced Git Diff Explanation',
      description: 'Uses Claude to explain code changes in natural language',
      gitHookName: 'diff-explain' // This is not a real Git hook, just a feature
    });
    
    // Configuration options specific to diff-explain
    this.verbosity = config.verbosity || 'detailed'; // detailed or brief
    this.focusAreas = config.focusAreas || ['functionality', 'security', 'performance', 'readability'];
    this.outputFormat = config.outputFormat || 'inline'; // inline, summary-only, side-by-side
    this.maxTokens = config.maxTokens || 4000;
    this.maxDiffSize = config.maxDiffSize || 100000;
    this.highlightIssues = config.highlightIssues !== undefined ? config.highlightIssues : true;
    this.includeSuggestions = config.includeSuggestions !== undefined ? config.includeSuggestions : true;
    this.includeSummary = config.includeSummary !== undefined ? config.includeSummary : true;
  }

  /**
   * This hook doesn't generate a Git hook script since it's not a real Git hook.
   * Instead, it sets up the configuration for the diff-explain command.
   * @returns {string} The hook script content (empty for this hook)
   */
  generateHookScript() {
    return `#!/bin/sh
# This is not a real Git hook, it's just a placeholder.
# The AI-Enhanced Git Diff feature is available via the diff-explain command.
exit 0
`;
  }

  /**
   * Setup the diff-explain configuration
   * @returns {Promise<boolean>} Whether the feature was successfully set up
   */
  async setup() {
    if (!this.enabled) {
      this.debug('Diff-explain feature is disabled, skipping setup');
      return false;
    }

    if (this.dryRun) {
      this.info('Would set up AI-Enhanced Git Diff Explanation feature');
      return true;
    }

    try {
      // Create the .claude directory if it doesn't exist
      const claudeDir = path.join(this.projectRoot, '.claude');
      await fs.ensureDir(claudeDir);

      // Create the configuration file
      const configPath = path.join(claudeDir, 'diff-explain-config.json');
      
      const config = {
        verbosity: this.verbosity,
        focusAreas: this.focusAreas,
        outputFormat: this.outputFormat,
        maxTokens: this.maxTokens,
        maxDiffSize: this.maxDiffSize,
        highlightIssues: this.highlightIssues,
        includeSuggestions: this.includeSuggestions,
        includeSummary: this.includeSummary,
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        preferCli: true
      };
      
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      this.success('AI-Enhanced Git Diff Explanation feature set up successfully');
      this.info('You can now use the `diff-explain` command to get AI-enhanced git diff explanations.');
      this.info(`Configuration file saved at: ${configPath}`);
      
      return true;
    } catch (err) {
      this.error(`Failed to set up AI-Enhanced Git Diff Explanation feature: ${err.message}`);
      return false;
    }
  }

  /**
   * Remove the diff-explain configuration
   * @returns {Promise<boolean>} Whether the feature was successfully removed
   */
  async remove() {
    if (this.dryRun) {
      this.info('Would remove AI-Enhanced Git Diff Explanation feature');
      return true;
    }

    try {
      const configPath = path.join(this.projectRoot, '.claude', 'diff-explain-config.json');
      
      if (await fs.pathExists(configPath)) {
        await fs.remove(configPath);
        this.success('AI-Enhanced Git Diff Explanation feature removed');
      } else {
        this.info('AI-Enhanced Git Diff Explanation feature not found, nothing to remove');
      }
      
      return true;
    } catch (err) {
      this.error(`Failed to remove AI-Enhanced Git Diff Explanation feature: ${err.message}`);
      return false;
    }
  }

  /**
   * This method is not applicable for this feature, but is required by the BaseHook interface
   * @returns {Promise<void>}
   */
  async execute() {
    // This feature doesn't have an execute method since it's not a real Git hook
    this.debug('Diff-explain is not executable as a hook - use the diff-explain command instead');
  }
}

export default DiffExplainHook;