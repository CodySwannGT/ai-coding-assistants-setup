# Claude Code Review

This document explains how to use the Claude AI-powered code review functionality.

## Overview

The AI Coding Assistants Setup provides powerful AI-driven code review capabilities using Claude. This can help identify potential issues, bugs, security vulnerabilities, and areas for improvement in your code.

## Features

- Run AI-powered code reviews from the command line
- Automatically detect code issues with severity levels
- Get specific suggestions for improvements
- Focus on different aspects like security, performance, or style
- Save review results as Markdown or JSON
- Configure reviews with flexible options

## Using the Code Review Command

The tool provides a command-line interface for running code reviews:

```bash
ai-coding-assistants-setup code-review [options]
```

### Options

- `-i, --include <patterns...>`: File patterns to include (glob syntax)
- `-e, --exclude <patterns...>`: File patterns to exclude (glob syntax)
- `-f, --files <files...>`: Specific files to review
- `--focus <areas...>`: Focus areas for review (security, functionality, performance, style)
- `-m, --model <model>`: Claude model to use (default: claude-3-haiku-20240307)
- `-c, --config <path>`: Path to config file
- `-o, --output <format>`: Output format (markdown, json) (default: markdown)
- `--no-save`: Do not save review results to file

## Examples

### Basic Usage

```bash
# Review all code files in the src directory
ai-coding-assistants-setup code-review -i "src/**/*.{js,ts}"
```

### Focusing on Security Issues

```bash
# Focus the review on security aspects
ai-coding-assistants-setup code-review --focus security
```

### Reviewing Specific Files

```bash
# Review specific files
ai-coding-assistants-setup code-review -f src/critical.js src/important.ts
```

### Using Different Claude Models

```bash
# Use a different Claude model
ai-coding-assistants-setup code-review -m claude-3-opus-20240229
```

### JSON Output

```bash
# Output results as JSON
ai-coding-assistants-setup code-review -o json
```

## Configuration

You can create a configuration file at `.claude/code-review-config.json` to customize code review behavior.

### Configuration Options

```json
{
  "includePatterns": [
    "src/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}"
  ],
  "excludePatterns": [
    "node_modules/**/*",
    "dist/**/*",
    "**/*.min.js"
  ],
  "maxFiles": 10,
  "maxFileSize": 50000,
  "focusAreas": ["security", "functionality", "performance", "style"],
  "model": "claude-3-haiku-20240307",
  "maxTokens": 4000,
  "temperature": 0.2,
  "preferCli": true,
  "saveResults": true,
  "outputFormat": "markdown"
}
```

## Git Hooks Integration

The Claude code review can also be integrated into your Git workflow through hooks:

### Pre-Commit Hook

To automatically review code changes during commits, Claude can be set up to run in a pre-commit hook:

```bash
# Set up the pre-commit hook for Claude code review
ai-coding-assistants-setup setup-husky
```

This will:
1. Install husky
2. Configure the necessary Git hooks
3. Enable Claude code reviews during the commit process

### Configuration for Hooks

You can customize the hook behavior by creating a configuration file at `.claude/review-hook-config.json`:

```json
{
  "verifyOnPreCommit": true,
  "verifyOnPrePush": false,
  "blockOnCritical": true,
  "blockOnHigh": false,
  "blockOnMedium": false,
  "maxFilesToReview": 5,
  "includedExtensions": [".js", ".jsx", ".ts", ".tsx"],
  "excludedPatterns": ["node_modules/", "dist/"],
  "model": "claude-3-haiku-20240307",
  "maxTokens": 4000,
  "temperature": 0.2,
  "focusAreas": ["security", "functionality", "performance", "style"]
}
```

## Understanding Review Results

Code review results include:

1. **Summary**: Overview of the entire codebase
2. **Issues Summary**: Count of issues by severity
3. **File Analysis**: For each file:
   - Overview of the file
   - List of issues found
   - Severity level (critical, high, medium, low)
   - Detailed description of each issue
   - Suggestions for resolving issues

## Issue Severity Levels

Issues are categorized into severity levels:

- **Critical**: Must be fixed immediately (security vulnerabilities, critical bugs)
- **High**: Should be addressed soon (potential bugs, significant issues)
- **Medium**: Should be considered (code smells, performance concerns)
- **Low**: Minor suggestions (style, readability improvements)

## Tips for Effective AI Code Reviews

1. **Be Specific**: Use include/exclude patterns to focus on relevant code
2. **Target Areas**: Use the `--focus` option to target specific concerns
3. **Review Regularly**: Integrate Claude reviews into your workflow
4. **Save Reviews**: Keep a record of reviews for tracking progress
5. **Combine with Other Tools**: Use alongside ESLint, Prettier, etc.

## Limitations

- Large codebases may need to be reviewed in chunks
- Very complex or domain-specific code might require more context
- Some false positives are possible, especially for unconventional patterns
- Requires Claude access (API key or CLI)

## Troubleshooting

If you encounter issues with Claude code reviews:

1. **API Key**: Ensure your Anthropic API key is set as `ANTHROPIC_API_KEY` in the environment
2. **File Size**: Very large files may be skipped due to token limits
3. **Output**: Review the `.claude/code-reviews/` directory for saved results
4. **Model**: Try different Claude models if needed