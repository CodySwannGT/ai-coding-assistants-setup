# Git Hooks Documentation

AI Coding Assistants Setup provides a powerful system of Git hooks that enhance your development workflow with AI-powered features and code quality checks.

## Overview

Git hooks are scripts that Git executes before or after events such as commit, push, and merge. AI Coding Assistants Setup configures these hooks to:

1. **Ensure code quality** - Run linting, type checking, and formatting
2. **Improve commit messages** - Validate or suggest commit messages
3. **Perform AI-powered reviews** - Analyze code for issues before committing
4. **Enforce branch naming** - Maintain consistent branch naming conventions

## Available Git Hooks

| Hook Type | When It Runs | Purpose |
|-----------|--------------|---------|
| `pre-commit` | Before a commit is created | Run code quality checks and AI review |
| `prepare-commit-msg` | Before commit message editor | Generate/modify commit messages |
| `commit-msg` | After entering a commit message | Validate commit message format |
| `pre-push` | Before pushing to remote | Final checks before sharing code |
| `post-merge` | After merge operations | Update dependencies or run migrations |

## AI-Enhanced Capabilities

Our Git hooks are enhanced with AI capabilities:

1. **AI Code Review** - Claude analyzes staged changes for:
   - Bugs and logical errors
   - Performance issues
   - Security vulnerabilities
   - Code smells and maintainability concerns
   - Style and convention violations

2. **AI Commit Messages** - Generate descriptive, conventional commit messages based on your changes

3. **AI Diff Explanations** - Get natural language explanations of changes

## Configuration

Git hooks can be configured through the `.claude/settings.json` file:

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "ai_review": true,
      "check_types": true,
      "lint": true,
      "format": true,
      "strictness": "medium"
    },
    "prepare-commit-msg": {
      "enabled": true,
      "ai_generated": true,
      "conventional_commits": true
    },
    "commit-msg": {
      "enabled": true,
      "validate_format": true,
      "suggest_improvements": true
    }
  }
}
```

## Setting Up Git Hooks

The AI Coding Assistants Setup tool automatically:

1. Sets up Husky to manage Git hooks
2. Creates hook scripts in the `.husky` directory
3. Configures the necessary dependencies
4. Ensures hooks are executable

## Example: AI Code Review

The AI code review in the pre-commit hook:

1. Captures staged changes with `git diff --staged`
2. Sends the diff to Claude for analysis
3. Receives a detailed report of potential issues
4. Decides whether to allow or block the commit based on severity

Example output:

```
🤖 AI Code Review Results:

✅ No critical issues found
⚠️ 2 warnings and 1 suggestion detected:

Warning: Potential null reference in user.service.ts:45
  The 'user' object might be null when accessing user.preferences

Warning: Inefficient query in database.js:128
  The query uses nested loops which could be optimized with a join

Suggestion: Consider adding error handling in api.js:67
  This HTTP request lacks error handling for network failures

Do you want to commit anyway? [y/N]
```

## Example: AI Commit Message

The AI-generated commit messages in the prepare-commit-msg hook:

1. Analyzes the staged changes
2. Extracts the purpose and impact of the changes
3. Generates a conventional commit message
4. Allows you to edit it before finalizing

Example generated message:

```
feat(user-auth): implement password reset functionality

- Add password reset form component
- Create email notification service
- Set up expiring reset tokens
- Update user documentation
```

## Best Practices

1. **Keep hooks fast** - Long-running hooks can disrupt your workflow
2. **Avoid duplicate checks** - Don't run the same checks in multiple hooks
3. **Use non-blocking mode** - For AI reviews, use warning mode instead of blocking
4. **Configure strictness levels** - Adjust AI review strictness based on project needs
5. **Ensure CI alignment** - Keep hook checks consistent with CI/CD pipeline checks

## Troubleshooting

### Skipping Hooks

To bypass hooks temporarily:

```bash
git commit --no-verify -m "Your message"
```

### Common Issues

1. **Slow AI reviews**: Reduce the scope of AI reviews or change strictness level
2. **False positives**: Adjust the AI review settings or modify the prompt
3. **Hook execution failures**: Check permissions and paths in hook scripts
4. **Missing dependencies**: Ensure all required packages are installed