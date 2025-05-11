# Contributing to AI Coding Assistants Setup

Thank you for considering contributing to this project! This guide will help you get started as a contributor and explain our development workflow.

## Ways to Contribute

- **Reporting bugs**: Open an issue describing the bug, how to reproduce it, and your environment
- **Suggesting features**: Open an issue describing the new feature and its potential benefits
- **Improving documentation**: Submit a PR with documentation updates or clarifications
- **Adding code**: Submit a PR with new features, bug fixes, or optimizations

## Getting Started

### Forking and Cloning the Repository

1. Fork the repository on GitHub by clicking the "Fork" button at the top right of the repository page
2. Clone your fork to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-coding-assistants-setup.git
   cd ai-coding-assistants-setup
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/CodySwannGT/ai-coding-assistants-setup.git
   ```

### Setting Up the Development Environment

1. Ensure you have Node.js (v18+) and npm (v7+) installed
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by copying the example:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` to add your API keys and configuration

### Making Your First Contribution

1. Create a new branch for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes to the codebase
3. Run tests to ensure your changes don't break existing functionality:
   ```bash
   npm test
   ```
4. Submit a pull request (see the "Development Workflow" section)

## Project Structure

The project is organized as follows:

- `.ai-assistants/` - Configuration for various AI assistants
- `.claude/` - Claude-specific configuration
- `.cursor/` - Cursor-specific configuration
- `.github/` - GitHub configuration including CI workflows
- `.husky/` - Git hooks configuration
- `.roo/` - Roo-specific configuration and rules
- `.vscode/` - VS Code settings and recommendations
- `docs/` - Documentation files including comparisons and guides
- `scripts/` - Utility scripts
- `src/` - Source code of the tool
  - `config/` - Configuration and paths
  - `hooks/` - Git hooks implementation
  - `integrations/` - Integration with tools (Claude, Roo, VSCode, etc.)
  - `utils/` - Utility functions
- `tasks/` - Task documentation and tracking
- `tests/` - Test files and fixtures

Key files:
- `index.js` - Main entry point
- `package.json` - Project dependencies and scripts
- `CLAUDE.md` - Instructions for Claude assistant
- `README.md` - Project documentation and usage instructions

## Development Workflow

### Branch Naming Conventions

- `feature/` - For new features
- `fix/` - For bug fixes
- `docs/` - For documentation changes
- `refactor/` - For code refactoring
- `test/` - For adding or updating tests

Example: `feature/add-cursor-support`

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

Example: `feat(vscode): add support for Copilot configuration`

### Pull Request Process

1. Update your fork with the latest changes from the upstream repository:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Push your branch to your fork:
   ```bash
   git push -u origin feature/your-feature-name
   ```
3. Open a pull request on GitHub:
   - Provide a clear, descriptive title
   - Include a detailed description of the changes
   - Reference any related issues using `#issue-number`
   - Complete the pull request template

### Code Review Expectations

- All PRs must be reviewed by at least one maintainer
- Address review comments promptly
- Be open to feedback and willing to make requested changes
- Maintainers will merge PRs once they meet all requirements
- Be respectful and constructive in discussions

## Testing

### Running Tests

The project uses Jest for testing. Run the test suite with:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run a specific test file:

```bash
npm test -- tests/file-name.test.js
```

### Writing Tests

- Create test files in the `tests/` directory
- Name test files with the `.test.js` extension
- Use descriptive test and describe blocks
- Cover both success and error cases
- For integrations, use mock data from the `tests/fixtures/` directory

Example test structure:

```javascript
describe('Module name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something specific', () => {
    // Test code
    expect(result).toBe(expectedValue);
  });

  afterEach(() => {
    // Cleanup
  });
});
```

## Documentation

### Updating Documentation

- Documentation lives in the `docs/` directory and at the root level
- Each major feature should be documented either in-line or in separate files
- Update the README.md when adding new features
- Add usage examples where appropriate

### Documentation Style

- Use clear, concise language
- Include code examples for complex features
- Start each section with a brief overview
- Use proper Markdown formatting
- Include screenshots or diagrams where helpful

## Code Style

The project uses ESLint and Prettier for consistent code style. The configuration is provided in the root directory.

### Linting and Formatting

Run the linter:

```bash
npm run lint
```

Fix linting issues automatically:

```bash
npm run lint:fix
```

Format code with Prettier:

```bash
npm run format
```

### Style Guidelines

- Use ES6+ features
- Use async/await for asynchronous operations
- Add JSDoc comments for functions
- Keep functions small and focused
- Use descriptive variable and function names
- Follow the existing code structure and patterns

## MCP Server Contributions

If you're adding support for new MCP servers:

1. Add the server to the recommended list in the script
2. Update the documentation with details about the server
3. Provide a sample configuration
4. Include information about any authentication or setup requirements
5. Create appropriate test fixtures and unit tests

### MCP Configuration Structure

MCP configurations should follow this structure:

```javascript
{
  name: 'MCP Name',
  description: 'Brief description',
  setup: async function() {
    // Implementation
  }
}
```

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.