# Example Prompts for AI Coding Assistants

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**Ready-to-use prompts for maximizing your AI coding assistant's capabilities**

</div>

## 📑 Table of Contents

- [Introduction](#-introduction)
- [Claude Code Prompts](#-claude-code-prompts)
  - [Code Generation](#code-generation)
  - [Code Review](#code-review)
  - [Debugging](#debugging)
  - [Refactoring](#refactoring)
  - [Documentation](#documentation)
  - [Testing](#testing)
  - [Design Patterns](#design-patterns)
- [Roo Code Prompts](#-roo-code-prompts)
  - [Custom Mode Prompts](#custom-mode-prompts)
  - [Rule-Based Development](#rule-based-development)
  - [Security Review](#security-review)
  - [Performance Optimization](#performance-optimization)
- [Git Hook Prompts](#-git-hook-prompts)
  - [Pre-Commit Hook](#pre-commit-hook)
  - [Prepare-Commit-Msg Hook](#prepare-commit-msg-hook)
  - [Commit-Msg Hook](#commit-msg-hook)
  - [Code Quality Checks](#code-quality-checks)
- [MCP Server Prompts](#-mcp-server-prompts)
  - [GitHub MCP](#github-mcp)
  - [Context7 MCP](#context7-mcp)
  - [Memory MCP](#memory-mcp)
  - [Task Master AI MCP](#task-master-ai-mcp)
- [Project-Specific Prompts](#-project-specific-prompts)
  - [TypeScript Projects](#typescript-projects)
  - [React Applications](#react-applications)
  - [Node.js Backend](#nodejs-backend)
  - [Full-Stack Applications](#full-stack-applications)
  - [Monorepo Projects](#monorepo-projects)
- [Advanced Workflow Prompts](#-advanced-workflow-prompts)
  - [Project Setup](#project-setup)
  - [Codebase Exploration](#codebase-exploration)
  - [Integration Scenarios](#integration-scenarios)
  - [Bug Fixing](#bug-fixing)
  - [Code Migration](#code-migration)

## 🔍 Introduction

This document provides a comprehensive collection of effective prompts for using AI assistants with your development workflow. These prompts are designed to help you get the most out of Claude Code, Roo Code, and associated tools.

Each prompt is structured to:
- Provide clear context to the AI
- Specify the desired outcome
- Include any required parameters or constraints
- Enable high-quality, accurate responses

Use these prompts as templates that you can adapt to your specific needs, project context, or coding requirements.

## 💻 Claude Code Prompts

### Code Generation

#### New Feature Implementation

```
I need to implement a new feature for [describe application/system]. The feature should:

1. [Describe primary functionality]
2. [List any specific requirements]
3. [Mention any constraints or guidelines]

The codebase uses:
- Language/Framework: [e.g., TypeScript, React]
- State Management: [e.g., Redux, Context API]
- API Communication: [e.g., REST, GraphQL]
- Coding Conventions: [e.g., ESLint rules, file naming]

Please provide:
1. A plan for implementing this feature
2. The code for each component/module needed
3. Tests for the new functionality
4. Any necessary documentation updates
```

#### Class/Component Creation

```
Create a [class/component] called [name] with the following:

Requirements:
- Purpose: [describe what it does]
- Required Methods/Props: [list needed functionality]
- Dependencies: [list any required libraries/modules]
- Interface/API: [describe how it will be used]

The code should follow our project conventions:
- [Mention any code style requirements]
- [Specify error handling approach]
- [Note any performance considerations]

Please include:
- Complete implementation
- JSDoc/TSDoc comments
- Example usage code
- Unit test structure
```

#### API Integration

```
I need to integrate with the [API name] API. Here are the requirements:

API Details:
- Endpoint: [URL]
- Authentication: [method]
- Request Format: [JSON/XML/etc.]
- Response Format: [structure]

Features needed:
1. [List primary functions needed]
2. [Describe any data transformations required]
3. [Mention error handling requirements]

Our codebase uses:
- HTTP Client: [Axios/Fetch/etc.]
- Error Handling: [pattern]
- Environment Config: [approach]

Please provide:
1. API client implementation
2. Usage examples
3. Error handling logic
4. Any needed types/interfaces
```

### Code Review

#### General Code Review

```
Please review this code for:
1. Bugs and potential issues
2. Performance bottlenecks
3. Security vulnerabilities
4. Code style and best practices
5. Maintainability concerns

Code:
```[paste code here]```

Specific areas to focus on:
- [Mention specific concerns if any]
- [Note any context that might affect the review]

Please provide actionable feedback with specific line references where possible.
```

#### Security-Focused Review

```
Please perform a security review of this code, focusing on:
1. Input validation and sanitization
2. Authentication/authorization issues
3. OWASP Top 10 vulnerabilities
4. Sensitive data exposure
5. Secure coding practices

Code:
```[paste code here]```

Additional context:
- This code handles [type of data] data
- It's used in [environment type]
- Authentication is handled via [method]

For each issue found, please:
1. Describe the vulnerability
2. Rate its severity (Low/Medium/High/Critical)
3. Suggest a secure fix
4. Provide example code for the fix
```

#### Performance Review

```
Evaluate this code for performance issues:

Code:
```[paste code here]```

Performance concerns:
1. Time complexity analysis
2. Memory usage
3. Unnecessary re-renders/recalculations
4. Database query efficiency
5. Network request optimization

This code runs in a [high-traffic/mobile/edge/etc.] environment where
[specific performance metric] is particularly important.

For each issue:
1. Identify the performance bottleneck
2. Explain why it's problematic
3. Suggest optimization approaches
4. Provide example optimized code
```

### Debugging

#### Bug Analysis

```
I'm encountering a bug with the following symptoms:
1. [Describe what happens]
2. [Mention expected behavior]
3. [List any error messages]

Steps to reproduce:
1. [Step-by-step reproduction]

Environment:
- [OS/Browser/Node version]
- [Relevant dependencies]

Here's the code that's causing the issue:
```[paste code here]```

Related code/logs:
```[paste related code/logs]```

Please help:
1. Analyze the root cause of this bug
2. Suggest potential fixes
3. Explain why the bug is occurring
4. Recommend how to prevent similar issues
```

#### Stack Trace Analysis

```
I received this stack trace error. Please help me understand what's happening and how to fix it:

```
[paste stack trace here]
```

Additional context:
- This occurred when [action/event]
- Related code: ```[paste code snippets]```
- Environment: [relevant details]

Please provide:
1. An explanation of what's causing this error
2. The most likely location of the bug
3. Suggested solutions
4. Steps to debug further if needed
```

#### Async Debugging

```
I'm having trouble with this asynchronous code:

```[paste code here]```

The issue is:
- [Describe the problem]
- [Mention any race conditions/timing issues]
- [List observed behavior]

Expected behavior:
- [What should happen]

Please help me:
1. Identify the async flow issues
2. Fix any promise/async-await problems
3. Implement proper error handling
4. Ensure consistent behavior
```

### Refactoring

#### Code Simplification

```
Please refactor this code to be more concise and maintainable:

```[paste code here]```

Issues with the current code:
- [Mention specific problems]
- [Note any duplicated logic]
- [Highlight complexity concerns]

Requirements for the refactored code:
1. Must maintain the same functionality
2. Should reduce complexity
3. Should follow [specific patterns/principles]
4. Must handle the same edge cases

Please provide:
1. The refactored code
2. Explanation of your changes
3. Benefits of the new approach
```

#### Legacy Code Modernization

```
I need to modernize this legacy code:

```[paste code here]```

Current issues:
- Written in [older language/framework version]
- Uses deprecated APIs/methods
- Performance issues
- Difficult to maintain

Target modernization:
- Update to [new language/framework version]
- Implement [modern patterns]
- Improve [specific aspects]
- Maintain backward compatibility with [specific interfaces]

Please provide:
1. Modernized version of the code
2. Migration plan for any breaking changes
3. Explanation of improvements
4. Any new tests needed
```

#### Code Decoupling

```
Please help me decouple this highly interdependent code:

```[paste code here]```

Current coupling issues:
- [Describe tight coupling problems]
- [Mention specific dependencies]
- [Note testability concerns]

Decoupling goals:
1. Separate concerns by [principle]
2. Improve testability
3. Create cleaner interfaces between components
4. Reduce side effects

Please provide:
1. Decoupled code structure
2. Interface definitions
3. Explanation of the new architecture
4. How to test the decoupled code
```

### Documentation

#### Code Documentation

```
Please document this code thoroughly:

```[paste code here]```

Documentation requirements:
1. JSDoc/TSDoc comments for all functions/classes
2. Parameters and return types
3. Examples of usage
4. Edge cases and error handling notes
5. Any non-obvious implementation details

Project uses [documentation style guide].

Include:
- Description of purpose for each component
- Pre/post conditions where relevant
- Any side effects
- References to related components
```

#### Technical Documentation

```
Please create technical documentation for this [system/library/module]:

```[paste code/description here]```

Documentation needed:
1. Overview and purpose
2. Architecture diagram (describe components)
3. Installation instructions
4. Configuration options
5. API reference
6. Example usage
7. Common issues/troubleshooting
8. Performance considerations

Target audience: [developers/sysadmins/other]
Format: [Markdown/HTML/etc.]

The documentation should follow our [style guide/format].
```

#### README Creation

```
Please create a comprehensive README.md for my project:

Project details:
- Name: [project name]
- Description: [short description]
- Key features: [list main features]
- Technologies: [tech stack]
- License: [license type]

The README should include:
1. Badges (version, license, build status)
2. Installation instructions
3. Quick start guide
4. Usage examples
5. API documentation
6. Configuration options
7. Contributing guidelines
8. License information
9. Acknowledgements

Style/format requirements:
- Clear, concise language
- Proper markdown formatting
- Tables for complex information
- Code blocks with syntax highlighting
```

### Testing

#### Unit Test Generation

```
Please write unit tests for this code:

```[paste code here]```

Testing Framework: [Jest/Mocha/etc.]
Testing Style: [describe-it/test/etc.]

Test coverage should include:
1. Happy path scenarios
2. Edge cases
3. Error handling
4. All public methods
5. Coverage of conditional logic

Special considerations:
- [Mention any mocking needs]
- [Note any dependencies to stub]
- [Describe environment setup requirements]

Please provide complete test code with setup and assertions.
```

#### Integration Test Strategy

```
I need integration tests for these interacting components:

Component A:
```[paste code here]```

Component B:
```[paste code here]```

Integration points:
1. [Describe how components interact]
2. [Mention data flow]
3. [Note expected behavior]

Testing goals:
- Verify components work together correctly
- Test typical user flows
- Ensure error handling between components
- Validate data transformations

Please provide:
1. Integration test strategy
2. Test cases to cover
3. Implementation of key test scenarios
4. Mocking approach for external dependencies
```

#### TDD Development

```
I want to implement a function/component using Test-Driven Development. Here are the requirements:

Function name: [name]
Purpose: [description]
Parameters:
- [param1]: [type and description]
- [param2]: [type and description]
Return: [type and description]

Behaviors to implement:
1. [behavior 1]
2. [behavior 2]
3. [behavior 3]

Edge cases to handle:
- [edge case 1]
- [edge case 2]

Please show the TDD process:
1. Write failing tests first
2. Implement minimal code to pass tests
3. Refactor while keeping tests passing
```

### Design Patterns

#### Design Pattern Implementation

```
Please implement the [pattern name] design pattern for this scenario:

Context:
- [Describe problem domain]
- [Mention specific requirements]
- [Note any constraints]

Current code (if applicable):
```[paste code here]```

What I need:
1. Implementation of the [pattern] design pattern
2. Explanation of how it fits this use case
3. Interfaces/classes needed
4. Example usage code
5. Benefits of using this pattern in this context

The implementation should use [language/framework] and follow our project's conventions.
```

#### Architectural Pattern Guidance

```
I need guidance on implementing the [architectural pattern] for my application:

Application details:
- Type: [web/mobile/desktop/etc.]
- Stack: [technologies used]
- Scale: [expected size/usage]
- Key requirements: [list important requirements]

Current architecture (if applicable):
[Describe current approach]

I'm considering [architectural pattern] because:
- [Reason 1]
- [Reason 2]

Please provide:
1. Analysis of this pattern's suitability
2. Implementation approach with key components
3. Code examples for critical parts
4. Potential challenges and solutions
5. Testing strategy for this architecture
```

## 🧩 Roo Code Prompts

### Custom Mode Prompts

#### Architect Mode

```
I need you to switch to Architect mode and help design the architecture for a new feature.

Feature requirements:
- [Describe feature purpose]
- [List key functionality]
- [Mention integration points]
- [Note performance/scalability needs]

Current architecture:
- [Describe existing components]
- [Mention design patterns in use]
- [Note any constraints]

As an Architect, please provide:
1. High-level architectural design
2. Component breakdown with responsibilities
3. Interface definitions
4. Data flow diagrams
5. Key design decisions with rationale
6. Potential risks and mitigations
```

#### TDD Developer Mode

```
I need you to switch to TDD Developer mode and help implement this feature with a test-first approach.

Feature:
- [Describe the feature]
- [List acceptance criteria]
- [Mention any constraints]

Technical context:
- Test framework: [Jest/Mocha/etc.]
- Language: [TypeScript/JavaScript/etc.]
- Environment: [Browser/Node/etc.]

As a TDD Developer, please:
1. Write the tests first for each piece of functionality
2. Implement the minimal code to make tests pass
3. Refactor the implementation while keeping tests green
4. Document your TDD approach and decisions
5. Review the final implementation for adherence to TDD principles
```

#### Security Auditor Mode

```
I need you to switch to Security Auditor mode and review this code for security vulnerabilities.

Code to review:
```[paste code here]```

Security context:
- This code handles [type of data]
- It's used in [environment]
- Authentication is handled via [method]
- Specific concerns: [list any particular worries]

As a Security Auditor, please:
1. Perform a thorough security review
2. Identify OWASP Top 10 vulnerabilities
3. Check for proper input validation/sanitization
4. Review authentication/authorization implementation
5. Assess data protection measures
6. Rate each finding by severity
7. Provide secure remediation recommendations
```

#### Refactoring Expert Mode

```
I need you to switch to Refactoring Expert mode and help improve this code.

Code to refactor:
```[paste code here]```

Issues to address:
- [List code smells]
- [Mention maintainability concerns]
- [Note performance issues]
- [Describe any awkward interfaces]

Refactoring constraints:
- Must maintain backward compatibility with [interfaces]
- Cannot change [specific parts]
- Must keep functional behavior identical

As a Refactoring Expert, please:
1. Identify refactoring opportunities
2. Apply appropriate refactoring patterns
3. Maintain test coverage during refactoring
4. Explain your refactoring decisions
5. Show before/after comparisons with improvements highlighted
```

### Rule-Based Development

#### Coding Standards Enforcement

```
I need help ensuring this code follows our standards. Please review and fix:

Code:
```[paste code here]```

Our coding standards:
1. [Standard 1]
2. [Standard 2]
3. [Standard 3]

Specific rules to enforce:
- [Rule 1 details]
- [Rule 2 details]
- [Rule 3 details]

Please:
1. Identify all standards violations
2. Fix the code to comply with standards
3. Explain the changes made
4. Suggest tools/approaches to prevent future violations
```

#### Architecture Rules Validation

```
I need to validate that this implementation follows our architectural rules:

Code:
```[paste code here]```

Architecture rules:
1. [Rule 1 - e.g., Services should not directly use repositories]
2. [Rule 2 - e.g., Controllers should not contain business logic]
3. [Rule 3 - e.g., Each module should have a single responsibility]

Please:
1. Assess compliance with each rule
2. Identify specific violations
3. Suggest architectural refactorings
4. Provide improved code that follows our rules
5. Explain how the improvements maintain the architecture
```

### Security Review

#### Secure Coding Review

```
Please review this code for security vulnerabilities:

Code:
```[paste code here]```

Security requirements:
1. All user input must be validated/sanitized
2. Authentication must be enforced for [specific actions]
3. CSRF protection required for all forms
4. Sensitive data must be properly encrypted/protected
5. Authorization checks required for [specific resources]

Please provide:
1. Comprehensive security analysis
2. Identification of all vulnerabilities
3. Risk assessment (severity/likelihood)
4. Secure code replacements
5. Additional security controls needed
```

#### Injection Prevention

```
Review this code for potential injection vulnerabilities:

Code:
```[paste code here]```

Areas of concern:
- SQL/NoSQL queries
- Shell command execution
- Template rendering
- URL handling
- File path operations

For each potential injection point:
1. Identify the vulnerability
2. Explain the attack vector
3. Provide a secure implementation
4. Recommend validation/sanitization approach
5. Suggest additional layers of protection
```

### Performance Optimization

#### Performance Profiling

```
Please analyze this code for performance issues:

Code:
```[paste code here]```

Performance context:
- This code runs [frequency/context]
- Current performance: [metrics if available]
- Target performance: [desired metrics]
- Bottlenecks suspected in: [areas of concern]

Please provide:
1. Performance analysis with estimated complexity
2. Identification of bottlenecks and inefficient patterns
3. Memory usage assessment
4. Optimization recommendations with examples
5. Benchmarking approach to verify improvements
```

#### Frontend Optimization

```
Please optimize this frontend code for performance:

Code:
```[paste code here]```

Performance issues:
- Slow render times
- Excessive re-renders
- Poor load time
- Bundle size concerns
- Runtime performance

Target browsers/devices:
- [List target environments]

Please provide:
1. Render performance optimizations
2. Bundle size reduction strategies
3. Asset loading improvements
4. Memory leak prevention
5. State management optimizations
6. Example code with performance improvements
```

## 🪝 Git Hook Prompts

### Pre-Commit Hook

#### Code Review Hook

```
[PRE-COMMIT HOOK PROMPT]

You are performing an automated code review as part of a pre-commit Git hook.

Please review the following staged changes for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code quality and best practices
5. Adherence to project standards

Staged changes:
{{staged_diff}}

Project context:
- Language/framework: {{language}}/{{framework}}
- Project type: {{project_type}}
- Current branch: {{branch_name}}

Please analyze the changes thoroughly and provide:
1. A summary of issues found (if any)
2. Specific line-by-line feedback with recommendations
3. Severity rating for each issue (low/medium/high)
4. Suggested fixes with code examples

Format your response to be concise and actionable, focusing on the most important issues first.
```

#### TypeScript Type Check

```
[PRE-COMMIT TYPESCRIPT CHECK]

You are performing TypeScript type checking as part of a pre-commit Git hook.

TypeScript compilation results:
{{typescript_output}}

Files with errors:
{{error_files}}

For each error:
1. Analyze the root cause
2. Suggest the correct fix
3. Explain the TypeScript concept involved
4. Provide example code that resolves the issue

If no errors were found, confirm type safety and suggest any optional improvements to types.
```

#### Linting Check

```
[PRE-COMMIT LINT CHECK]

You are reviewing ESLint results as part of a pre-commit Git hook.

Linting output:
{{lint_output}}

Files with issues:
{{issue_files}}

For each linting issue:
1. Explain the rule and why it's important
2. Provide the correct fix
3. Suggest any configuration changes if the rule is problematic
4. Group similar issues for efficiency

Format your response to be actionable and educational, helping the developer understand the linting rules.
```

### Prepare-Commit-Msg Hook

#### Commit Message Generation

```
[PREPARE-COMMIT-MSG HOOK]

Generate a descriptive commit message for the following changes:

Changes:
{{diff}}

Branch name: {{branch_name}}
Issue number (if detected): {{issue_number}}

Please create a commit message that:
1. Follows the Conventional Commits format: <type>[optional scope]: <description>
2. Uses one of these types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
3. Has a clear, concise description of what changed (not how it changed)
4. Focuses on the WHY of the change
5. Maintains a subject line under 72 characters
6. Includes a more detailed body if necessary (wrap at 80 characters)
7. References the issue number if available

The message should be specific and informative while following best practices for commit messages.
```

#### Feature Commit Template

```
[FEATURE COMMIT TEMPLATE]

Generate a detailed commit message for this new feature:

Feature changes:
{{diff}}

Branch: {{branch_name}}
Issue: {{issue_number}}

Please create a structured commit message with:

1. Subject line:
   feat({{scope}}): concise description of the feature

2. Body:
   - What problem does this feature solve?
   - Key implementation details
   - Any design considerations 
   - Breaking changes (if any)

3. Footer:
   - Issue references
   - Breaking change warnings
   - Migration notes if applicable

Ensure the message clearly conveys the purpose and impact of this feature addition.
```

#### Bug Fix Commit Template

```
[BUGFIX COMMIT TEMPLATE]

Generate a detailed bug fix commit message:

Bug fix changes:
{{diff}}

Branch: {{branch_name}}
Issue: {{issue_number}}

Please create a structured commit message with:

1. Subject line:
   fix({{scope}}): concise description of the bug fix

2. Body:
   - What was the bug?
   - Root cause analysis
   - Fix approach explanation
   - How to verify the fix

3. Footer:
   - Issue references
   - Regression test notes if applicable

Ensure the message clearly explains what was broken and how it was fixed.
```

### Commit-Msg Hook

#### Commit Message Validation

```
[COMMIT-MSG VALIDATION HOOK]

Validate the following commit message against best practices:

Commit message:
{{commit_message}}

Validation requirements:
1. Follows Conventional Commits format
   - Valid type (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert)
   - Optional scope in parentheses
   - Description starts with lowercase
2. Subject line is under 72 characters
3. Subject and body separated by blank line (if body exists)
4. Body wraps at 80 characters
5. Message explains WHY, not just WHAT
6. No grammar, spelling, or punctuation errors

Please provide:
1. Validation result (pass/fail)
2. Issues found (if any)
3. Suggested improvements
4. Fixed version of the commit message
```

#### Conventional Commit Check

```
[CONVENTIONAL COMMIT CHECK]

Verify this commit message follows the Conventional Commits specification:

Commit message:
{{commit_message}}

Check for:
1. Format: <type>[optional scope]: <description>
2. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
3. Breaking changes marked with ! or BREAKING CHANGE: footer
4. Issue references properly formatted
5. Imperative mood in description

Please provide:
1. Compliance assessment (compliant/non-compliant)
2. Specific violations (if any)
3. Corrected message that maintains original intent
4. Explanation of corrections made
```

### Branch Strategy

#### Branch Naming Validation

```
[BRANCH STRATEGY VALIDATION]

Validate this branch name against our branch strategy:

Branch name: {{branch_name}}
Branch strategy: {{strategy_type}} (e.g., GitFlow, Trunk-based, GitHub Flow)

Branch naming rules:
1. Feature branches: feature/<description>
2. Bugfix branches: bugfix/<description>
3. Hotfix branches: hotfix/<description>
4. Release branches: release/v<version>
5. Branch descriptions should be kebab-case
6. Should include issue ID when applicable (format: PROJ-123)

Please provide:
1. Validation result (valid/invalid)
2. Specific rule violations (if any)
3. Suggested correct branch name
4. Explanation of the branch naming conventions
```

#### GitFlow Branch Analysis

```
[GITFLOW BRANCH ANALYSIS]

Analyze this branch against GitFlow workflow rules:

Branch: {{branch_name}}
Base branch: {{base_branch}}
Commit message: {{commit_message}}

GitFlow validation:
1. feature/* branches should branch from and merge to develop
2. release/* branches should branch from develop and merge to main and develop
3. hotfix/* branches should branch from main and merge to main and develop
4. bugfix/* branches should branch from develop

Please provide:
1. Compliance assessment
2. Workflow violations (if any)
3. Recommended actions to comply with GitFlow
4. Explanation of the GitFlow rules relevant to this branch
```

### Code Quality Checks

#### Code Formatting Check

```
[CODE FORMATTING CHECK]

Validate code formatting for these staged files:

Files:
{{file_list}}

Formatting issues found:
{{formatting_issues}}

Please provide:
1. Analysis of formatting issues by category
2. Explanation of formatting rules violated
3. Commands to automatically fix formatting
4. Recommendations for consistent formatting
```

#### Code Coverage Check

```
[CODE COVERAGE CHECK]

Review the test coverage for recent changes:

Coverage report:
{{coverage_report}}

Changed files:
{{changed_files}}

Coverage thresholds:
- Statements: {{statement_threshold}}%
- Branches: {{branch_threshold}}%
- Functions: {{function_threshold}}%
- Lines: {{line_threshold}}%

Please provide:
1. Assessment of coverage for changed files
2. Identification of untested code
3. Suggestions for additional tests needed
4. Overall coverage impact analysis
```

## 🔌 MCP Server Prompts

### GitHub MCP

#### Repository Analysis

```
I need a comprehensive analysis of this GitHub repository.

@github get_repository --owner "{{owner}}" --repo "{{repo}}"

With this information, please analyze:
1. Repository structure and organization
2. Main branches and protection status
3. Active contributors and contribution patterns
4. Issue tracking and PR workflow
5. Documentation quality
6. CI/CD configuration
7. Code quality tools in use

Then provide recommendations for:
- Repository structure improvements
- Workflow optimization
- Documentation enhancements
- Developer experience improvements
```

#### Code Search and Analysis

```
I need to understand how a specific pattern is used across the codebase.

@github search_code --q "{{search_term}}" --language:{{language}} --repo:{{owner}}/{{repo}}

For the results, please:
1. Analyze usage patterns and variations
2. Identify common implementation approaches
3. Highlight best practices found
4. Note any potential issues or inconsistencies
5. Suggest standardized approaches if appropriate

Focus on understanding the overall architecture and patterns rather than just individual instances.
```

#### PR Review

```
Please analyze this pull request comprehensively.

@github get_pull_request --owner "{{owner}}" --repo "{{repo}}" --pullNumber {{pr_number}}
@github get_pull_request_files --owner "{{owner}}" --repo "{{repo}}" --pullNumber {{pr_number}}
@github get_pull_request_reviews --owner "{{owner}}" --repo "{{repo}}" --pullNumber {{pr_number}}

Based on this information, please:
1. Summarize the changes and their purpose
2. Analyze code quality and adherence to project standards
3. Identify potential issues or bugs
4. Review test coverage and documentation
5. Suggest improvements or alternative approaches
6. Provide a recommended approval decision with rationale
```

### Context7 MCP

#### Documentation Lookup

```
I need comprehensive documentation for a specific library feature.

@context7-mcp resolve-library-id --libraryName "{{library_name}}"
@context7-mcp get-library-docs --context7CompatibleLibraryID "{{library_id}}" --topic "{{topic}}" --tokens 8000

With this documentation, please:
1. Summarize the key functionality and purpose
2. Explain the core concepts and principles
3. Provide example usage code for common scenarios
4. Highlight best practices and common pitfalls
5. Compare with alternative approaches if relevant
6. Suggest integration strategies for our codebase
```

#### API Method Exploration

```
I need to understand how to use a specific API method correctly.

@context7-mcp resolve-library-id --libraryName "{{library_name}}"
@context7-mcp get-library-docs --context7CompatibleLibraryID "{{library_id}}" --topic "{{method_name}}" --tokens 5000

Based on the documentation, please:
1. Explain the method's purpose and functionality
2. Detail all parameters and return values
3. Provide examples of correct usage
4. Highlight common mistakes to avoid
5. Show error handling best practices
6. Suggest testing approaches for code using this method
```

#### Library Comparison

```
I need to compare different libraries for {{specific_purpose}}.

Let me gather documentation for each option:

@context7-mcp resolve-library-id --libraryName "{{library1}}"
@context7-mcp get-library-docs --context7CompatibleLibraryID "{{library1_id}}" --tokens 5000

@context7-mcp resolve-library-id --libraryName "{{library2}}"
@context7-mcp get-library-docs --context7CompatibleLibraryID "{{library2_id}}" --tokens 5000

@context7-mcp resolve-library-id --libraryName "{{library3}}"
@context7-mcp get-library-docs --context7CompatibleLibraryID "{{library3_id}}" --tokens 5000

Please compare these libraries based on:
1. Feature completeness for our needs
2. API design and developer experience
3. Performance characteristics
4. Community support and maintenance
5. Learning curve and documentation quality
6. Integration complexity with our tech stack
7. Long-term viability and sustainability

Provide a recommendation with justification.
```

### Memory MCP

#### Project Knowledge Storage

```
I want to store key information about our project for future reference.

@memory create_entities --entities '[
  {
    "name": "Project Architecture",
    "entityType": "Documentation",
    "observations": [
      "The project follows a microservices architecture with {{number}} services",
      "Frontend uses {{frontend_framework}} with {{state_management}}",
      "Backend services use {{backend_technology}}",
      "Data is stored in {{database}} with {{data_model}}"
    ]
  },
  {
    "name": "Development Workflow",
    "entityType": "Process",
    "observations": [
      "We use {{git_workflow}} for branching strategy",
      "CI/CD is handled by {{ci_tool}}",
      "Code reviews require {{review_requirements}}",
      "Deployment follows {{deployment_process}}"
    ]
  }
]'

@memory create_relations --relations '[
  {
    "from": "Project Architecture",
    "to": "Development Workflow",
    "relationType": "influences"
  }
]'

Please confirm this information has been stored and is retrievable for future coding sessions.
```

#### Knowledge Retrieval

```
I need to recall some information we previously discussed about the project.

@memory search_nodes --query "{{search_term}}"

Based on the retrieved information, please:
1. Summarize what we know about {{topic}}
2. Identify any gaps in our knowledge
3. Suggest additional information we should store
4. Show how this information applies to our current task
```

#### Knowledge Graph Exploration

```
I want to explore all the project knowledge we've accumulated.

@memory read_graph

Please analyze this knowledge graph and:
1. Create a conceptual map of our project
2. Identify key components and their relationships
3. Highlight areas with good documentation
4. Point out knowledge gaps that should be filled
5. Suggest additional relations to create for better context
6. Recommend a structure for future knowledge organization
```

### Task Master AI MCP

#### Project Initialization

```
I need to set up task management for my project.

@task-master-ai initialize_project --projectRoot "{{project_path}}"

Now let's create an initial set of tasks for implementing {{feature}}:

@task-master-ai add_task --projectRoot "{{project_path}}" --prompt "Implement {{feature}} with the following requirements: {{requirements}}"

@task-master-ai expand_task --projectRoot "{{project_path}}" --id "1"

Please:
1. Explain the task structure that's been created
2. Suggest how to organize and prioritize these tasks
3. Recommend a workflow for tracking task progress
4. Provide guidance on how to update tasks as we progress
```

#### Complex Task Breakdown

```
I need to break down a complex implementation task into manageable subtasks.

@task-master-ai add_task --projectRoot "{{project_path}}" --prompt "Implement {{complex_feature}} with these requirements: {{detailed_requirements}}"

@task-master-ai expand_task --projectRoot "{{project_path}}" --id "{{task_id}}" --num "10"

Now let's analyze the complexity of these subtasks:

@task-master-ai analyze_project_complexity --projectRoot "{{project_path}}"

Based on this analysis, please:
1. Identify the most complex subtasks that might need further breakdown
2. Suggest dependencies between subtasks
3. Recommend an implementation order
4. Highlight areas where we might need additional resources or research
5. Provide a realistic timeline estimate for completing the entire feature
```

#### Task Dependency Management

```
I need to manage dependencies between tasks in my project.

First, let's look at our current tasks:

@task-master-ai get_tasks --projectRoot "{{project_path}}" --withSubtasks true

Now, let's set up dependencies between related tasks:

@task-master-ai add_dependency --projectRoot "{{project_path}}" --id "{{dependent_task_id}}" --dependsOn "{{prerequisite_task_id}}"
@task-master-ai add_dependency --projectRoot "{{project_path}}" --id "{{dependent_task_id2}}" --dependsOn "{{prerequisite_task_id2}}"

Let's validate our dependency structure:

@task-master-ai validate_dependencies --projectRoot "{{project_path}}"

Please:
1. Visualize the task dependency graph
2. Identify any circular dependencies or issues
3. Suggest the optimal task execution order
4. Recommend parallel work streams if possible
5. Highlight critical path tasks that could become bottlenecks
```

## 📁 Project-Specific Prompts

### TypeScript Projects

#### Type Definition Creation

```
I need to create TypeScript types/interfaces for this domain model:

Domain entities and relationships:
- {{entity1}}: [properties and relationships]
- {{entity2}}: [properties and relationships]
- Relationship between {{entity1}} and {{entity2}}: [description]

Requirements:
- Use proper TypeScript features (unions, intersections, generics as appropriate)
- Include JSDoc comments for all types
- Make types strict but practical
- Consider validation requirements
- Use appropriate nullability

Please provide:
1. Complete type definitions
2. Usage examples
3. Validation approaches if needed
4. Explanation of type design decisions
```

#### TypeScript Configuration

```
I need help configuring TypeScript for my project with these requirements:

Project details:
- Framework: {{framework}}
- Module system: {{module_system}}
- Browser support: {{browser_support}}
- Node.js version: {{node_version}}
- Special requirements: {{special_requirements}}

Please provide:
1. Recommended tsconfig.json with explanations for key options
2. ESLint configuration for TypeScript
3. Build/transpilation setup
4. Testing configuration
5. Path aliases recommendation
6. Type checking optimization for development
```

#### Type Migration Strategy

```
I need to migrate this JavaScript code to TypeScript:

```[paste JavaScript code]```

Migration requirements:
- Maintain identical functionality
- Add comprehensive type definitions
- Handle any uncertain types safely
- Identify areas needing refactoring for type safety
- Keep backward compatibility with JavaScript consumers

Please provide:
1. Fully typed TypeScript version
2. Notes on type uncertainties or challenges
3. Recommendations for improving type safety
4. Incremental migration approach if full migration is complex
```

### React Applications

#### Component Structure Design

```
I need to design a component structure for a {{feature_type}} feature:

Feature requirements:
- [List functionality requirements]
- [User interaction details]
- [State management needs]
- [API integration points]

Technical constraints:
- React version: {{react_version}}
- State management: {{state_solution}}
- UI library: {{ui_library}}
- Testing framework: {{test_framework}}

Please provide:
1. Component hierarchy diagram/description
2. Props and state for each component
3. Container vs. presentational component breakdown
4. State management approach
5. Key component code implementations
6. Testing strategy for components
```

#### React Performance Optimization

```
I need to optimize the performance of this React component:

```[paste component code]```

Performance issues observed:
- [Describe performance problems]
- [Mention re-render issues if applicable]
- [Note any slow operations]

The component is used in contexts where:
- [Describe usage patterns]
- [Mention data volumes]
- [Note user interaction patterns]

Please provide:
1. Performance analysis with issue identification
2. Optimized version of the component
3. Explanation of optimization techniques applied
4. Additional recommendations for parent/child components
5. Measurement approach to verify improvements
```

#### React Hook Implementation

```
I need to create a custom React hook for {{specific_functionality}}:

Hook requirements:
- Purpose: [describe what the hook should do]
- Inputs: [parameters or dependencies]
- Outputs: [return values or effects]
- Lifecycle behavior: [when/how the hook should run]
- Error handling: [how errors should be managed]

Current implementation (if any):
```[paste current code if applicable]```

Please provide:
1. Complete hook implementation with TypeScript types
2. Usage examples in different contexts
3. Edge case handling approach
4. Testing strategy for the hook
5. Performance considerations
```

### Node.js Backend

#### API Endpoint Implementation

```
I need to implement a new API endpoint with these requirements:

Endpoint details:
- HTTP method: {{method}}
- Path: {{path}}
- Purpose: {{purpose}}
- Request parameters/body: {{request_details}}
- Response structure: {{response_details}}
- Authentication requirements: {{auth_requirements}}
- Authorization rules: {{authorization_details}}

Our backend uses:
- Framework: {{framework}} (Express/Nest.js/etc.)
- Validation: {{validation_library}}
- Database: {{database}}
- Error handling pattern: {{error_pattern}}

Please provide:
1. Complete endpoint implementation
2. Request validation code
3. Error handling cases
4. Database queries (if applicable)
5. Tests for the endpoint
6. Documentation in our standard format
```

#### Database Query Optimization

```
I need to optimize this database query for performance:

Current query:
```[paste query code]```

Performance issues:
- [Describe current performance]
- [Mention specific slowness or resource usage]
- [Note scale factors affecting performance]

Database details:
- Type: {{database_type}}
- Schema: {{relevant_schema_details}}
- Typical data volume: {{data_volume}}
- Indexes already in place: {{existing_indexes}}

Please provide:
1. Analysis of query performance bottlenecks
2. Optimized query implementation
3. Index recommendations
4. Schema change suggestions (if applicable)
5. Query execution plan analysis
6. Additional optimization strategies
```

#### Middleware Implementation

```
I need to implement a middleware for {{specific_purpose}}:

Middleware requirements:
- Purpose: [describe functionality needed]
- When to run: [request types/paths/conditions]
- Dependencies: [services or data needed]
- Error handling: [how errors should be managed]
- Performance considerations: [any performance requirements]

Framework details:
- Node.js framework: {{framework}}
- Request/response pattern: {{pattern}}
- Existing middleware: {{existing_middleware}}

Please provide:
1. Complete middleware implementation
2. Integration instructions
3. Configuration options
4. Testing approach
5. Performance impact analysis
```

### Full-Stack Applications

#### Data Flow Design

```
I need to design the data flow for a {{feature_type}} feature:

Feature overview:
- [Describe user interaction]
- [Note data requirements]
- [Mention persistence needs]
- [List integration points]

Technology stack:
- Frontend: {{frontend_stack}}
- Backend: {{backend_stack}}
- Database: {{database}}
- APIs: {{api_details}}

Please design:
1. Complete data flow from user action to database and back
2. State management approach on frontend
3. API contract between frontend and backend
4. Database schema changes (if needed)
5. Error handling across the stack
6. Optimistic UI updates (if applicable)
7. Loading state management
```

#### Authentication Implementation

```
I need to implement authentication for my full-stack application:

Requirements:
- Authentication types: {{auth_types}}
- User roles: {{user_roles}}
- Security requirements: {{security_requirements}}
- Session management: {{session_approach}}
- Integration with: {{external_systems}}

Technology stack:
- Frontend: {{frontend_stack}}
- Backend: {{backend_stack}}
- Database: {{database}}

Please provide:
1. Authentication architecture overview
2. Backend implementation (routes, controllers, services)
3. Frontend implementation (forms, state, redirects)
4. Database schema for users and roles
5. Token management approach
6. Security considerations and mitigations
7. Testing strategy for auth flows
```

#### Full-Stack Deployment Strategy

```
I need a deployment strategy for my full-stack application:

Application details:
- Frontend: {{frontend_stack}}
- Backend: {{backend_stack}}
- Database: {{database}}
- Environment requirements: {{environment_needs}}
- Scaling expectations: {{scale_details}}

Current infrastructure:
- [Describe existing infrastructure]
- [Note any constraints]
- [Mention available services]

Please provide:
1. Comprehensive deployment architecture
2. Frontend deployment approach
3. Backend deployment approach
4. Database deployment and migration strategy
5. Environment management (dev/staging/prod)
6. CI/CD pipeline design
7. Monitoring and logging setup
8. Scaling strategy for growth
```

### Monorepo Projects

#### Monorepo Structure Design

```
I need to design/improve the structure of our monorepo:

Project details:
- Total number of packages: {{package_count}}
- Types of packages: {{package_types}}
- Shared dependencies: {{shared_deps}}
- Build systems: {{build_systems}}
- Testing frameworks: {{test_frameworks}}
- CI/CD requirements: {{ci_requirements}}

Current pain points:
- [Describe current issues]
- [Mention build/dependency problems]
- [Note developer experience issues]

Please provide:
1. Recommended monorepo structure
2. Package organization strategy
3. Dependency management approach
4. Build system configuration
5. Development workflow recommendations
6. CI/CD pipeline design
```

#### Workspace Configuration

```
I need to configure workspaces for our monorepo:

Monorepo details:
- Package manager: {{package_manager}}
- Package organization: {{package_organization}}
- Build tool: {{build_tool}}
- Shared code patterns: {{shared_patterns}}
- Internal dependency graph: {{dependency_details}}

Please provide:
1. Complete workspace configuration
2. Path mapping/alias setup
3. Dependency hoisting strategy
4. Script sharing approach
5. Development workflow configuration
6. Common issues and solutions
```

#### Cross-Package Refactoring

```
I need to refactor functionality that affects multiple packages in our monorepo:

Refactoring goal:
- [Describe what needs to change]
- [Mention affected packages]
- [Note backward compatibility requirements]

Current implementation:
```[paste relevant code snippets]```

Monorepo structure:
- [Describe relevant structure]
- [Note package relationships]
- [Mention versioning approach]

Please provide:
1. Refactoring strategy across packages
2. Implementation plan with order of changes
3. Version management approach
4. Testing strategy for cross-package changes
5. Rollout plan to minimize disruption
```

## 🔄 Advanced Workflow Prompts

### Project Setup

#### Project Scaffolding

```
I need to scaffold a new {{project_type}} project with these requirements:

Project details:
- Name: {{project_name}}
- Purpose: {{project_purpose}}
- Key features: {{key_features}}
- Tech stack preferences: {{tech_stack}}
- Code quality requirements: {{code_quality}}
- Testing approach: {{testing_approach}}

Please provide:
1. Complete project structure
2. Configuration files (package.json, tsconfig.json, etc.)
3. Initial source files and directories
4. README and documentation setup
5. Git configuration (.gitignore, etc.)
6. CI/CD configuration files
7. Development environment setup instructions
```

#### Development Environment Configuration

```
I need to configure a development environment for {{project_type}}:

Requirements:
- Editors/IDEs: {{editors}}
- Linting/formatting: {{linting}}
- Build tools: {{build_tools}}
- Testing setup: {{testing}}
- Debug configuration: {{debug}}
- Local services: {{local_services}}

Please provide:
1. Editor configuration files (.vscode, .idea, etc.)
2. Linting and formatting configuration
3. Build configuration
4. Test runner setup
5. Debug launch configurations
6. Docker/containerization setup if needed
7. Documentation for environment setup
```

### Codebase Exploration

#### Codebase Architecture Analysis

```
I need to understand the architecture of this codebase:

Key files:
```[list or attach key files]```

Please analyze this code and provide:
1. High-level architecture overview
2. Key components and their responsibilities
3. Data flow throughout the system
4. Design patterns in use
5. Dependency relationships
6. Strengths and potential improvements
7. Architecture diagram (description)
```

#### Code Flow Analysis

```
I need to understand the execution flow for this functionality:

Starting point:
```[paste entry point code]```

Related files:
```[paste related files or describe them]```

Please trace the execution flow and provide:
1. Step-by-step execution sequence
2. Control flow diagram (description)
3. Key decision points and conditions
4. Data transformations along the flow
5. External system interactions
6. Error handling paths
7. Performance considerations
```

### Integration Scenarios

#### Third-Party API Integration

```
I need to integrate with the {{api_name}} API:

Integration requirements:
- Features needed: {{features}}
- Authentication type: {{auth_type}}
- Rate limits: {{rate_limits}}
- Error handling needs: {{error_handling}}
- Performance requirements: {{performance}}

Our codebase:
- Framework: {{framework}}
- HTTP client: {{http_client}}
- Architecture pattern: {{pattern}}

Please provide:
1. API client implementation
2. Authentication handling
3. Key endpoint implementations
4. Error handling and retry logic
5. Rate limiting strategy
6. Testing approach with mocks
7. Documentation for the integration
```

#### System Integration Design

```
I need to design an integration between {{system_a}} and {{system_b}}:

Integration requirements:
- Data to sync: {{data_types}}
- Sync frequency: {{frequency}}
- Consistency requirements: {{consistency}}
- Error handling: {{error_handling}}
- Volume considerations: {{volume}}

System details:
- System A API: {{system_a_api}}
- System B API: {{system_b_api}}
- Authentication mechanisms: {{auth_details}}
- Existing integration points: {{existing_integrations}}

Please provide:
1. Integration architecture design
2. Data mapping approach
3. Synchronization strategy
4. Error handling and recovery
5. Monitoring and alerting recommendations
6. Performance optimization techniques
7. Implementation plan with prioritization
```

### Bug Fixing

#### Complex Bug Investigation

```
I need help investigating this complex bug:

Bug symptoms:
- [Describe what happens]
- [When it occurs]
- [Reproducibility]
- [Impact]

Error information:
```[paste error messages/stack traces]```

Relevant code:
```[paste related code]```

Environment details:
- {{environment_specifics}}
- {{version_information}}
- {{configuration_details}}

Please provide:
1. Systematic analysis of potential causes
2. Debugging approach with specific steps
3. Most likely root cause(s)
4. Recommended fix with code
5. Verification steps to confirm the fix
6. Prevention strategies for similar bugs
```

#### Regression Analysis

```
I need to analyze a regression that occurred after {{change}}:

Regression details:
- Previously working functionality: {{functionality}}
- Current behavior: {{current_behavior}}
- Changes made before regression: {{changes}}

Relevant code before:
```[paste previous working code]```

Relevant code after:
```[paste new broken code]```

Please provide:
1. Comparison analysis of before/after code
2. Identification of breaking changes
3. Root cause analysis
4. Fix implementation
5. Test cases to prevent future regression
6. Considerations for backward compatibility
```

### Code Migration

#### Framework Migration Strategy

```
I need to migrate from {{old_framework}} to {{new_framework}}:

Application details:
- Size: {{size_metrics}}
- Key features: {{key_features}}
- Current architecture: {{current_architecture}}
- Special requirements: {{special_requirements}}
- Timeline constraints: {{timeline}}

Please provide:
1. Complete migration strategy
2. Phased approach with milestones
3. Risk assessment and mitigation
4. Code transformation patterns for common cases
5. Testing strategy for ensuring equivalence
6. Rollout plan with fallback options
7. Recommended tools for assisting migration
```

#### Language Migration Guide

```
I need to migrate this code from {{source_language}} to {{target_language}}:

Source code:
```[paste source code]```

Migration requirements:
- Performance expectations: {{performance}}
- Maintainability needs: {{maintainability}}
- Feature parity requirements: {{feature_parity}}
- Target language idioms to adopt: {{idioms}}

Please provide:
1. Complete implementation in target language
2. Explanation of language-specific adaptations
3. Optimization for target language features
4. Comparison of differences in approach
5. Testing strategy for the migrated code
6. Potential issues and mitigations
```

## 📜 License

This document is licensed under the MIT License - see the [LICENSE.md](../LICENSE.md) file for details.

---

<div align="center">
Made with ❤️ by the AI Coding Assistants Setup team
</div>