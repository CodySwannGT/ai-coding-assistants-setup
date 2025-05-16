# AI Coding Assistants Setup Documentation

Welcome to the documentation for AI Coding Assistants Setup. This directory contains detailed information about using and extending the tool.

## Table of Contents

- [AI Tools Comparison](./ai-tools-comparison.md) - Comparison of different AI coding assistants
- [MCP Configuration Examples](./mcp-config-examples.md) - Examples of how to configure MCP servers
- [Git Hooks](./hooks.md) - Information about the Git hooks provided by this tool
- [Example Prompts](./example-prompts.md) - Example prompts for AI assistants

## Getting Started

For basic usage instructions, please refer to the [README](../README.md) in the project root.

## Configuration

AI Coding Assistants Setup provides a flexible configuration system that allows you to customize its behavior for different project requirements. The tool handles:

1. **File merging** - Combining configuration files from this tool with the parent project
2. **Git hook setup** - Creating and configuring Git hooks for AI-powered code quality checks
3. **Development environment setup** - Installing and configuring required packages
4. **CI/CD integration** - Setting up GitHub workflows

## Template Files

The tool uses a set of template files to create the necessary configuration in your project. These templates are located in the `src/templates` directory and include:

- `.roo/rules/*.md` - Rules for Roo Code
- `.roo/rules-*/*.md` - Custom rules for Roo Code
- `.rooignore` - Files that Roo should ignore
- `.roo/settings.json` - Roo configuration
- `.roo/mcp.json` - MCP configuration for Roo
- `.roomodes` - Custom modes for Roo
- `.claude/settings.json` - Claude configuration
- `.claude/settings.local.json` - Local Claude configuration
- `.mcp.json` - MCP configuration
- `.mcp.local.json` - Local MCP configuration
- `CLAUDE.md` - Project context for Claude

## Contributing

If you'd like to contribute to the documentation, please follow the guidelines in the [CONTRIBUTING.md](../CONTRIBUTING.md) file.

## Support

If you have questions or need help, please open an issue on GitHub.