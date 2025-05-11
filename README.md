# AI Coding Assistants Setup

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./contributing.md)
[![CI](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/ci.yml)
[![Documentation](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/docs.yml/badge.svg)](https://github.com/CodySwannGT/ai-coding-assistants-setup/actions/workflows/docs.yml)

**Seamless setup of Claude Code and Roo Code AI assistants for JavaScript projects**

[Features](#key-features) • [Prerequisites](#prerequisites) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [How It Works](#how-it-works) • [Tool Comparison](./docs/ai-tools-comparison.md) • [FAQs](#frequently-asked-questions) • [Contributing](#contributing)

</div>

## 🎯 Overview

This utility script automates the setup and configuration of Claude Code and Roo Code AI coding assistants within VS Code for JavaScript projects. It handles everything from API keys to MCP server configuration, ensuring both assistants work consistently across your team.

It also helps manage GitHub Copilot if installed, providing options for how these AI tools can work together or separately. See our [AI Tools Comparison](./docs/ai-tools-comparison.md) for details on when to use each assistant.

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

## 🚀 Installation

### Via npx (No Installation Required)

```bash
npx ai-coding-assistants-setup
```

### Global Installation

```bash
npm install -g ai-coding-assistants-setup
ai-assistant-setup
```

### Local Project Installation

```bash
npm install --save-dev ai-coding-assistants-setup
npx ai-assistant-setup
```

## 📋 Usage

### Basic Usage

Run from your project's root directory:

```bash
npx ai-coding-assistants-setup
```

Follow the interactive prompts to configure both AI assistants.

### Command Line Options

```bash
# Show help
npx ai-coding-assistants-setup --help

# Dry run (show what would happen without making changes)
npx ai-coding-assistants-setup --dry-run

# Non-interactive mode (use defaults)
npx ai-coding-assistants-setup --non-interactive

# Force overwrite existing configurations
npx ai-coding-assistants-setup --force

# Set verbosity level (0-3)
npx ai-coding-assistants-setup --verbose=2

# Uninstall/Removal options
npx ai-coding-assistants-setup --list-files              # List all AI assistant files without removing
npx ai-coding-assistants-setup --remove --dry-run        # Show what would be removed (no actual changes)
npx ai-coding-assistants-setup --remove                  # Remove AI assistant configuration files
npx ai-coding-assistants-setup --remove-all              # Remove config files + VS Code settings
```

### Setup Options

The script provides several setup options:

- **Complete Setup**: Configure both Claude Code and Roo Code
- **Single Assistant**: Configure only Claude Code or only Roo Code
- **Update Configuration**: Update existing configurations
- **MCP Servers Only**: Configure only the MCP server integration
- **VS Code Settings**: Update only VS Code editor settings
- **Uninstall**: Remove AI assistant configurations

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

## 🔧 How It Works

### 1. Project Detection

The script first identifies your project type (standard or monorepo) by:
- Checking for `package.json` workspaces property
- Detecting `pnpm-workspace.yaml` or `turbo.json`
- Analyzing directory structure

This allows it to adapt the configuration to your specific project structure.

### 2. Claude Code Configuration

For Claude Code, the script:
- Configures the memory limits based on project size
- Sets up API key encryption for security
- Creates project-specific settings in `.claude/settings.json`
- Generates the `CLAUDE.md` file for project context
- Configures proper ignore patterns

### 3. Roo Code Configuration

For Roo Code, the script:
- Sets up AI provider configurations (OpenAI, Anthropic)
- Configures token limits and operation auto-approvals
- Creates standard rules in `.roo/rules/` directory
- Sets up `.rooignore` file for proper file exclusion
- Configures custom modes for specialized AI roles

### 4. MCP Server Integration

The script provides flexible MCP server configuration:
- Configures GitHub, Context7, Memory, and other servers
- Synchronizes server settings between Claude and Roo
- Sets up appropriate environment variables
- Creates templates for sensitive configuration
- Supports local override files for personal settings

### 5. Git Integration

For proper version control integration:
- Updates `.gitignore` with appropriate patterns
- Ensures shared configurations are NOT ignored
- Makes sure sensitive files ARE ignored
- Creates `.env.example` with required variables

### 6. VS Code Integration

For optimal VS Code experience:
- Configures editor settings for AI assistants
- Recommends required extensions
- Sets up keyboard shortcuts optimizations
- Ensures consistent experience across the team

## 📊 MCP Server Configuration

The script provides flexible MCP server configuration at multiple levels:

### Task Master AI Integration

When using Task Master AI, this script automatically adds the proper configuration to your `.gitignore` file to ensure that task files aren't committed to version control:

```
# Task Master AI files
.taskmasterconfig
tasks/*.txt
tasks/task_*.txt
# Allow tracking tasks.json for project structure but not individual task files
!tasks/tasks.json
```

This prevents cluttering your repository with individual task files while still allowing you to track the main task configuration file (`tasks.json`) for project structure and task organization.

### Global MCP Servers

These servers are configured at the system level and available across all projects.

### Project MCP Servers

These are configured at the project level in `.mcp.json` and `.roo/mcp.json` and are committed to the repository for team sharing:

```json
// .mcp.json (for Claude Code)
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    },
    "context7-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "mcp-knowledge-graph", "--memory-path", "${MEMORY_PATH}"],
      "autoapprove": [
        "create_entities",
        "create_relations",
        "add_observations",
        "delete_entities",
        "delete_observations",
        "delete_relations",
        "read_graph",
        "search_nodes",
        "open_nodes"
      ]
    }
  }
}
```

### Local MCP Server Overrides

For personalized or sensitive configurations, the script creates:

1. **`.mcp.json.local`**: Personal Claude Code MCP servers (gitignored)
2. **`.roo/mcp.json.local`**: Personal Roo Code MCP servers (gitignored)

These override files use the same format as their non-local counterparts but are excluded from version control, allowing for:

- Personal API keys
- Developer-specific tool configurations
- Testing experimental MCP servers
- Environment-specific settings

## 🔧 Custom Modes for Roo Code

The script helps you set up specialized AI roles for different tasks:

```json
// .roomodes
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
    }
  ]
}
```

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