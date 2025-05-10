# Contributing to AI Coding Assistants Setup

Thank you for considering contributing to this project! Here's how you can help.

## Ways to Contribute

- **Reporting bugs**: Open an issue describing the bug, how to reproduce it, and your environment
- **Suggesting features**: Open an issue describing the new feature and its potential benefits
- **Improving documentation**: Submit a PR with documentation updates or clarifications
- **Adding code**: Submit a PR with new features, bug fixes, or optimizations

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/CodySwannGT/ai-coding-assistants-setup.git
   cd ai-coding-assistants-setup
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Make your changes

4. Test your changes
   ```bash
   # Run tests
   npm test
   
   # Run the script in dry-run mode
   node index.js --dry-run
   ```

## Pull Request Process

1. Ensure your code follows the existing style and passes all tests
2. Update the README.md with details of changes if appropriate
3. The PR should work on all supported platforms (Windows, macOS, Linux)
4. Include a clear description of the changes made and reference any related issues

## Code Style

- Use clear, descriptive variable and function names
- Include JSDoc comments for functions and complex code
- Format your code using the provided Prettier configuration
- Follow the existing code structure and patterns

## MCP Server Contributions

If you're adding support for new MCP servers:

1. Add the server to the recommended list in the script
2. Update the documentation with details about the server
3. Provide a sample configuration
4. Include information about any authentication or setup requirements

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.