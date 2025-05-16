/**
 * Claude Review Hook
 * 
 * Git hook integration for Claude AI code review. This hook can be used in
 * pre-commit or pre-push phases to automatically review code changes.
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { Feedback } from '../utils/feedback';
import { ClaudeVerification, VerificationResult } from '../integrations/claude-verification';
import { DiffExplain } from '../integrations/diff-explain';

/**
 * Configuration for Claude review hook
 */
export interface ClaudeReviewHookConfig {
  // Whether to perform verification on pre-commit
  verifyOnPreCommit: boolean;
  
  // Whether to perform verification on pre-push
  verifyOnPrePush: boolean;
  
  // Whether to block commits/pushes with critical issues
  blockOnCritical: boolean;
  
  // Whether to block commits/pushes with high severity issues
  blockOnHigh: boolean;
  
  // Whether to block commits/pushes with medium severity issues
  blockOnMedium: boolean;
  
  // Maximum files to review in a single run
  maxFilesToReview: number;
  
  // File extensions to include in review
  includedExtensions: string[];
  
  // File patterns to exclude from review
  excludedPatterns: string[];
  
  // Claude model to use
  model: string;
  
  // Max tokens for Claude response
  maxTokens: number;
  
  // Temperature for Claude generation
  temperature: number;
  
  // Focus areas for review
  focusAreas: string[];
}

/**
 * Default configuration for Claude review hook
 */
export const DEFAULT_CONFIG: ClaudeReviewHookConfig = {
  verifyOnPreCommit: true,
  verifyOnPrePush: false,
  blockOnCritical: true,
  blockOnHigh: false,
  blockOnMedium: false,
  maxFilesToReview: 5,
  includedExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.vue', 
    '.java', '.py', '.rb', '.php', '.go',
    '.c', '.cpp', '.h', '.hpp', '.cs', 
    '.swift', '.kt', '.rs', '.scala'
  ],
  excludedPatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.git/',
    '*.min.js',
    '*.bundle.js'
  ],
  model: 'claude-3-opus-20240229',
  maxTokens: 4000,
  temperature: 0.2,
  focusAreas: ['security', 'functionality', 'performance', 'style']
};

/**
 * Load Claude review hook configuration
 */
