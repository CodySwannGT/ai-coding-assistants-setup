# Branching Strategy Enforcement

The AI Coding Assistants Setup includes a powerful branching strategy enforcement system that helps teams follow consistent branching conventions and workflows. This document explains how to configure and use the branch strategy hook.

## Overview

The branch strategy hook is installed as a pre-push hook and validates that your branches follow the chosen branching workflow. It can:

- Enforce branch naming conventions based on the selected strategy
- Validate workflow rules (e.g., which branches can merge into which)
- Protect specific branches from direct pushes
- Use Claude AI to validate branch purpose based on name and commits
- Enforce JIRA ticket IDs in branch names
- Apply custom rules for organization-specific requirements

## Supported Branching Strategies

The hook supports several common branching strategies out of the box:

### GitFlow

GitFlow is a branching model that uses multiple long-lived branches and specific branch naming conventions. The GitFlow strategy enforces:

- Feature branches start with `feature/`
- Bugfix branches start with `bugfix/`
- Hotfix branches start with `hotfix/`
- Release branches start with `release/`
- Support branches start with `support/`
- Feature branches should merge into `develop`, not directly into `main`
- Release branches can only merge into `main`/`master` and `develop`
- Hotfix branches can merge into `main`/`master` and `develop`

### Trunk-Based Development

Trunk-based development uses a single main branch (trunk) with short-lived feature branches. The trunk-based strategy enforces:

- Branches should be short-lived (< 7 days by default)
- Branches should use descriptive names (e.g., `feature/add-login`, `fix/broken-navbar`)
- Branch names should include developer username
- All branches merge back to trunk (typically `main` or `master`)

### GitHub Flow

GitHub Flow is a simpler branching strategy focusing on feature branches directly off the main branch. The GitHub Flow strategy enforces:

- Branch names should be descriptive and include a category (e.g., `feature/add-login`)
- All branches merge to `main`/`master`
- Branch names follow a pattern that indicates purpose

### Custom Strategy

You can define your own custom branching strategy with specific rules for:

- Branch naming patterns
- Target branch restrictions
- Age limits for branches
- Required files or content
- Custom command-based validation
- Protected branch rules

## Configuration

### Basic Configuration

The branch strategy hook can be configured through the CLI setup wizard by running:

```bash
npx claude-setup hooks
```

Select "Branching Strategy Enforcement" from the list of available hooks to enable and configure it.

### Custom Rules

For custom strategies, you can define specific rules in the `customRules` array:

```json
"customRules": [
  {
    "type": "naming",
    "pattern": "^(feature|fix|chore|docs)/[a-z0-9-]+$",
    "message": "Branch names must start with feature/, fix/, chore/, or docs/ followed by lowercase letters, numbers, or hyphens"
  },
  {
    "type": "workflow",
    "branchPattern": "^feature/.*",
    "targetBranch": ["develop"],
    "message": "Feature branches must only merge into develop"
  },
  {
    "type": "workflow",
    "branchPattern": ".*",
    "maxAge": 14,
    "message": "Branches should not be older than 14 days"
  },
  {
    "type": "fileCheck",
    "branchPattern": "^feature/.*",
    "file": "CHANGELOG.md",
    "content": "## Unreleased",
    "message": "Feature branches should update the CHANGELOG.md file"
  },
  {
    "type": "command",
    "branchPattern": ".*",
    "command": "npm test",
    "expectedOutput": "PASS",
    "message": "All tests must pass before pushing"
  }
]
```

## Claude AI Integration

When `validateWithClaude` is enabled, the hook will use Claude AI to analyze branch names and commit messages to validate that the branch purpose is clear and follows best practices. This provides more sophisticated validation beyond simple pattern matching.

Claude can offer suggestions for better branch names and identify issues that might not be caught by rule-based validation.

## JIRA Integration

When `jiraIntegration` is enabled, branches must include a valid JIRA ticket ID according to the specified pattern. This helps link branches to specific tickets in your issue tracking system.

## Protected Branches

Protected branches have special rules:

- They may be restricted to certain users
- They may require code reviews before pushing
- They may require all tests to pass before pushing

These protections help prevent accidental changes to important branches.

## Blocking vs. Warning Mode

The hook can operate in three modes:

- **Block**: Prevent pushes that violate the branching strategy rules
- **Warn**: Show warnings but allow the push to proceed
- **None**: Just provide information, no warnings or blocking

This allows you to enforce rules strictly or gradually adopt the branching strategy.

## Customizing Branch Prefixes and Patterns

You can customize the branch prefixes used for GitFlow or the patterns used for branch validation. This allows you to adapt the strategy to your team's existing conventions.

## Additional Notes

- The hook uses Claude CLI for enhanced validation when available
- Custom rules provide extensive flexibility for organization-specific needs
- Branch age validation helps encourage short-lived feature branches
- Protected branch rules help prevent accidental changes to important branches