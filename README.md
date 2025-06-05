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

## 🚀 Quick Start

Get started in seconds with a single command:

```bash
npx ai-coding-assistants-setup
```

This command will:

- ✅ Analyze your project and detect existing tools
- ✅ Install and configure essential development tools (Husky, ESLint, Prettier, CommitLint)
- ✅ Set up GitHub Actions workflows for CI/CD
- ✅ Add required npm scripts for quality checks
- ✅ Create AI assistant configuration files
- ✅ Set up environment templates

### Options

```bash
npx ai-coding-assistants-setup --help              # Show help
npx ai-coding-assistants-setup --dry-run           # Preview changes without modifying files
npx ai-coding-assistants-setup --non-interactive   # Skip prompts, use defaults
npx ai-coding-assistants-setup --verbose           # Show detailed output
```

## 🚀 Overview

AI Coding Assistants Setup is a comprehensive toolkit that transforms your development workflow with enterprise-grade automation, quality assurance, and AI-powered assistance. This project provides production-ready configurations for Claude Code, Roo Code, and other AI assistants, along with automated workflows for code quality, security scanning, performance testing, and release management.

### 🤖 AI Coding Assistants

#### Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's official AI coding assistant that provides:

- **Intelligent Code Generation**: Write, debug, and refactor code with context-aware suggestions
- **Multi-file Editing**: Work across multiple files with understanding of your entire codebase
- **Integrated Terminal**: Execute commands and see results directly within your workflow
- **GitHub Integration**: Automated PR reviews and issue management
- **MCP Support**: Extensible through Model Context Protocol servers

