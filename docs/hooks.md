# Git Hooks with Claude Integration

This document provides an overview of the Git hook system in the AI Coding Assistants Setup, which enables Claude-powered code review and other features.

## Overview

The AI Coding Assistants Setup includes a comprehensive Git hook system that uses Claude to enhance your Git workflow. The following hooks are available:

- **Pre-Commit**: Reviews staged changes before they are committed
- **Prepare-Commit-Msg**: Generates or suggests commit messages based on changes
- **Commit-Msg**: Validates commit message structure and content
- **Pre-Push**: Performs security audits before pushing code
- **Post-Merge**: Generates summaries of merged changes
- **Post-Checkout**: Provides context when switching branches
- **Post-Rewrite**: Explains changes after rebases or amends
- **Pre-Rebase**: Predicts potential conflicts before rebasing
- **Branch-Strategy**: Enforces branch naming conventions and workflow rules
- **Test-First Development**: Detects new files without tests and suggests test cases

## Setup

Hooks are automatically configured during the setup process. You can choose which hooks to enable and configure their behavior through the interactive setup wizard.

To manually set up hooks:

```bash
node index.js --hooks
```

This will launch the hook configuration wizard that lets you select and customize Git hooks.

### Configuration Templates

There are several predefined configuration templates:

- **Minimal** - Only essential hooks with basic configuration (commit-msg)
- **Standard** - Common hooks with recommended configuration (prepare-commit-msg, commit-msg, post-merge, post-checkout)
- **Strict** - All hooks with comprehensive configuration
- **Custom** - Select specific hooks and configure each one

Example:

```bash
node index.js --hooks --template standard
```

### Configuration Management

Hooks can be managed programmatically using the config-manager API:

```javascript
import { enableHook, disableHook, applyHookTemplate } from './hooks/config-manager.js';

// Enable a specific hook
await enableHook({ projectRoot: '.', hookId: 'commit-msg' });

// Apply a configuration template
await applyHookTemplate({ projectRoot: '.', template: 'standard' });
```

## How It Works

Each Git hook uses the Claude API to analyze your code or Git metadata and provide intelligent assistance. Hooks are implemented as Node.js scripts that are installed into your `.git/hooks` directory.

When a Git operation triggers a hook, the hook script calls the Claude API to analyze your code or Git metadata and then takes appropriate action based on the hook type and your configuration.

## Configuration Options

### Pre-Commit Hook

The pre-commit hook reviews your staged changes before they are committed.

Options:
- **Strictness**: Low (critical issues only), Medium (common issues), or High (thorough review)
- **Review Focus**: Select specific areas to focus on during review:
  - Bugs: Logical errors, edge cases, and exceptions
  - Security: Vulnerabilities and sensitive data exposure
  - Performance: Efficiency and resource usage
  - Best Practices: Design patterns and maintainability
  - Style: Formatting, naming conventions, and readability
- **Blocking Mode**: Whether to block commits based on issues found
- **Block on Severity**: Configure which severity levels should block commits:
  - None: Never block commits (advisory only)
  - Critical: Only block commits with critical issues
  - High: Block commits with high or critical issues
  - Medium: Block commits with medium to critical issues
  - Low: Block commits with any issues

### Prepare-Commit-Msg Hook

This hook generates or suggests commit messages based on your staged changes.

Options:
- **Mode**: Suggest or Insert
- **Conventional Commits**: Whether to use conventional commit format
- **Message Style**: Concise or Detailed

### Commit-Msg Hook

This hook validates your commit messages to ensure they meet quality standards.

Options:
- **Blocking Mode**: Whether to block commits with invalid messages
- **Conventional Commits**: Whether to enforce conventional commit format
- **Spelling & Grammar**: Whether to check for spelling and grammar errors

### Pre-Push Hook

This hook performs security audits before pushing code to remote repositories.

Options:
- **Blocking Mode**: Whether to block pushes with critical security issues
- **Audit Types**: Security vulnerabilities, credentials, sensitive data, etc.
- **Exclude Patterns**: Files to exclude from security checks

### Post-Merge Hook

This hook generates summaries of merged changes to help you understand what changed.

Options:
- **Summary Format**: Concise or Detailed
- **Include Statistics**: Whether to include statistics in the summary
- **Include Dependencies**: Whether to highlight dependency changes
- **Include Breaking Changes**: Whether to identify breaking changes
- **Notification Method**: Terminal, File, or System Notification

### Post-Checkout Hook

This hook provides context when switching between branches.

Options:
- **Summary Format**: Concise or Detailed
- **Include Statistics**: Whether to include file statistics
- **Include Dependencies**: Whether to highlight dependency changes
- **Include Breaking Changes**: Whether to identify breaking changes
- **Skip Initial Checkout**: Whether to skip summaries for initial checkouts
- **Skip Tag Checkout**: Whether to skip summaries when checking out tags
- **Notification Method**: Terminal, File, or System Notification

### Post-Rewrite Hook

This hook generates summaries after rebase or amend operations.

Options:
- **Summary Format**: Concise or Detailed
- **Include Statistics**: Whether to include file statistics
- **Include Dependencies**: Whether to highlight dependency changes
- **Include Breaking Changes**: Whether to identify breaking changes
- **Notification Method**: Terminal, File, or System Notification

### Pre-Rebase Hook

