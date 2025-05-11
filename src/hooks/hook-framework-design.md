# Git Hook Framework Design

## Overview

This document outlines the design for a modular Git hook framework with Claude CLI integration. The framework will support seven Git hooks:

1. **prepare-commit-msg**: Generate commit messages based on staged changes
2. **commit-msg**: Validate commit message structure and content
3. **pre-push**: Perform security and quality audits before pushing
4. **post-merge**: Generate summaries of merged changes
5. **post-checkout**: Provide context when switching branches
6. **post-rewrite**: Generate summaries after rebase or amend operations
7. **pre-rebase**: Predict potential merge conflicts before rebasing
8. **branch-strategy** (already implemented): Enforce branch naming and workflow rules

## Architecture

The framework follows a modular design with these key components:

### 1. Base Hook Class (BaseHook)

The existing `BaseHook` class provides common functionality:
- Configuration management
- Git hook installation/removal
- Claude API integration
- Logging
- Error handling

### 2. Hook Registry (HookRegistry)

Manages hook registration, configuration, and execution:
- Dynamically loads hook implementations
- Manages hook configurations
- Provides hooks to the hook runner

### 3. Hook Runner (hook-runner.js)

Command-line executable called by Git hooks:
- Parses command-line arguments
- Loads the appropriate hook
- Executes the hook with provided arguments

### 4. Specific Hook Implementations

Each hook implements:
- Custom configuration options
- Hook-specific logic
- Claude prompt engineering
- Response parsing
- Fallback mechanisms

## Common Patterns

### Hook Configuration

Each hook will have:
- `enabled`: Boolean flag to enable/disable
- `blockingMode`: How to respond to issues ('block', 'warn', 'none')
- `strictness`: Level of strictness ('low', 'medium', 'high')
- Hook-specific configuration options

### Claude Integration

Each hook will implement:
1. **Prompt Generation**: Create tailored prompts for hook-specific tasks
2. **Response Parsing**: Extract relevant information from Claude responses
3. **Fallback Mechanisms**: Graceful degradation when Claude is unavailable

### Script Generation

Each hook will generate a shell script that:
1. Captures relevant Git information (branch, commit, etc.)
2. Calls the hook runner with appropriate arguments
3. Handles exit codes and error conditions

## Specific Hook Designs

### 1. prepare-commit-msg Hook

**Purpose**: Generate commit messages based on staged changes

**Configuration Options**:
- `mode`: 'suggest' or 'insert'
- `conventionalCommits`: Use conventional commit format
- `includeScope`: Include scope in conventional commits
- `includeBreaking`: Check for breaking changes
- `messageStyle`: 'concise' or 'detailed'

**Claude Integration**:
- Analyze diff of staged changes
- Generate appropriate commit message based on changes
- Follow conventional commit format if enabled

**Fallback**: Default to standard Git behavior if Claude unavailable

### 2. commit-msg Hook

**Purpose**: Validate commit message structure and content

**Configuration Options**:
- `conventionalCommits`: Enforce conventional commit format
- `checkSpelling`: Check for spelling errors
- `checkGrammar`: Check for grammar errors
- `maxLength`: Maximum length for subject/body
- `suggestImprovements`: Whether to suggest improvements

**Claude Integration**:
- Analyze commit message for compliance with standards
- Check for clarity, completeness, and adherence to conventions
- Provide suggestions for improvements

**Fallback**: Basic regex validation if Claude unavailable

### 3. pre-push Hook

**Purpose**: Perform security and quality audits before pushing

**Configuration Options**:
- `auditTypes`: Types of audits to perform ('security', 'credentials', 'sensitive-data', 'dependencies')
- `excludePatterns`: File patterns to exclude from audits
- `maxCommits`: Maximum number of commits to audit
- `maxDiffSize`: Maximum diff size to analyze

**Claude Integration**:
- Analyze outgoing commits for sensitive information
- Identify potential security issues
- Suggest remediation steps

**Fallback**: Basic pattern matching for sensitive data if Claude unavailable

### 4. post-merge Hook

**Purpose**: Generate summaries of merged changes

**Configuration Options**:
- `summaryFormat`: 'concise' or 'detailed'
- `includeStats`: Include file change statistics
- `includeDependencies`: Highlight dependency changes
- `includeBreakingChanges`: Highlight potential breaking changes
- `notifyMethod`: 'terminal', 'file', or 'notification'

**Claude Integration**:
- Analyze merged changes for impact and significance
- Provide human-readable explanation of changes
- Highlight areas requiring attention

**Fallback**: Basic git log summary if Claude unavailable

### 5. post-checkout Hook

**Purpose**: Provide context when switching branches

**Configuration Options**:
- `summaryFormat`: 'concise' or 'detailed'
- `includeStats`: Include file change statistics
- `skipInitialCheckout`: Skip on initial repository clone
- `skipTagCheckout`: Skip when checking out tags
- `notifyMethod`: 'terminal', 'file', or 'notification'

**Claude Integration**:
- Summarize branch state and recent activity
- Provide relevant information about checked-out branch
- Suggest next steps based on branch purpose

**Fallback**: Basic branch info if Claude unavailable

### 6. post-rewrite Hook

**Purpose**: Generate summaries after rebase or amend operations

**Configuration Options**:
- `summaryFormat`: 'concise' or 'detailed'
- `includeStats`: Include file change statistics
- `includeDependencies`: Highlight dependency changes
- `includeBreakingChanges`: Highlight potential breaking changes
- `notifyMethod`: 'terminal', 'file', or 'notification'

**Claude Integration**:
- Explain what changed during the rewrite
- Highlight potential issues from rewrite operation
- Provide guidance on next steps

**Fallback**: Basic git log summary if Claude unavailable

### 7. pre-rebase Hook

**Purpose**: Predict potential merge conflicts before rebasing

**Configuration Options**:
- `checkConflicts`: Check for potential merge conflicts
- `checkTestImpact`: Check for impact on tests
- `checkDependencies`: Check for dependency changes
- `blockOnSeverity`: Minimum severity to block rebase

**Claude Integration**:
- Analyze branches to identify potential conflict areas
- Suggest conflict resolution strategies
- Assess rebase complexity and risk

**Fallback**: Basic git diff analysis if Claude unavailable

## Setup Wizard

The hook setup wizard will:
1. Present each hook with a clear description
2. Allow users to selectively enable individual hooks
3. Provide configuration options for enabled hooks
4. Ensure explicit user consent before enabling any hook
5. Persist user selections between updates

## Implementation Plan

1. Update the Base Hook class with any missing common functionality
2. Implement each Git hook following the design patterns
3. Update hook registry to handle the new hooks
4. Implement Claude integration for each hook
5. Update setup wizard for hook enablement
6. Add comprehensive documentation