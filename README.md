# AI Coding Assistants Setup

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
[![Test](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml)

**Seamlessly integrate AI coding assistants into your development workflow**

[Features](#features) • [Prerequisites](#prerequisites) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md) • [License](#license)

</div>

---

## 🚀 Overview

AI Coding Assistants Setup is a powerful tool designed to streamline the integration of AI coding assistants like Claude Code and Roo Code into your development workflow. This tool automates configuration file management, sets up git hooks for AI-powered quality checks, and enhances your development experience with intelligent AI capabilities.

## ✨ Features

- 🔄 **Configuration File Management**
  - Merge configuration files (.roo, .claude, .mcp) with parent project
  - Handle file conflicts intelligently
  - Create necessary directories and files if they don't exist

- 🛠️ **Development Environment Setup**
  - Detect and install necessary packages (husky, lint-staged, etc.)
  - Configure ESLint, Prettier, and commitlint
  - Set up TypeScript if needed

- 🪝 **Git Hook Integration**
  - Create and configure .husky hooks
  - Implement quality checks via Claude (code review, security, performance)
  - Set up commit verification

- 🔄 **CI/CD Configuration**
  - Add GitHub workflows for continuous integration
  - Configure Dependabot for dependency management

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: Version 2.30.0 or higher (for Git hooks functionality)

## 🔧 Installation

```sh
# Using npm
npm install -g ai-coding-assistants-setup

# Using yarn
yarn global add ai-coding-assistants-setup

# Using npx (no installation required)
# Run directly with npx when needed
```

## 🏁 Usage

```sh
# Navigate to your project root
cd your-project

# Run the setup tool (if installed globally)
ai-coding-assistants-setup

# Or run directly with npx (no installation required)
npx ai-coding-assistants-setup
```

The tool will guide you through the setup process with interactive prompts and clear feedback.

## 📝 Configuration

The tool can be configured through various methods:

1. **Interactive Setup**: The default method, which guides you through the setup process.

2. **Configuration File**: You can create a `.ai-setup.json` file in your project root to customize the setup:

```json
{
  "aiTools": ["claude", "roo"],
  "setupHooks": true,
  "skipInstallation": false,
  "configFiles": {
    "merge": ["CLAUDE.md", ".rooignore"],
    "copy": [".roomodes", ".mcp.json"]
  }
}
```

3. **Command Line Options**: Override configuration options via command line flags:

```sh
ai-coding-assistants-setup --skip-installation --ai-tools claude,roo
```

## 📚 Documentation

For detailed documentation, please visit our [Documentation](./docs/README.md).

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guide](./CONTRIBUTING.md) for guidelines on how to proceed.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE.md) file for details.

## 🙏 Acknowledgments

- [Claude](https://www.anthropic.com/claude) - AI assistant by Anthropic
- [Roo](https://roo.ai) - AI coding assistant
- [Husky](https://typicode.github.io/husky/) - Git hooks tool
- [ESLint](https://eslint.org/) - JavaScript linter
- [Prettier](https://prettier.io/) - Code formatter
- [Jest](https://jestjs.io/) - Testing framework

---

<div align="center">

**Developed by [Cody Swann](https://github.com/CodySwannGT)**

</div>

