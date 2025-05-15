# Git Hooks with AI Coding Assistants

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Complete guide to intelligent Git hooks powered by Claude AI**

</div>

## 📑 Table of Contents

- [Overview](#-overview)
- [Available Hooks](#-available-hooks)
  - [Pre-Commit Hook](#pre-commit-hook)
  - [Prepare-Commit-Msg Hook](#prepare-commit-msg-hook)
  - [Commit-Msg Hook](#commit-msg-hook)
  - [Pre-Push Hook](#pre-push-hook)
  - [Post-Merge Hook](#post-merge-hook)
  <!-- The following hooks have been removed:
  - [Post-Checkout Hook](#post-checkout-hook)
  - [Post-Rewrite Hook](#post-rewrite-hook)
  - [Test-First Development Hook](#test-first-development-hook)
  -->
  - [Pre-Rebase Hook](#pre-rebase-hook)
  - [Branch-Strategy Hook](#branch-strategy-hook)
- [Setup and Configuration](#-setup-and-configuration)
  - [Initial Setup](#initial-setup)
  - [Configuration Templates](#configuration-templates)
  - [Manual Configuration](#manual-configuration)
  - [Configuration API](#configuration-api)
- [Hooks in Action](#-hooks-in-action)
  - [Hooks Execution Flow](#hooks-execution-flow)
  - [Command Line Arguments](#command-line-arguments)
  - [Environment Variables](#environment-variables)
- [Temporary Control](#-temporary-control)
  - [Bypassing Hooks](#bypassing-hooks)
  - [Selective Disabling](#selective-disabling)
  - [Environment Variables](#environment-variables-1)
- [Hooks Architecture](#-hooks-architecture)
  - [Hook Framework](#hook-framework)
  - [Middleware Pipeline](#middleware-pipeline)
  - [Claude Integration](#claude-integration)
  - [Fallback Mechanisms](#fallback-mechanisms)
- [Advanced Configuration](#-advanced-configuration)
  - [Complete Configuration Reference](#complete-configuration-reference)
  - [Environment-Specific Configuration](#environment-specific-configuration)
  - [Project-Specific Extensions](#project-specific-extensions)
- [Troubleshooting](#-troubleshooting)
  - [Common Issues](#common-issues)
  - [Diagnostic Commands](#diagnostic-commands)
  - [Debugging Techniques](#debugging-techniques)
- [Extending the Hook System](#-extending-the-hook-system)
  - [Creating Custom Hooks](#creating-custom-hooks)
  - [Custom Prompt Templates](#custom-prompt-templates)
  - [Hook Events](#hook-events)
- [Security Considerations](#-security-considerations)

## 🔍 Overview

The AI Coding Assistants Setup includes a comprehensive Git hook system that uses Claude AI to enhance your Git workflow. These hooks integrate directly into your Git processes to provide intelligent assistance at key points in your development workflow.

The hooks system offers:
- **AI-powered code reviews** before commits
- **Intelligent commit message generation** based on your changes
- **Quality validation** for commit messages and code
- **Security checks** to prevent credential leakage
- **Context awareness** of your project's standards
- **Seamless integration** with Claude AI

All hooks are designed to be:
- **Non-intrusive** - They help but don't get in the way
- **Configurable** - Adaptable to your team's workflow
- **Intelligent** - Leverages Claude AI for smart assistance
- **Resilient** - Handles gracefully when AI is unavailable
- **Extensible** - A framework you can extend for specific needs

## 📋 Available Hooks

### Pre-Commit Hook

The pre-commit hook runs before a commit is created and analyzes your staged changes for issues.

#### Features
- **Intelligent Code Review**: Claude analyzes your staged changes for bugs, security issues, and improvements
- **TypeScript Type Checking**: Validates TypeScript code for type errors (if TypeScript is detected)
- **Linting Integration**: Runs linters like ESLint to ensure code quality
- **Formatting Check**: Verifies code formatting matches project standards
- **Configurable Focus Areas**: Customize what types of issues to look for
- **Blocking or Advisory Mode**: Choose whether issues should block commits or just warn

#### Configuration Options

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "blockingMode": "warn",     // "block", "warn", or "none"
      "strictness": "medium",     // "low", "medium", or "high"
      "reviewTypes": [
        "bugs",                  // Look for logical errors and bugs
        "security",              // Check for security vulnerabilities
        "best-practices",        // Suggest code improvements
        "performance",           // Identify performance issues
        "style"                  // Check code style (beyond formatting)
      ],
      "fileLimit": 10,           // Maximum files to review
      "maxLineCount": 300,       // Maximum total lines to review
      "includeBinaryFiles": false,
      "includeGeneratedFiles": false,
      "ignorePatterns": [
        "**/*.min.js",
        "**/dist/**",
        "**/build/**"
      ],
      "claude": {
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.7,
        "useLocalBackend": false,
        "preferCli": true       // Use Claude CLI
        "localConfig": ".claude/pre-commit-config.json"
      }
    }
  }
}
```

#### Example Output

```
📝 Claude Code Review
-----------------------
Reviewing 3 files with 127 lines of code

src/utils/auth.js:
  🔴 Line 42: Potential security issue - Password is stored in plaintext.
     Consider using a secure hashing function like bcrypt.
  
  🟠 Line 56-58: Performance concern - This loop could be inefficient
     for large arrays. Consider using Array.prototype.find() instead.
  
  🟢 Best practice: Add input validation before processing user data

src/components/login.jsx:
  🟠 Line 15: The useState hook's default value is null but the value
     is later used without null checking.
  
  🟢 Clear and well-structured component. Good separation of concerns.

Review complete! 2 critical issues, 2 warnings, 2 suggestions.
Do you want to proceed with this commit? (y/n) 
```

### Prepare-Commit-Msg Hook

The prepare-commit-msg hook runs when Git creates a commit message template, and can automatically generate or enhance commit messages based on your changes.

#### Features
- **AI-Generated Commit Messages**: Creates descriptive commit messages based on your changes
- **Conventional Commits Format**: Structures messages using standard type/scope/description
- **Issue Reference Detection**: Automatically includes issue IDs from branch names
- **Breaking Change Detection**: Identifies and marks breaking changes
- **Multiple Modes**: Suggest mode (shows message but lets you edit) or Insert mode (directly inserts the message)
- **Templating Support**: Works with commit message templates

#### Configuration Options

```json
{
  "hooks": {
    "prepare-commit-msg": {
      "enabled": true,
      "mode": "suggest",         // "suggest", "insert", or "template"
      "conventionalCommits": true,
      "includeScope": true,
      "includeBreaking": true,
      "messageStyle": "detailed", // "concise" or "detailed"
      "extractIssueFromBranch": true,
      "issuePattern": "[A-Z]+-\\d+", // Regex for issue IDs
      "promptForBreaking": true, // Ask user if changes are breaking
      "promptForScope": false,   // Ask user for scope
      "claude": {
        "model": "claude-3-opus-20240229",
        "temperature": 0.5,
        "preferCli": true
      },
      "template": {
        "path": ".github/commit-template",
        "fillPlaceholders": true
      }
    }
  }
}
```

#### Example Output

```
📝 AI Commit Message Generator
------------------------------
Based on your changes, I suggest this commit message:

feat(auth): implement secure password reset flow

Add secure token-based password reset functionality with:
- Email delivery of single-use tokens
- Timed expiration (15 minutes)
- Rate limiting to prevent brute force attacks
- Comprehensive logging for audit trail

Closes PROJ-1234

Would you like to use this message? (y/n/e for edit) 
```

### Commit-Msg Hook

The commit-msg hook validates commit messages to ensure they follow project standards and best practices.

#### Features
- **Conventional Commits Validation**: Ensures commit messages follow the Conventional Commits format
- **Grammar and Spelling Check**: Identifies language issues in commit messages
- **Length Verification**: Checks subject and body length against standards
- **Issue Reference Validation**: Verifies issue references are properly formatted
- **Quality Suggestions**: Provides specific improvements for low-quality messages
- **Auto-Fix Option**: Can automatically correct common issues

#### Configuration Options

```json
{
  "hooks": {
    "commit-msg": {
      "enabled": true,
      "blockingMode": "block",   // "block", "warn", or "none"
      "conventionalCommits": true,
      "types": [
        "feat", "fix", "docs", "style", "refactor",
        "perf", "test", "build", "ci", "chore", "revert"
      ],
      "enforceCapitalization": "never-capitalize", // "capitalize", "never-capitalize", "ignore"
      "checkSpelling": true,
      "checkGrammar": true,
      "maxLength": {
        "subject": 72,
        "body": 100
      },
      "requireIssueRef": false,  // Require issue references
      "issueRefPattern": "#\\d+|[A-Z]+-\\d+",
      "autoFix": {
        "enabled": true,
        "capitalization": true,
        "punctuation": true,
        "typos": true
      },
      "claude": {
        "model": "claude-3-sonnet-20240229",
        "temperature": 0.3,
        "preferCli": true
      }
    }
  }
}
```

#### Example Output

```
🔍 Commit Message Validation
---------------------------
Validating commit message:

"FIX login page styling and add remeber me checkbox"

Issues found:
  ❌ Type should be lowercase: "FIX" -> "fix"
  ❌ Spelling error: "remeber" -> "remember"

Suggested message:
  fix: login page styling and add remember me checkbox

Would you like to use the suggested message? (y/n) 
```

### Pre-Push Hook

The pre-push hook runs before pushing commits to a remote repository, providing security checks and final validations.

#### Features
- **Security Scanning**: Checks for accidentally committed secrets, API keys, and credentials
- **Large File Detection**: Prevents pushing large binary files
- **Test Validation**: Can run tests before allowing the push
- **Branch Restriction**: Enforces rules about which branches can be pushed to
- **Review Enforcement**: Ensures code has been reviewed if required

#### Configuration Options

```json
{
  "hooks": {
    "pre-push": {
      "enabled": true,
      "blockingMode": "block",   // "block", "warn", or "none"
      "securityScan": {
        "enabled": true,
        "scanSecrets": true,
        "scanApiKeys": true,
        "scanCredentials": true,
        "customPatterns": [],    // Additional regex patterns to check
        "ignorePaths": ["**/test/fixtures/**"],
        "allowedSecretsFile": ".allowed-secrets"
      },
      "fileSizeLimits": {
        "enabled": true,
        "maxSize": "5MB",
        "checkBinaryOnly": true
      },
      "branchRestrictions": {
        "enabled": true,
        "protectedBranches": ["main", "master", "release/*"],
        "releasePattern": "^release\\/v\\d+\\.\\d+\\.\\d+$",
        "developmentPattern": "^(feature|bugfix|hotfix)\\/.*$"
      },
      "runTests": {
        "enabled": false,
        "command": "npm test",
        "timeout": 60000
      },
      "claude": {
        "enabled": true,
        "model": "claude-3-sonnet-20240229",
        "preferCli": true,
        
      }
    }
  }
}
```

#### Example Output

```
🔒 Pre-Push Security Check
------------------------
Scanning commits for sensitive information...

⚠️ Potential API key found in src/config/api.js (line 12):
  apiKey: "ak_test_51KdG..."

⚠️ Possible password in src/utils/test-helpers.js (line 45):
  const testPassword = "TestP@ssw0rd123"

Push blocked due to security concerns. 
Please remove sensitive information before pushing.
```

### Post-Merge Hook

The post-merge hook runs after a merge or pull operation completes, providing summaries of incoming changes.

#### Features
- **Merge Summary**: Provides a concise summary of what was merged
- **Dependency Analysis**: Highlights changes to dependencies and package files
- **Breaking Change Alerts**: Identifies potentially breaking changes
- **Task/Issue Updates**: Updates task status if merge completes associated work
- **Environment Changes**: Notifies about environment variable or config changes

#### Configuration Options

```json
{
  "hooks": {
    "post-merge": {
      "enabled": true,
      "summaryFormat": "detailed", // "concise" or "detailed"
      "includeStats": true,        // Include file statistics
      "includeDependencies": true, // Highlight package.json changes
      "detectBreakingChanges": true,
      "notificationMethod": "terminal", // "terminal", "file", or "notification"
      "includeCommits": true,      // Include commit messages in summary
      "maxCommits": 5,             // Maximum commits to show
      "highlightFiles": [          // Files to always highlight in summary
        "package.json",
        ".env.example",
        "docker-compose.yml",
        "schema.prisma"
      ],
      "claude": {
        "enabled": true,
        "model": "claude-3-haiku-20240307",
        "preferCli": true,
        
      }
    }
  }
}
```

#### Example Output

```
🔄 Merge Summary
---------------
Branch 'feature/user-onboarding' was merged into 'develop'

📊 Stats: 7 files changed, 145 additions, 23 deletions

🔑 Key Changes:
- New user onboarding flow implemented
- Email verification now required for signup
- Welcome email template added

📦 Dependencies:
- Added: nodemailer@6.9.1
- Updated: react from 18.1.0 to 18.2.0

⚠️ Important Changes:
- The .env file needs new MAIL_* variables
- Database migration required (added email_verified field)

For details, see 5 commits including:
- feat(auth): implement email verification (ab34f91)
- feat(email): add welcome email template (c72e9b3)
```

<!-- Post-Checkout Hook section has been removed -->

<!-- Post-Rewrite Hook section has been removed -->

### Pre-Rebase Hook

The pre-rebase hook runs before a rebase operation starts, predicting potential conflicts and issues.

#### Features
- **Conflict Prediction**: Analyzes potential merge conflicts before they happen
- **Test Impact Analysis**: Checks if rebasing might break tests
- **Dependency Conflict Check**: Identifies package dependency conflicts
- **Semantic Versioning Validation**: Ensures version changes follow SemVer

#### Configuration Options

```json
{
  "hooks": {
    "pre-rebase": {
      "enabled": true,
      "blockingMode": "warn",   // "block", "warn", or "none"
      "checkConflicts": true,
      "checkTestImpact": false,
      "checkDependencies": true,
      "blockOnSeverity": "high", // "critical", "high", "medium", "low", "none"
      "claude": {
        "enabled": true,
        "model": "claude-3-sonnet-20240229",
        "preferCli": true,
        
      }
    }
  }
}
```

#### Example Output

```
⚠️ Pre-Rebase Analysis
--------------------
Analyzing rebase of feature/auth onto develop...

Potential Conflicts:
- src/services/auth.js: Both branches modify the same functions (high risk)
- src/models/user.js: Schema changes may conflict (medium risk)

Dependency Analysis:
- Both branches modify package.json
- develop updates react-router to v6, your branch uses v5 APIs

Test Impact:
- Authentication tests may break due to API changes in develop

Proceed with rebase? (y/n)
```

### Branch-Strategy Hook

The branch-strategy hook enforces branch naming conventions and workflow rules, ensuring consistent branching practices.

#### Features
- **Branch Naming Enforcement**: Ensures branches follow naming conventions
- **Workflow Validation**: Enforces correct branch sources and targets
- **JIRA/GitHub Issue Verification**: Validates issue references in branch names
- **AI-Powered Branch Validation**: Uses Claude to validate branch purpose
- **Protected Branch Rules**: Prevents direct work on protected branches

#### Configuration Options

```json
{
  "hooks": {
    "branch-strategy": {
      "enabled": true,
      "strategyType": "gitflow", // "gitflow", "trunk", "github-flow", or "custom"
      "blockingMode": "warn",    // "block", "warn", or "none"
      "branchPrefixes": {
        "feature": "feature/",
        "bugfix": "bugfix/",
        "hotfix": "hotfix/",
        "release": "release/",
        "support": "support/"
      },
      "mainBranches": ["main", "master", "dev", "staging"],
      "protectedBranches": ["main", "master", "staging", "dev", "release/*"],
      "releasePattern": "^release\\/v?(\\d+\\.\\d+\\.\\d+)$",
      "validateWithClaude": true,
      "jiraIntegration": true,
      "jiraPattern": "[A-Z]+-\\d+",
      "customRules": [],
      "claude": {
        "model": "claude-3-haiku-20240307",
        "preferCli": true,
        
      }
    }
  }
}
```

#### Example Output

```
🔍 Branch Strategy Validation
--------------------------
Checking branch: feature/add-user-profile

✅ Branch prefix is valid: feature/
✅ Branch contains valid issue reference: USER-123
✅ Branch purpose is clear and specific
✅ Branch is based on correct parent: develop

Branch validation passed!
```

<!-- Test-First Development Hook section has been removed -->

## 🔧 Setup and Configuration

### Initial Setup

The Git hooks are automatically configured during the setup process when you run:

```bash
npx ai-coding-assistants-setup
```

The setup wizard will:
1. Detect your project's capabilities (TypeScript, linting, etc.)
2. Recommend appropriate hooks based on your stack
3. Guide you through hook configuration
4. Install the configured hooks into your Git repository

### Configuration Templates

You can use predefined configuration templates to quickly set up hooks:

```bash
npx ai-coding-assistants-setup --hooks --template standard
```

Available templates:

| Template | Description | Included Hooks |
|----------|-------------|----------------|
| **minimal** | Essential hooks only | commit-msg |
| **standard** | Recommended set of hooks | prepare-commit-msg, commit-msg, post-merge, post-checkout |
| **strict** | Comprehensive hooks with strict validation | All hooks with blocking mode |
| **custom** | Select specific hooks | User-selected hooks |

### Manual Configuration

For more control, you can manually configure hooks:

```bash
npx ai-coding-assistants-setup --hooks
```

This will launch the hook configuration wizard that lets you select and customize Git hooks.

You can also directly edit the configuration file at `.claude/hooks.json`:

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      // hook-specific configuration
    },
    "commit-msg": {
      "enabled": true,
      // hook-specific configuration
    },
    // other hooks...
  },
  "global": {
    "claude": {
      "preferCli": true,
      
      "defaultModel": "claude-3-sonnet-20240229"
    },
    "logging": {
      "level": "info",
      "file": ".claude/logs/hooks.log"
    }
  }
}
```

### Configuration API

You can programmatically manage hook configurations using the provided JavaScript API:

```javascript
import { 
  enableHook, 
  disableHook, 
  updateHookConfig, 
  applyHookTemplate 
} from './hooks/config-manager.js';

// Enable a specific hook
await enableHook({ 
  projectRoot: '.', 
  hookId: 'commit-msg' 
});

// Update hook configuration
await updateHookConfig({
  projectRoot: '.',
  hookId: 'pre-commit',
  hookConfig: {
    blockingMode: 'warn',
    strictness: 'medium'
  }
});

// Apply a configuration template
await applyHookTemplate({ 
  projectRoot: '.', 
  template: 'standard' 
});
```

## 🔄 Hooks in Action

### Hooks Execution Flow

When a Git action triggers a hook, the following process occurs:

1. **Hook Initialization**:
   - Git calls the appropriate hook script
   - The hook script loads its configuration
   - The hook determines if it should run based on enabled status

2. **Pre-Processing**:
   - The hook gathers necessary context (changed files, branch info, etc.)
   - Middleware registered for the "before_execution" phase runs

3. **Core Execution**:
   - If Claude integration is enabled, the hook prepares input for Claude
   - The hook calls Claude via CLI or runs without AI if unavailable
   - The hook processes Claude's response

4. **Post-Processing**:
   - Middleware registered for the "after_execution" phase runs
   - The hook formats output for the user
   - The hook determines whether to allow or block the Git action

5. **Error Handling**:
   - If errors occur, the "error" phase middleware runs
   - The hook decides how to handle the error based on configuration

### Command Line Arguments

Hooks can receive additional arguments through command-line flags when running Git commands:

```bash
# Run with increased strictness
git commit --hook-strictness=high

# Change blocking mode for a single operation
git commit --hook-blocking=warn

# Specify a different Claude model
git commit --hook-model=claude-3-opus-20240229

# Skip Claude CLI calls but still run the hook
git commit --hook-no-claude
```

### Environment Variables

Hooks can be controlled through environment variables:

```bash
# Set global Claude model
export CLAUDE_HOOK_MODEL="claude-3-opus-20240229"

# Set global blocking mode
export CLAUDE_HOOK_BLOCKING="warn"

# Set global strictness
export CLAUDE_HOOK_STRICTNESS="high"

# Disable Claude integration globally
export CLAUDE_HOOK_NO_CLAUDE=true
```

## 🛑 Temporary Control

### Bypassing Hooks

You can temporarily bypass all Git hooks using Git's `--no-verify` flag:

```bash
git commit --no-verify
git push --no-verify
```

This skips all hooks, so use with caution.

### Selective Disabling

You can selectively disable specific hooks using environment variables:

```bash
CLAUDE_SKIP_COMMIT_MSG=true git commit -m "Skip commit message validation"
CLAUDE_SKIP_PRE_PUSH=true git push
```

### Environment Variables

The following environment variables can be used to control hooks:

| Variable | Purpose | Example |
|----------|---------|---------|
| `CLAUDE_SKIP_PRE_COMMIT=true` | Skip pre-commit hook | `CLAUDE_SKIP_PRE_COMMIT=true git commit` |
| `CLAUDE_SKIP_PREPARE_COMMIT_MSG=true` | Skip prepare-commit-msg hook | `CLAUDE_SKIP_PREPARE_COMMIT_MSG=true git commit` |
| `CLAUDE_SKIP_COMMIT_MSG=true` | Skip commit-msg hook | `CLAUDE_SKIP_COMMIT_MSG=true git commit -m "message"` |
| `CLAUDE_SKIP_PRE_PUSH=true` | Skip pre-push hook | `CLAUDE_SKIP_PRE_PUSH=true git push` |
| `CLAUDE_SKIP_POST_MERGE=true` | Skip post-merge hook | `CLAUDE_SKIP_POST_MERGE=true git pull` |
| `CLAUDE_SKIP_PRE_REBASE=true` | Skip pre-rebase hook | `CLAUDE_SKIP_PRE_REBASE=true git rebase` |
| `CLAUDE_SKIP_BRANCH_STRATEGY=true` | Skip branch-strategy hook | `CLAUDE_SKIP_BRANCH_STRATEGY=true git checkout -b branch` |
| `CLAUDE_DEBUG=true` | Enable debug logging | `CLAUDE_DEBUG=true git commit` |
| `CLAUDE_USE_CLI=false` | Disable Claude CLI | `CLAUDE_USE_CLI=false git commit` |

<!-- The following environment variables have been removed:
- `CLAUDE_SKIP_POST_CHECKOUT=true` - Skip post-checkout hook - Was used as: `CLAUDE_SKIP_POST_CHECKOUT=true git checkout branch`
- `CLAUDE_SKIP_POST_REWRITE=true` - Skip post-rewrite hook - Was used as: `CLAUDE_SKIP_POST_REWRITE=true git rebase`
- `CLAUDE_SKIP_TEST_FIRST=true` - Skip test-first hook - Was used as: `CLAUDE_SKIP_TEST_FIRST=true git add newfile.js`
-->

## 🏗️ Hooks Architecture

### Hook Framework

The Git hooks system is built on a flexible framework that standardizes hook development:

```
┌───────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    BaseHook Class     │────▶│   Specific Hooks    │────▶│ Hook Implementation │
└───────────────────────┘     └─────────────────────┘     └─────────────────────┘
         ▲                              │                          │
         │                              │                          │
         │                              ▼                          ▼
┌───────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Hook Registry       │◀────│  Middleware System  │◀────│   Claude Client     │
└───────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

All hooks extend the `BaseHook` class, which provides:
- Common hook lifecycle management
- Configuration loading
- Claude integration
- Middleware pipeline
- Logging and error handling

### Middleware Pipeline

Hooks use a middleware system that allows for extending functionality at different lifecycle phases:

```javascript
// Example middleware that measures hook execution time
const timingMiddleware = async (context, next) => {
  const startTime = Date.now();
  
  try {
    // Call the next middleware in the pipeline
    await next();
  } finally {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`Hook ${context.hookId} executed in ${duration}ms`);
  }
};

// Register middleware for a specific hook
hook.use(HookLifecycle.BEFORE_EXECUTION, timingMiddleware);
```

Middleware phases:
- `BEFORE_EXECUTION`: Runs before the hook's main execution
- `EXECUTION`: The hook's main execution phase
- `AFTER_EXECUTION`: Runs after the hook's main execution
- `ERROR`: Handles errors during hook execution

### Claude Integration

Hooks integrate with Claude through the Claude CLI:

- Uses the locally installed Claude CLI
- Requires `claude login` to be run
- Fast and efficient for hook operations
- No API key management needed

### Fallback Mechanisms

Hooks are designed to be resilient:

1. If Claude CLI is unavailable:
   - Use built-in rules without AI
   - Continue operation with limited functionality

2. If network issues prevent Claude access:
   - Hooks can run in degraded mode with limited functionality
   - Critical hooks like commit-msg can still validate using regex patterns
   - Non-critical hooks like post-checkout can be skipped

3. If configuration is missing:
   - Default configurations are used
   - Sensible defaults ensure hooks still function

## 📝 Advanced Configuration

### Complete Configuration Reference

The complete `.claude/hooks.json` configuration supports:

```json
{
  "hooks": {
    "pre-commit": {/* hook-specific config */},
    "prepare-commit-msg": {/* hook-specific config */},
    "commit-msg": {/* hook-specific config */},
    "pre-push": {/* hook-specific config */},
    "post-merge": {/* hook-specific config */},
    // The following hooks have been removed:
    // "post-checkout": {/* hook-specific config */},
    // "post-rewrite": {/* hook-specific config */},
    "pre-rebase": {/* hook-specific config */},
    "branch-strategy": {/* hook-specific config */}
    // "test-first-development": {/* hook-specific config */}
  },
  "global": {
    "enabled": true,
    "blockingMode": "warn",
    "claude": {
      "preferCli": true,
      
      "defaultModel": "claude-3-sonnet-20240229",
      "temperature": 0.7,
      "maxTokens": 4000,
      
    },
    "logging": {
      "level": "info",
      "file": ".claude/logs/hooks.log",
      "console": true
    },
    "templateDir": ".claude/templates",
    "ignorePatterns": [
      "node_modules/**",
      "dist/**",
      "build/**",
      "**/*.min.js"
    ],
    "commandLineArguments": true,
    "environmentVariables": true
  }
}
```

Each hook's configuration extends the global configuration with hook-specific settings.

### Environment-Specific Configuration

You can create environment-specific configurations using Git's conditional includes:

```ini
# In .git/config
[includeIf "gitdir:~/work/"]
  path = ~/.gitconfig-work

# In ~/.gitconfig-work
[claude-hooks]
  configPath = ~/.claude/hooks-work.json
```

This allows different hook configurations for different environments (work, personal, etc.).

### Project-Specific Extensions

For advanced projects, you can extend the hook system with project-specific hooks:

1. Create a `.claude/hooks/` directory in your project
2. Add your custom hook implementations (following the BaseHook pattern)
3. Register your hooks in a `.claude/hooks/index.js` file:

```javascript
import { registerHook } from '../hook-registry.js';
import CustomHook from './custom-hook.js';

// Register your custom hook
registerHook('custom', CustomHook);

// Export any additional utilities
export { CustomHook };
```

## 🔍 Troubleshooting

### Common Issues

#### Claude CLI Setup

The hooks system uses Claude CLI. This behavior can be configured:

- Set `preferCli: false` in hook configuration to disable CLI for a specific hook
- Set environment variable `CLAUDE_USE_CLI=false` to disable CLI for all hooks

When Claude CLI is not available, hooks will use built-in rules and provide more limited functionality.

#### Hook Not Executing

If a hook isn't executing:

1. Check that the hook is enabled in the hook configuration
2. Ensure the hook script is executable (`chmod +x .git/hooks/pre-commit`)
3. Verify that Git hooks are not disabled globally

#### Connection Issues

If you see connection issues:

1. Check your internet connection
2. Verify that Claude CLI is properly installed and logged in
3. Check Claude service status

### Diagnostic Commands

To troubleshoot Git hooks issues, you can use these commands:

```bash
# List Git hooks directory contents
ls -la .git/hooks/

# Check hook executable permissions
ls -la .git/hooks/commit-msg

# Make hook script executable
chmod +x .git/hooks/commit-msg

# View hook script contents
cat .git/hooks/commit-msg

# Run hook manually
.git/hooks/pre-commit

# Check Claude CLI installation
which claude
claude --version

# Run with debug logging
CLAUDE_DEBUG=true git commit
```

### Debugging Techniques

For more in-depth debugging:

1. **Enable Debug Mode**:
   ```bash
   CLAUDE_DEBUG=true git commit
   ```
   This will produce verbose logs in `.claude/logs/hooks.log`.

2. **Inspect Hook Scripts**:
   ```bash
   cat .git/hooks/pre-commit
   ```
   Ensure the script is correct and points to the right locations.

3. **Check Configuration**:
   ```bash
   cat .claude/hooks.json
   ```
   Verify your configuration is correct.

4. **Test Claude CLI**:
   ```bash
   claude "Hello, world!"
   ```
   Ensure Claude CLI is working properly.

## 🔧 Extending the Hook System

### Creating Custom Hooks

You can extend the hook system with custom hooks by:

1. Creating a new hook class that extends `BaseHook`
2. Implementing the `execute()` method
3. Registering the hook in the hook registry

Example:

```javascript
import { BaseHook } from './base-hook.js';
import { HookLifecycle } from './hook-lifecycle.js';

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
    const [oldRef, newRef, checkoutType] = args;
    
    // Example: Do something special when switching to the main branch
    if (await this.getCurrentBranch() === 'main') {
      console.log('Switched to main branch, running additional setup...');
      // Your custom logic here
    }
    
    return { success: true };
  }
}

export default MyCustomHook;
```

To register the hook:

```javascript
import { registerHook } from './hook-registry.js';
import MyCustomHook from './my-custom-hook.js';

registerHook('my-custom', MyCustomHook);
```

### Custom Prompt Templates

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

### Hook Events

Hooks emit events that you can listen to:

```javascript
import { getHook } from './hook-registry.js';

const preCommitHook = getHook('pre-commit');

// Listen for pre-commit events
preCommitHook.on('pre-commit:start', (data) => {
  console.log('Pre-commit hook started');
});

preCommitHook.on('pre-commit:complete', (data) => {
  console.log('Pre-commit hook completed with result:', data.result);
});

preCommitHook.on('pre-commit:error', (data) => {
  console.error('Pre-commit hook error:', data.error);
});
```

You can use these events to integrate hooks with other systems, like notifications or logging.

## 🔐 Security Considerations

When using Git hooks with Claude integration, keep these security considerations in mind:

- **Code Sharing**: The hooks send portions of your code to Claude for analysis. Ensure no sensitive information is shared.
- **API Keys**: Keep your Anthropic API keys secure and never commit them to version control.
- **Shell Command Execution**: Some hooks may execute shell commands. Review hook code to ensure it doesn't run malicious commands.
- **Hook Bypass**: Remember that `--no-verify` can bypass hooks, so don't rely on them for critical security.
- **Hook Script Integrity**: Ensure your hook scripts haven't been tampered with, especially in shared repositories.
- **PII Detection**: The pre-push hook can check for potential PII (personally identifiable information) before code is pushed.
- **Credential Scanning**: Enable security scanning in pre-push hooks to prevent accidental credential leakage.

By default, hooks are configured with security in mind, but it's always good to review their behavior and configuration for your specific needs.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](../LICENSE.md) file for details.

---

<div align="center">
Made with ❤️ by the AI Coding Assistants Setup team
</div>