export async function loadHookConfig(projectRoot: string): Promise<ClaudeReviewHookConfig> {
  try {
    const configPath = path.join(projectRoot, '.claude', 'review-hook-config.json');
    
    if (await fs.pathExists(configPath)) {
      const userConfig = await fs.readJson(configPath);
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
    
    return DEFAULT_CONFIG;
  } catch (error) {
    Feedback.warning(`Failed to load Claude review hook configuration: ${error instanceof Error ? error.message : String(error)}`);
    return DEFAULT_CONFIG;
  }
}

/**
 * Check if a file should be reviewed based on the configuration
 */
export function shouldReviewFile(filePath: string, config: ClaudeReviewHookConfig): boolean {
  // Check if file extension is included
  const ext = path.extname(filePath).toLowerCase();
  const isIncludedExt = config.includedExtensions.includes(ext);
  
  if (!isIncludedExt) {
    return false;
  }
  
  // Check if file matches any excluded patterns
  const isExcluded = config.excludedPatterns.some(pattern => {
    if (pattern.endsWith('/')) {
      // Directory pattern
      return filePath.includes(pattern);
    } else if (pattern.startsWith('*.')) {
      // Extension pattern
      return filePath.endsWith(pattern.substring(1));
    } else {
      // Regular pattern
      return filePath.includes(pattern);
    }
  });
  
  return !isExcluded;
}

/**
 * Run pre-commit review hook
 */
export async function runPreCommitReview(projectRoot: string = process.cwd()): Promise<boolean> {
  try {
    // Load configuration
    const config = await loadHookConfig(projectRoot);
    
    // Check if verification is enabled for pre-commit
    if (!config.verifyOnPreCommit) {
      Feedback.info('Claude pre-commit review is disabled in configuration');
      return true;
    }
    
    Feedback.info('Running Claude pre-commit code review...');
    
    // Get staged files
    const result = await ClaudeVerification.verifyStagedFiles({
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      focusAreas: config.focusAreas,
      blockOnCritical: config.blockOnCritical,
      blockOnHigh: config.blockOnHigh,
      blockOnMedium: config.blockOnMedium
    });
    
    // Process result
    await processVerificationResult(result, projectRoot);
    
    // Return true (allow commit) if no blocking issues
    return !result.shouldBlock;
  } catch (error) {
    Feedback.error(`Error in pre-commit review: ${error instanceof Error ? error.message : String(error)}`);
    // Allow commit on error
    return true;
  }
}

/**
 * Run pre-push review hook
 */
export async function runPrePushReview(projectRoot: string = process.cwd()): Promise<boolean> {
  try {
    // Load configuration
    const config = await loadHookConfig(projectRoot);
    
    // Check if verification is enabled for pre-push
    if (!config.verifyOnPrePush) {
      Feedback.info('Claude pre-push review is disabled in configuration');
      return true;
    }
    
    Feedback.info('Running Claude pre-push code review...');
    
    // Get unpushed commits
    const unpushedCommitsOutput = execSync('git log @{u}..HEAD --pretty=format:%H', {
      encoding: 'utf8'
    }).trim();
    
    if (!unpushedCommitsOutput) {
      Feedback.info('No unpushed commits to review');
      return true;
    }
    
    const unpushedCommits = unpushedCommitsOutput.split('\n');
    
    // Review each commit
    for (const commit of unpushedCommits) {
      Feedback.info(`Reviewing commit ${commit.substring(0, 8)}...`);
      
      // Verify the commit
      const result = await ClaudeVerification.verifyCommit(commit, {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        focusAreas: config.focusAreas,
        blockOnCritical: config.blockOnCritical,
        blockOnHigh: config.blockOnHigh,
        blockOnMedium: config.blockOnMedium
      });
      
      // Process result
      await processVerificationResult(result, projectRoot, commit);
      
      // Block push if issues found
      if (result.shouldBlock) {
        return false;
      }
    }
    
    // Allow push if no blocking issues found
    return true;
  } catch (error) {
    Feedback.error(`Error in pre-push review: ${error instanceof Error ? error.message : String(error)}`);
    // Allow push on error
    return true;
  }
}

/**
 * Run prepare-commit-msg hook for Claude integration
 */
export async function runPrepareCommitMsg(
  commitMsgFile: string, 
  commitSource?: string, 
  commitHash?: string
): Promise<boolean> {
  try {
    // Only run on message editing, not for merge commits or squash commits
    if (commitSource === 'merge' || commitSource === 'squash') {
      return true;
    }
    
    // Get staged diff
    const stagedDiff = getGitDiff({ staged: true });
    
    if (!stagedDiff || stagedDiff.trim() === '') {
      return true;
    }
    
    // Process the diff
    const processedDiff = DiffExplain.processDiff(stagedDiff);
    
    // Create a prompt for generating commit message
    const prompt = createCommitMsgPrompt(processedDiff);
    
    // Call Claude
    const suggestedMessage = await callClaudeForCommitMsg(prompt);
    
    // Read existing commit message
    const existingMessage = await fs.readFile(commitMsgFile, 'utf8');
    
    // Update commit message file if we got a suggestion and the existing message is empty/template
    if (suggestedMessage && (!existingMessage || existingMessage.trim().startsWith('#'))) {
      // Format the message with the suggestion and attribution
      const message = formatCommitMessage(suggestedMessage);
      await fs.writeFile(commitMsgFile, message);
      
      Feedback.success('Added Claude-suggested commit message');
    }
    
    return true;
  } catch (error) {
    Feedback.error(`Error in prepare-commit-msg: ${error instanceof Error ? error.message : String(error)}`);
    // Allow commit on error
    return true;
  }
}

/**
 * Process verification result and handle output
 */
async function processVerificationResult(
  result: VerificationResult, 
  projectRoot: string,
  commitHash?: string
): Promise<void> {
  // Count issues by severity
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  
  for (const file of result.files) {
    for (const issue of file.issues) {
      switch (issue.severity) {
        case 'critical':
          criticalCount++;
          break;
        case 'high':
          highCount++;
          break;
        case 'medium':
          mediumCount++;
          break;
        case 'low':
          lowCount++;
          break;
      }
    }
  }
  
  // Output summary
  Feedback.info(`Claude review found ${criticalCount + highCount + mediumCount + lowCount} issues:`);
  
  if (criticalCount > 0) {
    Feedback.error(`- ${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''}`);
  }
  
  if (highCount > 0) {
    Feedback.warning(`- ${highCount} high severity issue${highCount !== 1 ? 's' : ''}`);
  }
  
  if (mediumCount > 0) {
    Feedback.info(`- ${mediumCount} medium severity issue${mediumCount !== 1 ? 's' : ''}`);
  }
  
  if (lowCount > 0) {
    Feedback.info(`- ${lowCount} low severity issue${lowCount !== 1 ? 's' : ''}`);
  }
  
  // Save result
  const context = commitHash ? `commit-${commitHash.substring(0, 8)}` : 'staged';
  const reportFilePath = await ClaudeVerification.saveVerificationResult(result, projectRoot);
  
  if (reportFilePath) {
    Feedback.info(`Full review report saved to: ${reportFilePath}`);
  }
  
  // Check if should block
  if (result.shouldBlock) {
    if (criticalCount > 0) {
      Feedback.error('Claude review found critical issues that must be fixed');
    } else if (highCount > 0) {
      Feedback.warning('Claude review found high severity issues that should be fixed');
    } else if (mediumCount > 0) {
      Feedback.info('Claude review found medium severity issues that could be improved');
    }
  }
}

/**
 * Create a prompt for generating a commit message
 */
function createCommitMsgPrompt(diffInfo: any): string {
  const prompt = `You are an expert developer. Based on the following git diff, suggest a concise, descriptive commit message following best practices:

# Git Diff Stats
Files changed: ${diffInfo.stats.fileCount}
Additions: ${diffInfo.stats.additions}
Deletions: ${diffInfo.stats.deletions}
Total changes: ${diffInfo.stats.total}

# Instructions
- Create a clear, concise commit message that summarizes the changes
- Start with a verb in imperative mood (Add, Fix, Update, Refactor, etc.)
- Focus on WHY the change was made, not just WHAT was changed
- Keep the first line under 50 characters
- If needed, add more details after a blank line
- Do not use bullet points, just paragraphs
- Do not add co-authored-by lines

# Git Diff
\`\`\`diff
${diffInfo.originalDiff}
\`\`\`
`;

  return prompt;
}

/**
 * Format a commit message with Claude attribution
 */
function formatCommitMessage(suggestedMessage: string): string {
  // Extract the first paragraph as the summary
  const lines = suggestedMessage.trim().split('\n');
  const summary = lines[0].trim();
  
  // Collect any details (lines after the first empty line)
  let details = '';
  let foundEmptyLine = false;
  
  for (let i = 1; i < lines.length; i++) {
    if (!foundEmptyLine && lines[i].trim() === '') {
      foundEmptyLine = true;
    } else if (foundEmptyLine) {
      details += lines[i] + '\n';
    }
  }
  
  // Format the message
  let message = summary;
  
  if (details.trim()) {
    message += '\n\n' + details.trim();
  }
  
  // Add Claude attribution
  message += '\n\n🤖 Generated with Claude AI\n';
  
  return message;
}

/**
 * Call Claude to generate a commit message
 */
async function callClaudeForCommitMsg(prompt: string): Promise<string> {
  try {
    const cliAvailable = await ClaudeVerification.isClaudeCliAvailable();
    
    if (cliAvailable) {
      // Use Claude CLI
      const response = await ClaudeVerification.callClaudeCli(prompt);
      return response.trim();
    } else {
      // Get environment variables
      const env = await fs.readJson(path.join(process.cwd(), '.env'), { throws: false }) || {};
      const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Claude API key required when Claude CLI is not available');
      }
      
      // Use Claude API
      const response = await ClaudeVerification.callClaudeApi(prompt, undefined, {
        apiKey,
        model: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 0.7
      });
      
      return response.trim();
    }
  } catch (error) {
    Feedback.error(`Failed to generate commit message: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

/**
 * Get a Git diff with specific options
 */
function getGitDiff(options: { commit?: string, branch?: string, staged?: boolean }): string {
  const { commit, branch, staged } = options;
  
  // Build the git diff command
  let diffCommand = 'git diff';
  
  // Add options for what to diff
  if (staged) {
    diffCommand += ' --staged';
  } else if (commit) {
    diffCommand += ` ${commit}`;
  } else if (branch) {
    diffCommand += ` ${branch}`;
  }
  
  try {
    return execSync(diffCommand, { encoding: 'utf8' });
  } catch (error) {
    // If the command fails, return an empty string
    return '';
  }
}

/**
 * Claude review hook API
 */
export const ClaudeReviewHook = {
  loadHookConfig,
  shouldReviewFile,
  runPreCommitReview,
  runPrePushReview,
  runPrepareCommitMsg
};

export default ClaudeReviewHook;