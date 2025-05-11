# AI Coding Assistants Setup

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)
[![NPM Downloads](https://img.shields.io/npm/dm/ai-coding-assistants-setup.svg)](https://www.npmjs.com/package/ai-coding-assistants-setup)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./contributing.md)
[![CI](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml)
[![Documentation](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/docs.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/docs.yml)

**Seamless setup of Claude Code and Roo Code AI assistants for JavaScript projects**

[Features](#key-features) • [Prerequisites](#prerequisites) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Git Hooks](#git-hooks) • [MCP Servers](#mcp-server-configuration) • [Examples](#example-scenarios) • [CLI Reference](#command-line-reference) • [Documentation](./docs/) • [FAQs](#frequently-asked-questions) • [Contributing](#contributing)

---

🔄 **Automate Configuration** • 🔒 **Secure Credentials** • 🧩 **MCP Integration**
🪝 **Smart Git Hooks** • 📝 **Code Quality Checks** • ⚙️ **Team Consistency**

</div>

## 🎯 Overview

AI Coding Assistants Setup is a comprehensive tool for streamlining the integration of modern AI coding assistants (Claude Code and Roo Code) into your JavaScript development workflow. With a single command, it handles everything from API credentials management to MCP server configuration, Git hooks integration, and project-specific settings, ensuring consistent experiences across your entire development team.

The tool enables developers to:

- Configure AI assistants with secure, encrypted credentials
- Set up intelligent Git hooks for AI-powered code review, commit messages, and diffs
- Integrate code quality checks for TypeScript, linting, and formatting
- Define customized AI assistant roles for specialized development tasks
- Configure MCP servers for enhanced AI capabilities
- Manage GitHub Copilot integration alongside other AI tools

By standardizing AI assistant configurations across your team, this tool eliminates setup inconsistencies, reduces onboarding time, and creates a consistent collaborative environment for AI-assisted development.

[📚 View detailed documentation](./docs/)

## 📋 Prerequisites

Before using this setup script, ensure your environment meets the following requirements:

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 7.0.0 or higher
- **Disk Space**: At least 100MB free space for dependencies and configurations
- **Memory**: Minimum 4GB RAM recommended for optimal AI assistant operation

### Required Software

- **VS Code**: Version 1.60.0 or higher
- **Git**: Version 2.30.0 or higher for Git hooks functionality

### Required API Keys

- **Anthropic API Key**: For Claude Code integration (can be obtained during setup)
- **Roo API Key**: For Roo Code integration (can be obtained during setup)
- *Optional*: GitHub Personal Access Token (for GitHub MCP integration)
- *Optional*: Context7 API Key (for Context7 MCP integration)

### Required Permissions

- File system access to create and modify configuration files
- Permission to install VS Code extensions
- *Optional*: Admin permissions for global installations
- *Optional*: Docker access for certain MCP servers

### Optional Dependencies

- **Docker**: For running containerized MCP servers
- **Python**: Version 3.8+ for certain AI tool extensions
- **GraphViz**: For visualization capabilities with the Memory MCP

### Compatibility

#### Operating System Compatibility

| OS | Status | Notes |
|---|---|---|
| **Windows 10/11** | ✅ Full Support | Works best with PowerShell |
| **macOS** | ✅ Full Support | Tested on macOS 12+ |
| **Linux (Ubuntu/Debian)** | ✅ Full Support | Tested on Ubuntu 20.04+ |
| **Linux (Other Distros)** | ⚠️ Partial Support | May require manual path configuration |
| **WSL** | ⚠️ Partial Support | VS Code integration requires additional setup |

#### Known Environment Issues

- **Corporate Proxies**: May require additional network configuration
- **Restricted Environments**: API access might be limited in certain corporate networks
- **VS Code Remote**: Some features have limited functionality in remote workspaces
- **VS Code Web**: Not currently supported in web-based VS Code instances

#### VS Code Extension Compatibility

| Extension | Compatibility | Notes |
|---|---|---|
| **GitHub Copilot** | ⚠️ Configurable | Can be disabled or configured to work alongside Claude/Roo |
| **GitLens** | ✅ Compatible | Works well with AI assistant git integrations |
| **ESLint/Prettier** | ✅ Compatible | No known conflicts |
| **Remote Development** | ⚠️ Partial | Some local file integrations may be limited |
| **Live Share** | ⚠️ Partial | AI assistants work independently for each participant |

### Troubleshooting Common Issues

- **API Connection Errors**: Ensure your API keys are valid and network allows API access
- **Permission Denied**: Run with elevated permissions or check file system access
- **VS Code Extension Not Found**: Manually install extensions if automatic installation fails
- **MCP Server Errors**: Check network access and API key validity
- **Configuration Conflicts**: Use the `--force` flag to override existing configurations
- **Authentication Issues**: Regenerate API keys and update `.env` file

## ✨ Key Features

- 🤖 **Automated Integration**: Configure both Claude Code and Roo Code with a single command
- 🔄 **Synchronized Configuration**: Keep settings in sync between both assistants
- 🔒 **Secure Credential Management**: Encrypt API keys with AES-256-CBC
- 🧩 **MCP Server Configuration**: Set up GitHub, Context7, Memory, and other MCP servers
- 📋 **Custom Modes for Roo**: Create specialized AI roles like TDD Developer, Security Reviewer, etc.
- 🏗️ **Project Structure Detection**: Works with both standard repositories and monorepos
- 🔍 **Intelligent Ignore Patterns**: Properly configure which files AI assistants should ignore
- ⚙️ **VS Code Optimization**: Configure editor settings for the best AI experience
- 🔄 **Git Hook Integration**: AI-powered Git hooks for code review, commit messages, and more
- 🎯 **Enhanced Code Quality Hooks**: TypeScript type checking, linting, and formatting integration
- 🔮 **AI-Enhanced Git Diff**: Explain code changes in natural language with context and issue detection

## 🚀 Installation

### Via npx (No Installation Required)

```bash
npx ai-coding-assistants-setup
```

### Global Installation

```bash
npm install -g ai-coding-assistants-setup
ai-coding-assistants-setup
```

### Local Project Installation

```bash
npm install --save-dev ai-coding-assistants-setup
npx ai-coding-assistants-setup
```

## 📋 Usage

### Quick Start

Run from your project's root directory:

```bash
npx ai-coding-assistants-setup
```

This will launch the interactive wizard that guides you through the setup process. The wizard detects your project structure, offers appropriate configuration options, and handles all the necessary file creation and modification.

### Common Workflows

| Task | Command |
|------|---------|
| **Initial Setup** | `npx ai-coding-assistants-setup` |
| **Update Existing Config** | `npx ai-coding-assistants-setup` (select "Update" option) |
| **Claude-Only Setup** | `npx ai-coding-assistants-setup` (select "Claude Code only") |
| **Roo-Only Setup** | `npx ai-coding-assistants-setup` (select "Roo Code only") |
| **Try Without Changes** | `npx ai-coding-assistants-setup --dry-run` |
| **Unattended Setup** | `npx ai-coding-assistants-setup --non-interactive` |
| **Explain Git Changes** | `npx ai-coding-assistants-setup --diff-explain` |
| **Uninstall All** | `npx ai-coding-assistants-setup --remove-all` |

### Setup Process

The interactive wizard will guide you through these steps:

1. **Setup Type Selection**
   - Complete setup (Claude and Roo)
   - Claude Code only
   - Roo Code only
   - Update existing configurations

2. **MCP Server Configuration**
   - GitHub integration
   - Context7 documentation access
   - Memory graph capabilities
   - Custom MCP servers

3. **Claude Code Configuration**
   - API key setup
   - Memory limits
   - Context settings
   - Project-specific configurations

4. **Roo Code Configuration**
   - Provider selection
   - Token limits
   - Custom modes
   - Auto-approval settings

5. **Git Hooks Setup**
   - AI-powered code review
   - Commit message assistance
   - Code quality integration
   - Branch strategy enforcement

## Command Line Reference

AI Coding Assistants Setup offers a comprehensive set of command-line options for various workflows:

### General Options

| Option | Description | Example |
|--------|-------------|---------|
| `--help` | Display help information | `npx ai-coding-assistants-setup --help` |
| `--version` | Show version information | `npx ai-coding-assistants-setup --version` |
| `--dry-run` | Show what would change without making changes | `npx ai-coding-assistants-setup --dry-run` |
| `--non-interactive` | Run with default settings without prompts | `npx ai-coding-assistants-setup --non-interactive` |
| `--force` | Override existing configurations | `npx ai-coding-assistants-setup --force` |
| `--verbose=<level>` | Set verbosity (0-3) | `npx ai-coding-assistants-setup --verbose=2` |

### Git Diff Explanation

| Option | Description | Example |
|--------|-------------|---------|
| `--diff-explain` | Explain staged changes | `npx ai-coding-assistants-setup --diff-explain` |
| `--diff-explain-commit <hash>` | Explain specific commit | `npx ai-coding-assistants-setup --diff-explain-commit 8fe3a97` |
| `--diff-explain-branch <name>` | Compare branch with current | `npx ai-coding-assistants-setup --diff-explain-branch main` |

### Uninstallation Options

| Option | Description | Example |
|--------|-------------|---------|
| `--list-files` | List all AI assistant files | `npx ai-coding-assistants-setup --list-files` |
| `--remove` | Remove AI assistant configurations | `npx ai-coding-assistants-setup --remove` |
| `--remove --dry-run` | Preview files to be removed | `npx ai-coding-assistants-setup --remove --dry-run` |
| `--remove-all` | Remove all, including VS Code settings | `npx ai-coding-assistants-setup --remove-all` |

### Example Usage Scenarios

See the [Example Scenarios](#example-scenarios) section below for real-world usage examples.

## ⚙️ Configuration

### Files Created and Modified

| File | Purpose | Description |
|------|---------|-------------|
| `.claude/settings.json` | Claude configuration | Project settings including memory limits and ignore patterns |
| `CLAUDE.md` | Project context | Primary context file for Claude Code |
| `.roo/settings.json` | Roo configuration | Configuration for Roo Code |
| `.roo/mcp.json` | Roo MCP config | MCP server configuration for Roo |
| `.roo/rules/` | Custom instructions | Directives for Roo Code |
| `.roomodes` | Custom mode definitions | Specialized AI roles for different tasks |
| `.rooignore` | Excluded files | Patterns for files Roo should ignore |
| `.mcp.json` | MCP configuration | Global MCP server configuration |
| `.gitignore` | Version control | Updated with AI-specific patterns |
| `.vscode/settings.json` | VS Code settings | Editor settings for AI assistants |
| `.env.example` | Environment variables | Template for required env variables |

## 🔧 Technical Architecture

AI Coding Assistants Setup employs a modular architecture with specialized components for different aspects of the configuration process:

```
┌───────────────────────┐      ┌─────────────────────┐
│ Project Detection     │─────▶│ Configuration       │
│                       │      │ Generation          │
└───────────────────────┘      └─────────────────────┘
                                          │
                                          ▼
┌───────────────────────┐      ┌─────────────────────┐
│ Credential Management │◀────▶│ MCP Server Setup    │
└───────────────────────┘      └─────────────────────┘
                                          │
                                          ▼
┌───────────────────────┐      ┌─────────────────────┐
│ Git Hooks Integration │◀────▶│ VS Code Integration │
└───────────────────────┘      └─────────────────────┘
```

### Core Components

1. **Project Detection Engine**
   - Analyzes project structure to identify type (standard/monorepo)
   - Detects `package.json` workspace configurations
   - Identifies monorepo tools (`pnpm-workspace.yaml`, `lerna.json`, `turbo.json`)
   - Scans for capability markers (TypeScript, linting tools, formatters)
   - Adapts configuration strategy based on detected project type

2. **Configuration Generator**
   - Creates standardized settings for both Claude and Roo Code
   - Handles differences between monorepo and standard setups
   - Generates project context in `CLAUDE.md`
   - Creates specialized rules in `.roo/rules/`
   - Sets up proper ignore patterns for both assistants

3. **Secure Credential Manager**
   - Implements AES-256-CBC encryption for API keys
   - Uses machine-specific encryption keys
   - Stores encrypted credentials in isolated files
   - Creates environment variable templates
   - Ensures sensitive data never enters version control

4. **MCP Server Integration Layer**
   - Configures multiple MCP server types
   - Handles environment variables for authentication
   - Sets up Docker-based and local MCP servers
   - Configures autoapprove lists for safe operations
   - Supports both global and project-level MCP configurations

5. **Git Hooks Orchestrator**
   - Sets up AI-powered code review hooks
   - Installs commit message assistance
   - Integrates code quality checks (TypeScript, linting, formatting)
   - Configures branch strategy enforcement
   - Adds AI-enhanced diff explanations

6. **VS Code Integration Module**
   - Configures editor settings optimized for AI assistants
   - Sets up extension recommendations
   - Customizes keyboard shortcuts
   - Creates consistent development environment
   - Manages Copilot integration if present

### Security Considerations

- **Key Isolation**: API keys are never stored in plain text
- **Environment Separation**: Local overrides for sensitive configurations
- **Access Control**: MCP servers configured with minimal required permissions
- **No Credential Sharing**: Each developer maintains their own encrypted keys
- **Template Guidance**: `.env.example` demonstrates correct setup without exposing keys

## 🪝 Git Hooks

AI Coding Assistants Setup provides a comprehensive Git hooks system that enhances your development workflow with AI-powered features and code quality checks.

### Available Git Hooks

| Hook Type | Description | Capabilities |
|-----------|-------------|--------------|
| **pre-commit** | Runs before commit is created | Code review, type checking, linting, formatting |
| **prepare-commit-msg** | Generates/edits commit message | AI-generated commit messages, conventional commits |
| **commit-msg** | Validates commit message | Format validation, spell checking, suggestions |
| **pre-push** | Runs before pushing changes | Security auditing, credential scanning |
| **post-merge** | Runs after merge/pull | Summary of merged changes, dependency analysis |
| **post-checkout** | Runs after switching branches | Branch context summaries, environment setup |
| **pre-rebase** | Runs before rebasing | Conflict prediction, breaking change detection |
| **branch-strategy** | Enforces branch naming | Rule enforcement, workflow validation |

### Code Quality Detection & Integration

The setup automatically detects your project's capabilities:

| Tool Type | Detected Tools | Integration |
|-----------|----------------|-------------|
| **Type Checking** | TypeScript | Auto-detects or creates `types:check` script |
| **Linting** | ESLint, TSLint, Standard | Integrates existing scripts or creates optimized ones |
| **Formatting** | Prettier, ESLint+Prettier | Uses existing scripts or suggests appropriate configs |
| **Commit Validation** | commitlint | Integrates with commit-msg hook |

### Intelligent Workflow Features

- **AI Code Review**: Claude analyzes staged changes for bugs, performance issues, and security vulnerabilities
- **Context-Aware Commit Messages**: Generates descriptive commit messages based on actual code changes
- **Diff Explanations**: Provides natural language explanations of code changes
- **Test-First Development**: Encourages creating tests before implementation code
- **Branch Strategy Enforcement**: Maintains consistent branch naming and workflow

### Configuration Options

Each hook can be configured with fine-grained settings:

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "blockingMode": "warn",
      "strictness": "medium",
      "reviewTypes": ["bugs", "security", "best-practices"],
      "typeCheck": {
        "enabled": true,
        "scriptName": "types:check"
      },
      "linting": {
        "enabled": true,
        "linter": "eslint",
        "scriptName": "lint"
      }
    }
  }
}
```

For complete reference and examples, see the [Git Hooks Documentation](./docs/hooks.md) and [Enhanced Hooks Documentation](./docs/enhanced-hooks.md).

## 📊 MCP Server Configuration

Modular Capability Providers (MCPs) extend AI assistants with specialized capabilities like GitHub access, documentation search, and more. This tool provides comprehensive MCP configuration at multiple levels:

### Supported MCP Servers

| Server Type | Capabilities | Authentication |
|------------|--------------|----------------|
| **GitHub** | Repository access, PRs, issues, code search | GitHub PAT |
| **Context7** | Documentation lookup, library references | Context7 API Key |
| **Memory** | Knowledge graph for context persistence | Local path or API |
| **StackOverflow** | Question lookup, code examples | StackExchange API Key |
| **Shell** | Secure command execution | Allowlist configuration |
| **Task Master** | Project management, task organization | Anthropic API Key |
| **Filesystem** | Secure file operations | Path restrictions |
| **Browser** | Web search, interaction simulation | None required |

### Configuration Hierarchy

The system employs a multi-level configuration approach:

1. **Global Configuration**:
   - System-wide MCP settings available to all projects
   - Default MCP capabilities and limitations
   - Located in user configuration directories

2. **Project Configuration**:
   - Committed to version control for team sharing
   - Located in `.mcp.json` (Claude) and `.roo/mcp.json` (Roo)
   - Defines project-specific MCP capabilities

3. **Local Overrides**:
   - Personal configurations not committed to version control
   - Located in `.mcp.json.local` and `.roo/mcp.json.local`
   - Contains sensitive authentication information

### Example MCP Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "context7-mcp": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "mcp-knowledge-graph", "--memory-path", "${MEMORY_PATH}"],
      "autoapprove": [
        "create_entities", "create_relations", "add_observations",
        "delete_entities", "delete_observations", "delete_relations",
        "read_graph", "search_nodes", "open_nodes"
      ]
    }
  }
}
```

### Task Master Integration

The tool provides specialized integration with Task Master AI for project management:

```
# .gitignore configuration for Task Master
.taskmasterconfig
tasks/*.txt
tasks/task_*.txt
# Keep project structure while ignoring individual task files
!tasks/tasks.json
```

### Security & Permissions

Each MCP server can be configured with granular permissions:

- **Auto-approval Lists**: Specific operations that don't require user confirmation
- **Environment Variables**: Secure credential management
- **Path Restrictions**: Limit filesystem access to specific directories
- **Command Allowlists**: Restrict allowed shell commands for security

For a comprehensive reference including all supported servers, configuration options, authentication methods, and usage examples, see our [MCP Reference Documentation](./docs/mcp-reference.md).

## 🚀 Example Scenarios

Below are real-world scenarios demonstrating how to use AI Coding Assistants Setup effectively in different development contexts.

### Scenario 1: Team Onboarding for a React Project

**Goal**: Configure AI assistants for a team starting a new React project with TypeScript.

```bash
# Initial setup by team lead
npx ai-coding-assistants-setup

# Select complete setup (Claude and Roo)
# Configure GitHub MCP with team repository access
# Enable enhanced Git hooks
# Create custom roles for Architecture and TDD
```

**Benefits**:
- Every team member gets identical configurations
- Shared MCP servers avoid duplicate setups
- Custom modes ensure consistent development practices
- Enhanced hooks enforce code quality standards
- `.env.example` provides clear credential requirements for new members

### Scenario 2: Solo Developer with TypeScript Monorepo

**Goal**: Optimize AI assistant setup for a solo developer working on a complex TypeScript monorepo.

```bash
# Navigate to monorepo root
cd my-monorepo-project

# Run setup with detection
npx ai-coding-assistants-setup

# Select Claude-only mode for simplicity
# Configure Memory MCP for project knowledge persistence
# Enable TypeScript type checking in hooks
# Configure workspace-aware settings
```

**Benefits**:
- Monorepo structure automatically detected
- Workspace-aware configurations applied
- TypeScript integration enhances code quality
- Memory MCP enables persistent knowledge across coding sessions

### Scenario 3: Open Source Maintainer

**Goal**: Set up AI assistance for managing an open source project with contributors.

```bash
# Setup with minimal configuration
npx ai-coding-assistants-setup

# Select full setup with Roo custom modes
# Configure GitHub MCP for PR reviews
# Set up enhanced commit-msg hook for message standards
# Add example prompts to CONTRIBUTING.md
```

**Benefits**:
- Standardized commit messages improve project history
- AI-assisted PR reviews for consistency
- Custom AI roles help maintain project standards
- Onboarding new contributors becomes easier

### Scenario 4: Legacy Code Migration

**Goal**: Configure AI assistance for a team migrating a legacy JavaScript project to TypeScript.

```bash
# Run setup with specialized configuration
npx ai-coding-assistants-setup

# Select both Claude and Roo
# Configure git diff-explain for code understanding
# Set up Context7 MCP for TypeScript documentation access
# Create migration-specific custom modes
```

**Benefits**:
- Git diff-explain helps understand complex changes
- Context7 provides up-to-date TypeScript documentation
- Custom modes optimize AI for migration tasks
- Enhanced hooks ensure migrated code meets quality standards

### Scenario 5: Enterprise Setup with Security Requirements

**Goal**: Configure AI assistants for an enterprise team with strict security requirements.

```bash
# Run setup with security focus
npx ai-coding-assistants-setup

# Select complete setup
# Configure secure credential storage
# Restrict MCP permissions with minimal access
# Set up Security Auditor custom mode
# Enable enhanced pre-push hook with security scanning
```

**Benefits**:
- Encrypted credential storage meets security requirements
- Restricted MCP permissions minimize security risks
- Security-focused hooks prevent sensitive data commits
- Audit trails for AI assistant usage

For more detailed examples and prompt templates, see our [Example Prompts Documentation](./docs/example-prompts.md).

## 🎭 Custom AI Roles

AI Coding Assistants Setup enables the creation of specialized AI roles with precisely defined capabilities and constraints, particularly through Roo Code custom modes.

### Role-Based AI Assistants

Custom modes define specialized AI personas for specific development tasks:

| Role | Purpose | Specialized Capabilities |
|------|---------|--------------------------|
| **Architect** | System design and planning | Architecture patterns, interface design |
| **TDD Developer** | Test-driven development | Writing tests first, minimal implementation |
| **Code Reviewer** | Quality assurance | Best practices, problem detection |
| **Security Auditor** | Security assessment | Vulnerability detection, secure coding |
| **Refactoring Expert** | Code improvement | Pattern recognition, maintainability improvements |
| **Documentation Writer** | Creating docs | Clear explanations, JSDoc/TSDoc |

### Permission Control System

Each role can have granular access permissions:

- **Read Access**: What files the assistant can read
- **Edit Access**: What files the assistant can modify
- **Command Access**: What system operations are available
- **File Pattern Restrictions**: RegEx-based file access control

### Example Custom Mode Configuration

```json
{
  "customModes": [
    {
      "slug": "architect",
      "name": "🏗️ Architect",
      "roleDefinition": "You are an expert software architect specializing in designing scalable, maintainable systems. You excel at creating clear architectural diagrams, defining interfaces, and planning project structure.",
      "groups": ["read", "edit", "command"],
      "customInstructions": "Focus on modular design principles, separation of concerns, and clear documentation of interfaces between components."
    },
    {
      "slug": "tdd",
      "name": "🧪 TDD Developer",
      "roleDefinition": "You are a test-driven development specialist who follows a strict red-green-refactor workflow. You always write tests before implementation code.",
      "groups": [
        "read",
        ["edit", {
          "fileRegex": "\\.(test|spec)\\.(js|ts|jsx|tsx)$",
          "description": "Test files only"
        }]
      ],
      "customInstructions": "Follow the TDD workflow: 1) Write a failing test, 2) Write minimal code to make the test pass, 3) Refactor while keeping tests green. Never write implementation before tests."
    },
    {
      "slug": "security",
      "name": "🔒 Security Auditor",
      "roleDefinition": "You are a cybersecurity expert specialized in identifying and remediating security vulnerabilities in code. You have deep knowledge of OWASP Top 10, secure coding practices, and common attack vectors.",
      "groups": ["read"],
      "customInstructions": "Focus on identifying potential security issues including: injection vulnerabilities, authentication problems, sensitive data exposure, XML vulnerabilities, access control issues, security misconfigurations, XSS, insecure deserialization, components with known vulnerabilities, and insufficient logging/monitoring."
    }
  ]
}
```

These modes are created in the `.roomodes` file and automatically configured by the setup tool based on your project's specific needs.

## 🧹 Uninstalling

The script provides comprehensive uninstall functionality to completely remove all AI assistant configurations when needed.

### Listing AI Assistant Files

To see what files would be affected without making any changes:

```bash
npx ai-coding-assistants-setup --list-files
```

This will display all AI assistant-related files and directories in your project.

### Dry Run Uninstall

To perform a dry run that shows what would be removed without actually removing anything:

```bash
npx ai-coding-assistants-setup --remove --dry-run
```

This is useful to preview the impact before committing to removal.

### Standard Uninstall

To remove all AI assistant configuration files:

```bash
npx ai-coding-assistants-setup --remove
```

This removes:
- `.claude/` directory and related files
- `.roo/` directory and related files
- `.mcp.json` and `.mcp.json.local` files
- `CLAUDE.md` file
- `.roomodes` file
- AI-related environment variables in `.env`
- Git hooks added by the script

Note: VS Code settings related to AI assistants are preserved by default.

### Complete Uninstall

To remove all AI assistant files including VS Code settings:

```bash
npx ai-coding-assistants-setup --remove-all
```

This performs a standard uninstall plus:
- Removes AI assistant settings from VS Code settings.json
- Removes AI assistant extensions from recommendations
- Removes GitHub Copilot from unwanted recommendations

## ❓ Frequently Asked Questions

### When should I run the script again?

Run the script again when:
- Onboarding new team members
- After major project structure changes
- When updating AI assistant tools
- When adding new MCP servers

### How are API keys handled?

API keys are:
1. Encrypted using AES-256-CBC
2. Stored in project-specific credential files
3. Protected by a machine-specific encryption key
4. Never committed to version control

### How does it work with monorepos?

For monorepos, the script:
- Detects workspace configurations
- Handles package paths correctly
- Configures AI tools to understand the workspace structure
- Sets appropriate ignore patterns

### Can I customize the configurations?

Yes! After the initial setup, you can:
- Edit the generated configuration files
- Create custom rules and modes
- Modify MCP server settings
- The script will respect your changes during updates

### Does it work with other AI assistants?

The script is specifically designed for Claude Code and Roo Code. However:
- The configuration approach is extensible
- Future versions may support additional assistants
- You can adapt the approach for other tools

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guide](./contributing.md) for details.

## 🙏 Acknowledgements

- The Claude Code team at Anthropic
- The Roo Code team
- All the contributors to the MCP ecosystem
- The JavaScript and VS Code communities

---

<div align="center">
Made with ❤️ by Cody Swann
</div>