# AI Coding Assistants Setup

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
[![Test](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml)
[![Quality](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/quality.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/quality.yml)

**Enterprise-grade development workflow automation powered by AI coding assistants**

[Setup](#-setup) • [Features](#-features) • [Prerequisites](#-prerequisites) • [Documentation](#-documentation) • [Contributing](./CONTRIBUTING.md) • [License](#license)

</div>

---

## 🚀 Overview

AI Coding Assistants Setup is a comprehensive toolkit that transforms your development workflow with enterprise-grade automation, quality assurance, and AI-powered assistance. This project provides production-ready configurations for Claude Code, Roo Code, and other AI assistants, along with automated workflows for code quality, security scanning, performance testing, and release management.

### Why Use This?

- **🏢 Enterprise Ready**: Battle-tested configurations used in production environments
- **🔒 Security First**: Automated security scanning, secret detection, and compliance checks
- **🚄 Performance Optimized**: Built-in load testing and performance monitoring
- **🤖 AI-Powered**: Leverage Claude's capabilities for code reviews, documentation, and more
- **📊 Quality Assured**: Comprehensive testing frameworks and code quality tools
- **🔄 Fully Automated**: From commit to deployment with intelligent workflows

## ✨ Features

### 🤖 AI Assistant Integration

- **Claude Code Integration**: Automated code reviews, security analysis, and documentation generation
- **GitHub App Support**: Seamless integration with Claude's GitHub app for PR reviews
- **MCP Server Configuration**: Model Context Protocol support for enhanced AI capabilities
- **Custom Commands**: Pre-configured Claude commands for common development tasks

### 🛡️ Security & Compliance

- **Multi-layered Security Scanning**: GitGuardian, Snyk, and custom security checks
- **Secret Detection**: Automated scanning for exposed credentials and API keys
- **License Compliance**: FOSSA integration for license validation
- **Vulnerability Management**: Dependabot configuration for dependency updates

### 📈 Quality Assurance

- **Automated Code Reviews**: AI-powered reviews with customizable guidelines
- **Code Quality Analysis**: SonarCloud integration for maintainability metrics
- **Test Automation**: Support for unit, integration, and E2E testing
- **Performance Testing**: K6 load testing with cloud integration

### 🚀 CI/CD Workflows

- **GitHub Actions Workflows**: Production-ready pipelines for quality, release, and testing
- **Semantic Release**: Automated versioning and changelog generation
- **Multi-environment Support**: Configurations for dev, staging, and production
- **Rollback Capabilities**: Safe deployment with automated rollback options

### 🪝 Git Hooks & Automation

- **Pre-commit Hooks**: Automated linting, formatting, and security checks
- **Commit Message Standards**: Conventional commits with Jira integration
- **Branch Protection**: Automated checks before allowing merges
- **Change Detection**: Smart workflows that only run when needed

## 📋 Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: Version 2.30.0 or higher
- **GitHub Account**: For workflow automation
- **Claude API Key**: For AI-powered features

## 🏁 Setup

### 1. Environment Configuration

Create a `.env` file in your project root:

```bash
# Only the Anthropic API key goes here
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

Configure additional API keys in `.claude/settings.local.json` (copy from `.claude/settings.local.json.example`):

- GitHub Personal Access Token
- Optional: Context7, Brave, Firecrawl API keys

See the [Environment Variables Documentation](./docs/ENVIRONMENT_VARS.md) for the complete reference of all available environment variables.

### 2. Copy Required Files

Copy these files and directories to your project:

#### GitHub Workflows and Configuration

- `.github/workflows/quality.yml` - Automated quality checks for PRs (testing, linting, security scanning)
- `.github/workflows/release.yml` - Semantic release automation with changelog generation
- `.github/workflows/load-test.yml` - K6 performance testing pipeline
- `.github/workflows/k6/` - K6 test scripts and configurations
- `.github/workflows/scripts/` - Helper scripts for CI/CD operations
- `.github/code_review_guidelines.md` - Guidelines for AI-powered code reviews
- `.github/security_scan_guidelines.md` - Security scanning configuration
- `.github/dependabot.yml` - Automated dependency updates

**Note:** The workflow files (`quality.yml`, `release.yml`, `load-test.yml`) are reusable workflows. You need to create caller workflows in your project to use them. See [Step 6: Create Workflow Callers](#6-create-workflow-callers) below for detailed instructions.

#### Git Hooks

- `.husky/pre-commit` - Pre-commit checks (linting, formatting, tests)
- `.husky/commit-msg` - Commit message validation and Jira key detection

#### Claude Configuration

- `.claude/commands/project.md` - Custom Claude commands for your project
- `.claude/settings.json` - Claude project settings
- `.claude/settings.local.json.example` → `.claude/settings.local.json` - Local API keys and MCP configuration

#### Other Configuration Files

- `.mcp.json` - Model Context Protocol server configuration
- `sonar-project.properties.example` → `sonar-project.properties` - SonarCloud configuration
- `commitlint.config.js` - Commit message standards enforcement
- `.env.example` → `.env` - Environment variables template

### 3. Install Claude GitHub App

```bash
# Open Claude CLI
claude

# Install the GitHub app
/install-github-app
```

See [Claude GitHub Actions Documentation](https://docs.anthropic.com/en/docs/claude-code/github-actions) for more details.

### 4. Configure GitHub Secrets

Use the GitHub CLI to set up secrets from your `.env` file:

```bash
# Copy .github/workflows/.env.example to .github/workflows/.env
cp .github/workflows/.env.example .github/workflows/.env

# Edit the file with your values
# Then run:
gh secret set --env-file .github/workflows/.env
```

Required secrets:

- `PAT`: Your GitHub Personal Access Token

Optional secrets for enhanced features:

- Security scanning: `SONAR_TOKEN`, `SNYK_TOKEN`, `GITGUARDIAN_API_KEY`
- Release management: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- Load testing: `K6_CLOUD_TOKEN`
- AI Security scanning and code reviews: `ANTHROPIC_API_KEY`

See the [Environment Variables Documentation](./docs/ENVIRONMENT_VARS.md) for details on all available secrets.

### 5. Update package.json Scripts

Ensure your `package.json` includes these scripts:

```json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "build": "your-build-command"
  }
}
```

### 6. Create Workflow Callers

The workflow files you copied are reusable workflows. Create these caller workflows in your project's `.github/workflows/` directory:

#### Quality Workflow Caller (`ci.yml`)

```yaml
name: CI

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches:
      - main
      - develop

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    secrets: inherit
```

#### Release Workflow Caller (`release-caller.yml`)

```yaml
name: Release

on:
  push:
    branches:
      - main
      - next
      - beta
      - alpha

jobs:
  release:
    uses: ./.github/workflows/release.yml
    secrets: inherit
```

#### Load Test Workflow Caller (`load-test-caller.yml`)

```yaml
name: Load Test

on:
  workflow_dispatch:
    inputs:
      test_file:
        description: 'K6 test file to run'
        required: true
        default: 'basic-load-test.js'
      duration:
        description: 'Test duration (e.g., 30s, 5m)'
        required: false
        default: '1m'
      vus:
        description: 'Number of virtual users'
        required: false
        default: '10'

jobs:
  load-test:
    uses: ./.github/workflows/load-test.yml
    with:
      test_file: ${{ github.event.inputs.test_file }}
      duration: ${{ github.event.inputs.duration }}
      vus: ${{ github.event.inputs.vus }}
    secrets: inherit
```

## 📁 Project Structure

```
your-project/
├── .github/
│   ├── workflows/         # CI/CD pipelines
│   │   ├── quality.yml    # Code quality checks
│   │   ├── release.yml    # Automated releases
│   │   └── load-test.yml  # Performance testing
│   ├── code_review_guidelines.md
│   └── security_scan_guidelines.md
├── .claude/               # Claude configuration
│   ├── commands/
│   └── settings.json
├── .husky/                # Git hooks
├── docs/                  # Documentation
├── src/                   # Your source code
└── tests/                 # Test suites
```

## 🔄 Workflows

### Quality Workflow

Runs on every pull request:

- 🧪 Automated testing (unit, integration, E2E)
- 🔍 Code quality analysis
- 🛡️ Security scanning
- 📏 Code coverage reporting
- 🤖 AI-powered code review

### Release Workflow

Automated semantic releases:

- 📦 Version bumping
- 📝 Changelog generation
- 🏷️ Git tagging
- 📢 Release notifications
- 🔐 Signed releases (optional)

### Load Testing Workflow

Performance validation:

- 📊 K6 load tests
- 📈 Performance metrics
- 🎯 Threshold validation
- ☁️ Cloud test execution

## 📚 Documentation

- [Environment Variables Reference](./docs/ENVIRONMENT_VARS.md) - Complete list of all environment variables and secrets

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE.md) file for details.

## 🙏 Acknowledgments

- [Claude](https://www.anthropic.com/claude) - AI assistant by Anthropic
- [GitHub Actions](https://github.com/features/actions) - CI/CD platform
- [K6](https://k6.io/) - Load testing framework
- [SonarCloud](https://sonarcloud.io/) - Code quality platform
- [Husky](https://typicode.github.io/husky/) - Git hooks management

---

<div align="center">

**Built with ❤️ by [Cody Swann](https://github.com/CodySwannGT)**

[Report Bug](https://github.com/CodySwannGT/ai-coding-assistants-setup/issues) • [Request Feature](https://github.com/CodySwannGT/ai-coding-assistants-setup/issues) • [Documentation](./docs/)

</div>
