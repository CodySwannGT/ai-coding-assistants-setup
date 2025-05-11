# Git Hooks with Claude Integration

This document provides an overview of the Git hook system in the AI Coding Assistants Setup, which enables Claude-powered code review and other features.

## Overview

The AI Coding Assistants Setup includes a comprehensive Git hook system that uses Claude to enhance your Git workflow. The following hooks are available:

- **Pre-Commit**: Reviews staged changes before they are committed
- **Prepare-Commit-Msg**: Generates or suggests commit messages based on changes
- **Commit-Msg**: Validates commit message structure and content
- **Pre-Push**: Performs security audits before pushing code
- **Post-Merge**: Generates summaries of merged changes

## Setup

Hooks are automatically configured during the setup process. You can choose which hooks to enable and configure their behavior through the interactive setup wizard.

To manually set up hooks:

```bash
node index.js --hooks
```

This will launch the hook configuration wizard that lets you select and customize Git hooks.

## How It Works

Each Git hook uses the Claude API to analyze your code or Git metadata and provide intelligent assistance. Hooks are implemented as Node.js scripts that are installed into your `.git/hooks` directory.

When a Git operation triggers a hook, the hook script calls the Claude API to analyze your code or Git metadata and then takes appropriate action based on the hook type and your configuration.

## Configuration Options

### Pre-Commit Hook

The pre-commit hook reviews your staged changes before they are committed.

Options:
- **Strictness**: Low, Medium, or High
- **Blocking Mode**: Whether to block commits with critical issues
- **Review Focus**: Bugs, security, best practices, etc.

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
- **Notification Method**: Terminal, File, or System Notification

## Enabling/Disabling Hooks Temporarily

You can temporarily disable hooks using Git's `--no-verify` flag:

```bash
git commit --no-verify
git push --no-verify
```

## Troubleshooting

### Missing API Key

If you see "No Claude API key found" errors, you need to add your Anthropic API key to the `.env` file:

```
ANTHROPIC_API_KEY=your-api-key-here
```

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

Advanced users can customize the prompts sent to Claude by editing the hook implementation files in the `src/hooks` directory.

## Security Considerations

Please be aware of the following security considerations when using hooks:

- Git hooks run with your user permissions
- The Command Shell hook can execute commands on your system
- API keys are stored in the .env file
- Code sent to Claude is subject to Anthropic's privacy policies

Always review any changes to hook scripts before accepting them.

## Feedback and Contributions

If you encounter issues or have ideas for improving the hook system, please open an issue on the GitHub repository. Contributions to the hook system are welcome!