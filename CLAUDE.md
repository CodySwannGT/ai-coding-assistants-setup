# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Coding Assistants Setup is a tool that streamlines the integration of AI coding assistants (like Claude Code and Roo Code) into development workflows. This tool automates configuration file management, sets up git hooks for AI-powered quality checks, and enhances development experience with intelligent AI capabilities.

## Common Commands

### Build and Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode (with ts-node)
npm run dev

# Start the built application
npm run start
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx jest path/to/test-file.test.ts
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Linting with auto-fixes
npm run lint:fix

# Code formatting
npm run format

# Check formatting without changing files
npm run format:check
```

## Architecture Overview

This project is built using TypeScript and follows a modular structure:

1. **Commands Layer**: CLI command implementations in `src/commands/`
   - Each command handles a specific feature like code-review, config management

2. **Configuration Management**: Utilities in `src/config/`
   - Handles environment, paths, and MCP (Model Control Panel) configurations
   - Schema validation for configuration files

3. **Git Hooks System**: Tools in `src/hooks/`
   - Git hook implementation for pre-commit, commit-msg, etc.
   - AI-powered code review integration

4. **Integrations**: External system connections in `src/integrations/`
   - Claude API integrations
   - Diff explanation functionality
   - Code review implementation

5. **Utilities**: Shared helpers in `src/utils/`
   - File and configuration merging
   - Project structure detection
   - Setup wizards for TypeScript, linting, GitHub Actions

## Key Features

1. **File Merging**: The system can intelligently merge configuration files, handling conflicts between the parent project and AI tool configurations.
   - `ConfigMerger` handles JSON, YAML, and other config formats
   - `FileMerger` provides basic file merging capabilities

2. **Git Hooks**: AI-powered hooks that enhance the development workflow:
   - Pre-commit hooks for code quality checks
   - Commit message validation and generation
   - AI-powered code reviews

3. **MCP Configuration**: Support for Model Control Panel servers:
   - Configuration generation and validation
   - Local and shared configuration management

4. **TypeScript Setup**: Utilities for configuring TypeScript in projects:
   - Auto-detection of project type (React, Node.js, etc.)
   - Integration with ESLint and other tools

## Project Structure

The main project structure:

- `src/` - Source code
  - `commands/` - CLI command implementations
  - `config/` - Configuration management
  - `hooks/` - Git hook implementations
  - `integrations/` - External system integrations
  - `templates/` - Template files for setup
  - `utils/` - Utility functions and helpers

- `tests/` - Test files
  - `fixtures/` - Test fixtures
  - `utils/` - Test utilities

- `docs/` - Documentation files

## Configuration Files

The tool works with several configuration files:

1. **Tool Configurations**:
   - `.claude/settings.json` - Claude configuration
   - `.roo/settings.json` - Roo configuration
   - `.mcp.json` - MCP server configuration

2. **Project Configurations**:
   - `package.json` - Node.js project configuration
   - `tsconfig.json` - TypeScript configuration
   - `.eslintrc.json` - ESLint configuration

3. **Git Hook Configurations**:
   - `.husky/` - Git hook scripts
   - Commit message templates and validation rules

## Testing Strategy

The project uses Jest for testing:

1. Unit tests for individual functions and components
2. Integration tests for command implementations
3. Fixture-based testing for file operations
4. Mocked API responses for external integrations

When writing tests:
- Use the test fixtures in `tests/fixtures/`
- Mock external APIs and file system operations
- Follow the patterns in existing test files