[📚 Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code) | [🛠️ CLI Usage](https://docs.anthropic.com/en/docs/claude-code/cli-usage) | [🔧 Settings](https://docs.anthropic.com/en/docs/claude-code/settings)

#### Roo Code

[Roo Code](https://docs.roo.ai) is an AI-powered development environment that offers:

- **Mode-based Development**: Specialized modes for different tasks (architect, debugger, tester, etc.)
- **SPARC Methodology**: Structured approach to complex development workflows
- **Persistent Memory**: Maintains context across sessions through knowledge graphs
- **Custom Workflows**: Define project-specific modes and behaviors
- **Team Collaboration**: Share configurations and knowledge across your team

[📚 Roo Code Documentation](https://docs.roo.ai) | [🎯 SPARC Methodology](https://docs.roo.ai/sparc) | [⚙️ Custom Modes](https://docs.roo.ai/modes)

### Why Use This?

- **🏢 Enterprise Ready**: Battle-tested configurations used in production environments
- **🔒 Security First**: Automated security scanning, secret detection, and compliance checks
- **🚄 Performance Optimized**: Built-in load testing and performance monitoring
- **🤖 AI-Powered**: Leverage Claude and Roo's capabilities for code reviews, documentation, and more
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

> **Note**: The Quick Start command above (`npx ai-coding-assistants-setup`) is the recommended way to set up your project. The sections below provide additional details and manual setup options.

### What Gets Modified

When you run the setup command, the following changes will be made to your project:

#### Files Created

- `.github/workflows/` - CI/CD pipelines for quality checks and releases
- `.husky/` - Git hooks for pre-commit and commit message validation
- `.claude/` - Claude AI assistant configuration
- `.eslintrc.json` - ESLint configuration
- `.prettierrc.json` - Prettier formatting rules
- `commitlint.config.js` - Commit message standards
- `.env.example` - Environment variable template
- `CLAUDE.md` - Project context for AI assistants
- Various other configuration files

#### package.json Updates

The following scripts will be added (existing scripts are preserved):

```json
{
  "scripts": {
    "lint": "echo \"lint not configured yet\"",
    "typecheck": "echo \"typecheck not configured yet\"",
    "format:check": "echo \"format:check not configured yet\"",
    "build": "echo \"build not configured yet\"",
    "test": "echo \"test not configured yet\"",
    "test:unit": "echo \"test:unit not configured yet\"",
    "test:integration": "echo \"test:integration not configured yet\"",
    "test:e2e": "echo \"test:e2e not configured yet\""
  }
}
```

These are placeholder scripts that ensure your CI/CD workflows can run immediately. Replace them with your actual commands as you implement each tool.

### Optional Dependencies

After running the setup, you may want to install these development tools that the configuration files support:

```bash
# Code Quality Tools
npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier

# Git Hooks
npm install --save-dev husky
npx husky install

# Commit Standards
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# TypeScript (if using)
npm install --save-dev typescript @types/node

# Testing (choose based on your needs)
npm install --save-dev jest @types/jest           # For Jest
npm install --save-dev vitest                      # For Vitest
npm install --save-dev mocha chai                  # For Mocha/Chai
```

**Note:** The setup tool only copies configuration files. Installing these packages is optional and depends on which tools you want to use in your project.

### Manual Setup

If you prefer to set up manually or need to customize specific parts:

#### 1. Environment Configuration

Create a `.env` file in your project root:

```bash
# Only the Anthropic API key goes here
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
```

Configure additional API keys in `.claude/settings.local.json` (copy from `.claude/settings.local.json.example`):

- GitHub Personal Access Token
- Optional: Context7, Brave, Firecrawl API keys

See the [Environment Variables Documentation](./docs/ENVIRONMENT_VARS.md) for the complete reference of all available environment variables.

#### 2. Copy Required Files

Copy these files and directories to your project:

#### GitHub Workflows and Configuration

- `.github/workflows/quality.yml` - Automated quality checks for PRs (testing, linting, security scanning)
- `.github/workflows/release.yml` - Semantic release automation with changelog generation
- `.github/workflows/load-test.yml` - K6 performance testing pipeline
- `.github/workflows/ci.yml.example` - Example CI workflow caller for pull requests
- `.github/workflows/deploy.yml.example` - Example deployment workflow showing the complete pattern: release → deploy → load test
- `.github/workflows/k6/` - K6 test scripts and configurations
- `.github/workflows/scripts/` - Helper scripts for CI/CD operations
- `.github/code_review_guidelines.md` - Guidelines for AI-powered code reviews
- `.github/security_scan_guidelines.md` - Security scanning configuration
- `.github/dependabot.yml` - Automated dependency updates

**Note:** The workflow files (`quality.yml`, `release.yml`, `load-test.yml`) are reusable workflows. You need to create caller workflows in your project to use them. Example callers are provided in `ci.yml.example` and `deploy.yml.example`. See [Step 6: Create Workflow Callers](#6-create-workflow-callers) below for detailed instructions.

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

#### 3. Install Claude GitHub App

```bash
# Open Claude CLI
claude

# Install the GitHub app
/install-github-app
```

See [Claude GitHub Actions Documentation](https://docs.anthropic.com/en/docs/claude-code/github-actions) for more details.

#### 4. Configure GitHub Secrets

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

#### 5. Update package.json Scripts

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

#### 6. Create Workflow Callers

The workflow files you copied are reusable workflows. Create these caller workflows in your project's `.github/workflows/` directory. Example files are provided as `ci.yml.example` and `deploy.yml.example`.

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

#### Release and Deploy Workflow Caller (`deploy.yml`)

See `deploy.yml.example` for the complete pattern. The recommended approach:

```yaml
name: Deploy

on:
  push:
    branches:
      - main # Production
      - staging # Staging (includes automatic load testing)
      - develop # Development

jobs:
  # Step 1: Create release
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: ${{ github.ref_name }}
      release_strategy: 'semantic'
      require_approval: ${{ github.ref_name == 'main' }}
      node_version: '20'
    secrets: inherit

  # Step 2: Deploy application
  deploy:
    needs: release
    runs-on: ubuntu-latest
    steps:
      # Your custom deployment logic here

  # Step 3: Load test (staging only)
  load_test:
    needs: [release, deploy]
    if: github.ref_name == 'staging'
    uses: ./.github/workflows/load-test.yml
    with:
      environment: staging
      test_scenario: smoke
    secrets: inherit
```

**Note:** The workflows are separated for flexibility. See `deploy.yml.example` for the complete implementation with all features.

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
│   │   ├── release.yml    # Automated releases with deployment
│   │   ├── load-test.yml  # Performance testing
│   │   ├── ci.yml.example # Example CI caller workflow
│   │   └── deploy.yml.example # Example deployment workflow
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
- 📋 SBOM generation (optional)
- ✅ Compliance validation

### Deployment Workflow

The recommended pattern (see `deploy.yml.example`):

1. 📦 **Release Creation**: Calls release.yml for versioning
2. 🚀 **Custom Deployment**: Your deployment logic (AWS, K8s, etc.)
3. 🔍 **Load Testing**: Automatic for staging environments
4. 📊 **Monitoring**: Post-deployment health checks

#### Post-Deployment Load Testing

The deployment workflow pattern includes automatic load tests for staging. This follows best practices:

- **Why staging?** Load testing on production can impact real users and should be done sparingly
- **Why post-deployment?** Ensures the deployed application is tested in its actual environment
- **Automatic execution**: No manual intervention needed for staging deployments
- **Non-blocking**: Load test failures won't rollback the deployment but are reported for review

### Load Testing Workflow

Performance validation:

- 📊 K6 load tests
- 📈 Performance metrics
- 🎯 Threshold validation
- ☁️ Cloud test execution

## 📚 Documentation

- [Environment Variables Reference](./docs/ENVIRONMENT_VARS.md) - Complete list of all environment variables and secrets

### 🚀 Deployment and Load Testing Pattern

The recommended pattern separates concerns for maximum flexibility:

1. **Release Workflow** (`release.yml`): Creates semantic version, changelog, and GitHub release
2. **Deploy Workflow** (`deploy.yml.example`): Implements your custom deployment logic
3. **Load Test Workflow** (`load-test.yml`): Runs performance tests after deployment

#### Why This Pattern?

- **Flexibility**: Each project can implement its own deployment strategy (AWS, K8s, Vercel, etc.)
- **Reusability**: Release workflow remains unchanged across different deployment targets
- **Staging Load Tests**: Automatic load testing for staging, manual for production
- **Post-Deployment Testing**: Tests the actual deployed application, not just the build
- **Non-Blocking**: Load test failures are reported but don't rollback deployments

#### Implementing Your Deployment

1. Copy `deploy.yml.example` to `.github/workflows/deploy.yml`
2. Customize the `deploy` job with your deployment commands
3. The example includes:
   - AWS CDK deployment example
   - Environment URL output for load testing
   - Automatic load testing for staging
   - Post-deployment monitoring

#### Load Test Configuration

For staging deployments, the example workflow:

- Runs a smoke test (5 minutes, 50 virtual users)
- Uses the deployment URL from your deploy job
- Reports results without blocking the release
- Can be customized in the `load_testing` job

To run load tests manually or with different parameters, use the `load-test-caller.yml` example.

## 🔧 Development

### Local Testing

To test the npx command locally during development:

```bash
# Link the package globally
npm link

# Test the command
ai-coding-assistants-setup --help

# Or test with npx from the project directory
npx . --help
```

### Unlink After Testing

```bash
npm unlink -g ai-coding-assistants-setup
```

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
