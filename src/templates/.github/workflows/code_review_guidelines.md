# Code Review Guidelines

This document outlines the standards and best practices for AI-powered code reviews in the AI Coding Assistants Setup project.

## Overview

The AI code review process uses Claude to analyze pull requests for code quality, best practices, and potential issues. This automated review complements human review and helps maintain high code standards.

## Review Categories

### 1. Code Quality

- **Clean Code Principles**: Readability, maintainability, and simplicity
- **DRY (Don't Repeat Yourself)**: Identify code duplication
- **SOLID Principles**: Single responsibility, open/closed, etc.
- **Code Complexity**: Cyclomatic complexity and cognitive load

### 2. Best Practices

- **Language-Specific Conventions**: Follow TypeScript/JavaScript idioms
- **Error Handling**: Proper error catching and propagation
- **Logging**: Appropriate log levels and information
- **Testing**: Adequate test coverage for new code

### 3. Performance

- **Algorithm Efficiency**: Time and space complexity
- **Resource Management**: Memory leaks, connection pooling
- **Async Operations**: Proper use of promises and async/await
- **Bundle Size**: Impact on package size

### 4. Security

- **Input Validation**: Sanitize user inputs
- **Authentication/Authorization**: Proper access controls
- **Sensitive Data**: No hardcoded secrets or credentials
- **Dependencies**: Check for known vulnerabilities

### 5. Architecture

- **Module Design**: Proper separation of concerns
- **API Design**: RESTful principles, consistent interfaces
- **Scalability**: Design for growth
- **Maintainability**: Easy to modify and extend

## Review Process

### Automated Checks

1. **Syntax and Linting**: ESLint, Prettier compliance
2. **Type Safety**: TypeScript strict mode compliance
3. **Test Coverage**: Minimum coverage thresholds
4. **Build Success**: Code compiles without errors

### AI Review Focus Areas

1. **Logic Errors**: Potential bugs or edge cases
2. **Code Smells**: Anti-patterns or problematic code
3. **Optimization Opportunities**: Performance improvements
4. **Documentation**: Missing or unclear comments/docs
5. **Accessibility**: WCAG compliance for UI code

## Guidelines for Reviewers

### What to Look For

- **Correctness**: Does the code do what it's supposed to?
- **Clarity**: Is the code self-documenting?
- **Consistency**: Does it follow project conventions?
- **Completeness**: Are all requirements addressed?

### How to Provide Feedback

1. **Be Constructive**: Focus on the code, not the person
2. **Be Specific**: Point to exact lines and suggest improvements
3. **Be Educational**: Explain why something should be changed
4. **Be Practical**: Consider deadlines and priorities

### Severity Levels

- **🔴 Critical**: Must fix before merge (security, data loss)
- **🟡 Major**: Should fix before merge (bugs, performance)
- **🟢 Minor**: Can fix in follow-up (style, optimization)
- **💡 Suggestion**: Consider for improvement (best practices)

## Common Issues

### TypeScript/JavaScript

```typescript
// ❌ Bad: Using any type
const processData = (data: any) => { ... }

// ✅ Good: Proper typing
const processData = (data: UserData) => { ... }
```

### Async Operations

```typescript
// ❌ Bad: Not handling errors
async function fetchData() {
  const response = await fetch(url);
  return response.json();
}

// ✅ Good: Proper error handling
async function fetchData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    logger.error('Failed to fetch data:', error);
    throw error;
  }
}
```

### Resource Management

```typescript
// ❌ Bad: Not cleaning up resources
function processFile(path: string) {
  const file = fs.openSync(path, 'r');
  // process file...
}

// ✅ Good: Proper cleanup
function processFile(path: string) {
  const file = fs.openSync(path, 'r');
  try {
    // process file...
  } finally {
    fs.closeSync(file);
  }
}
```

## Integration with CI/CD

The code review process is integrated into the GitHub Actions workflow:

1. **Pull Request Trigger**: Reviews run automatically on PR creation/update
2. **Status Checks**: Review must pass before merge
3. **Comments**: AI feedback posted as PR comments
4. **Re-review**: Triggered on code changes

## Configuration

Code review behavior can be configured via:

- `.github/workflows/quality.yml`: Workflow configuration
- `.eslintrc.js`: Linting rules
- `tsconfig.json`: TypeScript strictness
- `.prettierrc`: Code formatting rules

## Continuous Improvement

We continuously refine our code review process by:

1. Analyzing false positives/negatives
2. Updating review prompts and guidelines
3. Incorporating team feedback
4. Staying current with best practices

## Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
