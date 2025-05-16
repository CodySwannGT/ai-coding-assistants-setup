# Contributing to AI Coding Assistants Setup

Thank you for considering contributing to AI Coding Assistants Setup! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
  - [Setting Up the Development Environment](#setting-up-the-development-environment)
  - [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Guidelines](#commit-guidelines)
  - [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [Testing](#testing)
  - [Documentation](#documentation)
- [Release Process](#release-process)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Be patient and welcoming
- Be considerate
- Be willing to accept constructive criticism

## Ways to Contribute

- **Reporting bugs**: Open an issue describing the bug, how to reproduce it, and your environment
- **Suggesting features**: Open an issue describing the new feature and its potential benefits
- **Improving documentation**: Submit a PR with documentation updates or clarifications
- **Adding code**: Submit a PR with new features, bug fixes, or optimizations

## Getting Started

### Setting Up the Development Environment

1. **Fork and Clone the Repository**

   ```bash
   # Fork the repository on GitHub first, then:
   git clone https://github.com/YOUR_USERNAME/ai-coding-assistants-setup.git
   cd ai-coding-assistants-setup
   
   # Add upstream remote
   git remote add upstream https://github.com/CodySwannGT/ai-coding-assistants-setup.git
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Run tests**

   ```bash
   npm test
   ```

### Project Structure

```
ai-coding-assistants-setup/
├── .github/             # GitHub configuration files
├── src/                 # Source code
│   ├── config/          # Configuration management
│   ├── hooks/           # Git hook implementation
│   ├── integrations/    # AI assistant integrations
│   ├── templates/       # Template files to copy
│   └── utils/           # Utility functions
├── tests/               # Test files mirroring src structure
├── docs/                # Documentation
└── scripts/             # Build and utility scripts
```

## Development Workflow

### Branching Strategy

We use a simplified Git flow:

- `main` - stable, released code
- `feature/*` - new features and enhancements
- `fix/*` - bug fixes
- `docs/*` - documentation improvements
- `refactor/*` - code refactoring without feature changes

Example: `feature/add-support-for-github-mcp`

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) to make the commit history more readable and facilitate automated releases:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - a new feature
- `fix:` - a bug fix
- `docs:` - documentation changes
- `style:` - formatting changes that don't affect code behavior
- `refactor:` - code changes that neither fix bugs nor add features
- `test:` - adding or modifying tests
- `chore:` - changes to the build process, tooling, etc.

**Example:**
```
feat(hooks): add AI-powered code review to pre-commit hook

This enhances the pre-commit hook with Claude's code review capabilities.
It analyzes staged changes for potential bugs, performance issues, and
security vulnerabilities.

Close #42
```

### Pull Request Process

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   Implement your changes, following the coding standards.

3. **Add tests**

   Ensure your code is covered by tests.

4. **Run checks locally**

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

5. **Commit your changes**

   Follow the commit guidelines.

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a pull request**

   Go to the repository page and click "New pull request".

8. **Address review feedback**

   The maintainers will review your PR and may request changes.

9. **Merge**

   Once approved, a maintainer will merge your PR.

## Coding Standards

### TypeScript Guidelines

- Use strongly typed TypeScript - avoid `any` where possible
- Follow the ESLint and Prettier configurations in the project
- Document public APIs with JSDoc comments
- Aim for modular, testable code

### Testing

We use Jest for testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode during development
npm run test:watch
```

When writing tests:

- Write tests for all new features and bug fixes
- Aim for high test coverage (goal: >80%)
- Tests should be fast and deterministic
- Use mocks for external dependencies

Example test:

```typescript
describe('Feedback utility', () => {
  it('should format success messages with checkmark emoji', () => {
    const spy = jest.spyOn(console, 'log');
    
    Feedback.success('Operation completed');
    
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('✅'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Operation completed'));
    
    spy.mockRestore();
  });
});
```

### Documentation

- Update documentation for any feature changes
- Add JSDoc comments to all functions, classes, and interfaces
- Include usage examples for public APIs
- Keep the README and other documentation up to date

## Release Process

1. The project uses semantic versioning (MAJOR.MINOR.PATCH)
2. Releases are managed by the maintainers
3. A changelog is maintained automatically from commit messages

## Community

- **Report Bugs**: Use the [issue tracker](https://github.com/CodySwannGT/ai-coding-assistants-setup/issues)
- **Request Features**: Also through the issue tracker
- **Ask Questions**: Create a discussion in the repository

Thank you for contributing to AI Coding Assistants Setup!

---

<div align="center">

**Happy coding!** 🚀

</div>