This hook analyzes rebases before they occur to predict potential issues.

Options:
- **Blocking Mode**: How to handle detected issues ('block', 'warn', 'none')
- **Check Conflicts**: Whether to check for potential conflicts
- **Check Test Impact**: Whether to evaluate impact on tests
- **Check Dependencies**: Whether to check for dependency conflicts
- **Block on Severity**: Minimum issue severity to block the rebase

### Branch Strategy Hook

This hook enforces branch naming conventions and workflow rules.

Options:
- **Strategy Type**: GitFlow, Trunk-based, GitHub Flow, or Custom
- **Blocking Mode**: How to handle violations ('block', 'warn', 'none')
- **Branch Prefixes**: Prefix mapping for different branch types
- **Main Branches**: List of main branches
- **Protected Branches**: List of protected branches
- **Validate with Claude**: Whether to use Claude for validation
- **JIRA Integration**: Whether to enforce JIRA ticket references

### Test-First Development Hook

This hook promotes test-first development by detecting when new files are added without corresponding test files.

Options:
- **Blocking Mode**: How to handle missing tests ('block', 'warn', 'none')
- **File Extensions**: Which file types should require tests (.js, .ts, etc.)
- **Test Directories**: Where test files should be located
- **Test Framework**: Testing framework to use for test suggestions (auto-detect, Jest, Mocha, etc.)
- **Suggest with Claude**: Whether to use Claude to suggest test cases
- **Exclusion Patterns**: Patterns to exclude from test checks

## Enabling/Disabling Hooks Temporarily

You can temporarily disable hooks using Git's `--no-verify` flag:

```bash
git commit --no-verify
git push --no-verify
```

You can also selectively disable hooks using environment variables:

```bash
CLAUDE_SKIP_COMMIT_MSG=true git commit -m "Skip commit message validation"
CLAUDE_SKIP_PRE_PUSH=true git push
```

Available skip environment variables:
- `CLAUDE_SKIP_PRE_COMMIT=true`
- `CLAUDE_SKIP_PREPARE_COMMIT_MSG=true`
- `CLAUDE_SKIP_COMMIT_MSG=true`
- `CLAUDE_SKIP_PRE_PUSH=true`
- `CLAUDE_SKIP_POST_MERGE=true`
- `CLAUDE_SKIP_POST_CHECKOUT=true`
- `CLAUDE_SKIP_POST_REWRITE=true`
- `CLAUDE_SKIP_PRE_REBASE=true`
- `CLAUDE_SKIP_BRANCH_STRATEGY=true`
- `CLAUDE_SKIP_TEST_FIRST_DEVELOPMENT=true`

## Troubleshooting

### Claude API vs Claude CLI

By default, the hooks will use Claude CLI if it's available, with fallback to the Claude API. This behavior can be configured:

- Set `preferCli: false` in hook configuration to prefer API over CLI for a specific hook
- Set environment variable `CLAUDE_USE_CLI=false` to prefer API for all hooks

### Missing API Key

If you see "No Claude API key found" errors and Claude CLI is not installed, you need to add your Anthropic API key to the `.env` file:

```
ANTHROPIC_API_KEY=your-api-key-here
```

### Claude CLI Setup

To use Claude CLI:

1. Install Claude CLI: `npm install -g @anthropic-ai/claude-cli`
2. Log in using `claude login`

### Hook Not Executing

If a hook isn't executing:

1. Check that the hook is enabled in the hook configuration
2. Ensure the hook script is executable (`chmod +x .git/hooks/pre-commit`)
3. Verify that Git hooks are not disabled globally

### API Request Failures

If you see API request failures:

1. Check your internet connection
2. Verify that your API key is valid
3. Check the Claude API status

## Advanced Usage

### Creating Custom Hooks

You can extend the hook system with custom hooks by:

1. Creating a new hook class that extends `BaseHook`
2. Implementing the `execute()` method
3. Registering the hook in the hook registry

Example:

```javascript
import { BaseHook } from './base-hook.js';

class MyCustomHook extends BaseHook {
  constructor(config) {
    super({
      ...config,
      name: 'My Custom Hook',
      description: 'Description of what the hook does',
      gitHookName: 'post-checkout'
    });
  }

  async execute(args) {
    // Implement your hook logic here
  }
}

export default MyCustomHook;
```

### Customizing Claude Prompts

You can create custom prompt templates for each hook:

1. Create a `.claude/templates` directory in your project
2. For each hook, create a JSON file with the hook name (e.g., `commit-msg.json`)
3. Define templates with variables using Mustache syntax: `{{variable}}`

Example template for commit-msg hook:

```json
{
  "validateCommit": "You are a commit message validator. Please analyze this commit message: {{message}}...",
  "suggestImprovements": "You are a commit message expert. Here is a commit message that might need improvement: {{message}}..."
}
```

For more advanced customization, you can edit the hook implementation files in the `src/hooks` directory.

## Security Considerations

Please be aware of the following security considerations when using hooks:

- Git hooks run with your user permissions
- The Command Shell hook can execute commands on your system
- API keys are stored in the .env file
- Code sent to Claude is subject to Anthropic's privacy policies

Always review any changes to hook scripts before accepting them.

## Feedback and Contributions

If you encounter issues or have ideas for improving the hook system, please open an issue on the GitHub repository. Contributions to the hook system are welcome!