# Git Hooks Documentation

AI Coding Assistants Setup provides a powerful system of Git hooks that enhance your development workflow with AI-powered features and code quality checks.

## Overview

Git hooks are scripts that Git executes before or after events such as commit, push, and merge. AI Coding Assistants Setup configures these hooks to:

1. **Ensure code quality** - Run linting, type checking, and formatting
2. **Improve commit messages** - Validate or suggest commit messages
3. **Perform AI-powered reviews** - Analyze code for issues before committing
4. **Enforce branch naming** - Maintain consistent branch naming conventions

## Available Git Hooks

| Hook Type            | When It Runs                    | Purpose                                    |
| -------------------- | ------------------------------- | ------------------------------------------ |
| `pre-commit`         | Before a commit is created      | Run code quality checks and AI review      |
| `prepare-commit-msg` | Before commit message editor    | Generate/modify commit messages            |
| `commit-msg`         | After entering a commit message | Validate commit message format             |
| `post-commit`        | After a commit is created       | Store commit information in project memory |
| `pre-push`           | Before pushing to remote        | Final checks before sharing code           |
| `post-merge`         | After merge operations          | Update dependencies or run migrations      |

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

## Jira Integration

The `commit-msg` hook includes automatic Jira key detection and appending. When working on branches created from Jira, the hook will automatically append the Jira issue key to your commit messages.

### How It Works

1. **Branch Detection**: The hook examines your current branch name for Jira keys
2. **Key Extraction**: Extracts Jira keys in the format `PROJECT-123`
3. **Auto-Append**: Appends the key to your commit message as `[PROJECT-123]`

### Supported Branch Formats

The hook recognizes these branch naming patterns:

- `feat/SE-2397-implement-feature`
- `SE-2397-implement-feature`
- `chore/PROJ-123-update-dependencies`
- `fix/ABC-4567-resolve-bug`
- Any branch with `<TYPE>/<JIRA-KEY>-description`

### Configuration

You can customize the Jira project key pattern using the `JIRA_PROJECT_KEY` environment variable:

```bash
# Single project key
export JIRA_PROJECT_KEY="SE"

# Multiple project keys
export JIRA_PROJECT_KEY="SE|PROJ|ABC"

# Default (matches any 2-10 uppercase letters)
export JIRA_PROJECT_KEY="[A-Z]{2,10}"
```

Add this to your `.env` file for persistent configuration.

### Example

When on branch `feat/SE-2397-implement-login`:

```bash
git commit -m "feat: add user authentication"
# Result: "feat: add user authentication [SE-2397]"
```

The hook won't duplicate keys if they're already present in your message.

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

## Project Memory Hook

The `post-commit` hook includes a memory feature that stores information about each commit in a structured format. This creates a persistent memory that AI assistants can use to understand the project's history and development patterns.

### How Memory Works

After each commit, the hook:

1. Extracts commit information (message, author, date, hash)
2. Detects the conventional commit type (feat, fix, docs, etc.)
3. Creates a structured JSON representation of the commit
4. Adds a relation between the project and the commit
5. Stores this information in `.ai/memory.jsonl`

### Memory Format

The memory is stored in JSON Lines format compatible with Claude's MCP memory system:

```jsonl
{"type":"entity","name":"Commit:a1b2c3d4...","entityType":"Commit","observations":["[feat] Add new feature","Author: Jane Doe","Date: 2023-05-15 10:30:45"]}
{"type":"relation","from":"Project:my-project","to":"Commit:a1b2c3d4...","relationType":"HAS_COMMIT"}
```

### Benefits

This memory system provides several advantages:

1. **Persistent Context**: AI assistants can reference past commits and development patterns
2. **Project Understanding**: Creates a structured knowledge graph of the project's evolution
3. **Better Recommendations**: Enables AI to make more informed suggestions based on history
4. **MCP Integration**: Works with Claude's Model Control Panel memory system

### Configuration

The memory system is enabled by default with the post-commit hook. The memory file is stored at `.ai/memory.jsonl` in your project root. No additional configuration is needed.
