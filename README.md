## MCP Server Configuration

The script provides flexible MCP (Model Context Protocol) server configuration at multiple levels:

### Global MCP Servers

These servers are configured at the system level and available across all projects:

```bash
# Location varies by platform
# Windows: %APPDATA%/Code/User/globalStorage/anthropic.claude-code/settings.json
# macOS: ~/Library/Application Support/Code/User/globalStorage/anthropic.claude-code/settings.json
# Linux: ~/.config/Code/User/globalStorage/anthropic.claude-code/settings.json
```

During setup, the script asks if you want to configure global MCP servers:

```
==========================================================
  Configuring Global MCP Servers
==========================================================

Would you like to configure global MCP servers? These will be
available in all projects you work on. [Y/n]

Select global MCP servers to configure:
 ◉ github (Repository awareness)
 ◉ context7 (Code understanding)
 ◉ memory (Knowledge persistence)
 ◉ taskmaster-ai (Task management)
 ◯ jira (Task integration)
 ◯ fetch (API communication)
 ◯ browser (Web content retrieval)
```

### Project MCP Servers

These are configured at the project level in `.mcp.json` and `.roo/mcp.json` and are committed to the repository for team sharing:

```json
// .mcp.json (for Claude Code)
{
  "servers": ["github", "context7", "memory", "taskmaster-ai"],
  "serverConfigs": {
    "github": {
      "owner": "yourOrg",
      "repo": "yourRepo",
      "branch": "main"
    },
    "context7": {
      "depth": 3,
      "includeTests": true
    },
    "memory": {
      "persistence": true,
      "sessionLength": "7d"
    },
    "taskmaster-ai": {
      "priority": "high",
      "trackCompletion": true
    }
  }
}
```

```json
// .roo/mcp.json (for Roo Code)
{
  "enabled": true,
  "servers": ["github", "context7", "memory", "taskmaster-ai"],
  "configs": {
    "github": {
      "owner": "yourOrg",
      "repo": "yourRepo"
    },
    "context7": {
      "depth": 3,
      "includePackages": true
    },
    "memory": {
      "persistence": true,
      "sessionLength": "7d"
    },
    "taskmaster-ai": {
      "priority": "high",
      "trackCompletion": true
    }
  }
}
```

### Local MCP Server Overrides

For personalized or sensitive configurations, the script creates:

1. **`.mcp.json.local`**: Personal Claude Code MCP servers (gitignored)
2. **`.roo/mcp.json.local`**: Personal Roo Code MCP servers (gitignored)

```
==========================================================
  Configuring Local MCP Server Overrides
==========================================================

Would you like to configure personal MCP servers? These will be
specific to your machine and won't be shared with your team. [Y/n]
```

These override files use the same format as their non-local counterparts but are excluded from version control, allowing for:

- Personal API keys
- Developer-specific tool configurations
- Testing experimental MCP servers
- Environment-specific settings

During setup or updates, the script ensures these local override files are properly excluded from git.

### MCP Tool Prioritization

The script configures both Claude Code and Roo Code to proactively use available MCP tools by:

1. **Priority Configuration in Claude**:
   ```json
   // In .claude/settings.json
   {
     "memoryLimit": 2048,
     "mcpServers": ["github", "context7", "memory", "taskmaster-ai"],
     "mcpPreferences": {
       "useMcpWhenAvailable": true,
       "preferMcpOverInternal": true
     }
   }
   ```

2. **Automatic Tool Usage in Roo**:
   ```json
   // In .roo/settings.json
   {
     "maxTokens": 16000,
     "mcpSettings": {
       "autoDetectAndUse": true,
       "alwaysSuggestTools": true
     }
   }
   ```

3. **Custom Instructions**:
   For both assistants, the script adds directives to use MCP tools when available:
   
   For Claude in `CLAUDE.md`:
   ```markdown
   # Project Context
   
   ## MCP Tool Usage
   Always check for available MCP tools before attempting to solve a problem directly.
   Prioritize using MCP tools when they can help with a task - they provide enhanced
   capabilities beyond your base functionality.
   ```
   
   For Roo in `.roo/rules/03-mcp-tools.md`:
   ```markdown
   # MCP Tool Usage Guidelines
   
   1. Always check for and use MCP tools when available
   2. Prioritize MCP tools over built-in capabilities when appropriate
   3. Suggest MCP tools to users when they would help solve a problem
   ```

This approach ensures both assistants actively look for and utilize MCP servers rather than relying solely on their built-in capabilities.### Custom Modes for Roo Code

As part of the setup process, the script prompts you to select which custom modes you'd like to create for Roo Code:

```
==========================================================
  Setting up Roo Code Custom Modes
==========================================================

Which custom modes would you like to create?
 ◉ 🏗️ Architect (System design and architecture)
 ◉ 🧪 TDD Developer (Test-driven development)
 ◉ 🔒 Security Reviewer (Security audits)
 ◉ 📝 Documentation Writer (Creating documentation)
 ◯ 📊 Data Analyst (Data processing and visualization)
 ◯ 🚀 DevOps Engineer (Infrastructure and deployment)
 ◯ 🔍 Code Reviewer (Code quality and standards)
```

For each selected mode, the script creates:
1. An entry in the `.roomodes` configuration file
2. A corresponding rules directory (e.g., `.roo/rules-tdd/`) with mode-specific guidelines

Here's an example of the `.roomodes` file with several useful predefined modes:

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
      "name": "🔒 Security Reviewer",
      "roleDefinition": "You are a cybersecurity expert specializing in code review for security vulnerabilities. You analyze code for potential security issues and suggest secure alternatives.",
      "groups": ["read"],
      "customInstructions": "Focus on identifying: 1) Injection vulnerabilities, 2) Authentication flaws, 3) Sensitive data exposure, 4) Cross-site scripting (XSS), 5) Insecure dependencies, 6) Hard-coded credentials."
    },
    {
      "slug": "docs",
      "name": "📝 Documentation Writer",
      "roleDefinition": "You are a technical writer who specializes in creating clear, comprehensive documentation for developers and users.",
      "groups": [
        "read",
        ["edit", { 
          "fileRegex": "\\.(md|txt|mdx)$", 
          "description": "Documentation files only" 
        }]
      ],
      "customInstructions": "Create documentation that is: 1) Clear and concise, 2) Well-structured with headings, 3) Includes examples, 4) Explains both 'how' and 'why', 5) Uses consistent terminology."
    }
  ]
}
```

This mode-based approach allows team members to:
- Use specialized AI assistants for different tasks
- Apply appropriate restrictions based on task context (e.g., TDD mode can only edit test files)
- Maintain consistent behavior across the team
- Switch between roles seamlessly as development progresses## Configuration Synchronization

One of the script's most important features is keeping configurations synchronized between Claude Code and Roo Code. Here's how it maintains consistency:

### MCP Server Synchronization

The script maintains two separate MCP configuration files but ensures they remain in sync:

1. **Source of Truth**: The script uses `.mcp.json` as the primary configuration source
2. **Synchronization Process**:
   - When MCP servers are added/removed/configured in `.mcp.json`
   - The script automatically updates `.roo/mcp.json` with equivalent settings
   - Field names are mapped appropriately (e.g., `serverConfigs` → `configs`)
   - Server-specific options are preserved for each assistant

```javascript
// Example of the synchronization logic
function syncMcpConfigurations() {
  const claudeMcp = readJsonFile('.mcp.json');
  const rooMcp = {
    enabled: true,
    servers: claudeMcp.servers,
    configs: {}
  };
  
  // Transform Claude's config format to Roo's format
  for (const [server, config] of Object.entries(claudeMcp.serverConfigs)) {
    rooMcp.configs[server] = adaptConfigForRoo(server, config);
  }
  
  writeJsonFile('.roo/mcp.json', rooMcp);
}
```

### Ignore Pattern Synchronization

Since Claude and Roo use different mechanisms for ignoring files:

1. **Common Ignore Patterns**: The script maintains a master list of patterns
2. **Format Adaptation**:
   - For Claude: Patterns go into `.claude/settings.json` as `ignoredPatterns` array
   - For Roo: Patterns go into `.rooignore` as newline-separated text
3. **Automatic Updates**: When you add/remove patterns, the script updates both formats

### Project Context Synchronization

The script keeps project context information synchronized using these strategies:

1. **Coding Standards**:
   - Primary in `.roo/rules/01-coding-standards.md`
   - Included in `CLAUDE.md` using the `@` syntax: `@/.roo/rules/01-coding-standards.md to ./CLAUDE.md`

2. **Architecture Guide**:
   - Primary in `.roo/rules/02-architecture-guide.md`
   - Included in `CLAUDE.md` using the `@` syntax: `@/.roo/rules/02-architecture-guide.md to ./CLAUDE.md`

3. **File References**:
   - Important files referenced in `CLAUDE.md` using: `@/path/to/file.js to ./CLAUDE.md`
   - Roo Code automatically has access to these files without explicit inclusion

### Settings Synchronization

The script carefully manages settings that should be equivalent across assistants:

1. **Memory Settings**: Proportionally configured based on capabilities
   - Claude: `memoryLimit` in `.claude/settings.json`
   - Roo: `maxTokens` in `.roo/settings.json`

2. **Provider Configurations**: When possible, uses the same API keys
   - Anthropic keys are synchronized between both assistants
   - Provider-specific settings remain in their respective configs

3. **Context Windows**: Balanced according to assistant capabilities
   - Claude's context window is set to 80% of Roo's `maxTokens` setting
   - This adjustment accounts for their different token counting methods

### Roo Modes to Claude Mapping

While Roo Code supports explicit mode switching, Claude does not have an equivalent feature. The script provides a workaround:

1. **Simulation Approach**: For each Roo mode, the script creates a special section in `CLAUDE.md` that can be uncommented to achieve similar behavior
2. **Mode Instructions**: Each mode section contains special instructions that simulate Roo's mode behavior
3. **User Documentation**: The script generates a guide explaining how to "switch modes" in Claude by uncommenting different sections

### Synchronization During Updates

When you run the script again to update configurations:

1. The script detects all existing configuration files
2. It reads both Claude and Roo configurations
3. It identifies any divergence that may have occurred
4. It prompts for reconciliation of differences
5. It applies synchronized updates to maintain consistency### Sample Configuration Files

#### Claude's Ignored Patterns (in `.claude/settings.json`)

```json
{
  "memoryLimit": 2048,
  "ignoredPatterns": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    ".env",
    "*.log",
    ".next/**",
    "coverage/**",
    "**/credentials.json",
    "**/secrets.json",
    "**/*.pem",
    "**/*.key"
  ],
  "mcpServers": ["github", "context7", "memory"]
}
```

#### Roo's Ignore File (`.rooignore`)

```
# Standard patterns to ignore
node_modules/
dist/
build/
.git/
.env
.env.*
*.log
.next/
.tsbuildinfo
coverage/

# Sensitive files
**/credentials.json
**/secrets.json
**/*.pem
**/*.key
```

This shows the key difference in how the two assistants handle ignored files - Claude uses a configuration setting while Roo uses a dedicated ignore file.# AI Coding Assistant Integration for JavaScript Projects

This utility script seamlessly configures both Claude Code and Roo Code within VS Code for any JavaScript project, including monorepos. It provides your team with powerful AI coding assistants that follow consistent configuration patterns and security best practices, adapting automatically to your project structure.

## Quick Start

The quickest way to run the script is using npx:

```bash
# Run directly without installation
npx ai-assistant-setup

# Alternatively, if you want to see what will be done first
npx ai-assistant-setup --dry-run
```

No installation or downloads are required. The script will be downloaded and executed on-the-fly.

## What This Script Does

At a high level, this script:

1. **Automates integration** of both Claude Code and Roo Code with your JavaScript project
2. **Detects project structure** and adapts configuration for both standard repos and monorepos
3. **Standardizes configurations** across your team for consistent AI assistant behavior
4. **Secures API keys and credentials** using industry best practices
5. **Configures shared memory systems** for project context awareness
6. **Validates and updates ignore patterns** to prevent sensitive files from being committed while ensuring important configuration is shared
7. **Sets up VS Code settings** to optimize the AI assistant experience

## Files Created & Modified

The script creates and modifies the following files:

| File | Purpose | Description |
| ---- | ------- | ----------- |
| `.claude/settings.json` | Claude configuration | Project-specific settings for Claude Code including memory limits, ignored patterns, and MCP servers |
| `.claude/credentials.json.enc` | Encrypted credentials | Securely stored API keys for Claude Code (encrypted) |
| `CLAUDE.md` | Project context | Primary context file for Claude Code with project descriptions and relevant file paths |
| `.roo/settings.json` | Roo configuration | Configuration for Roo Code including AI providers, memory settings, and tool permissions |
| `.roo/mcp.json` | Roo MCP configuration | MCP server configuration specific to Roo Code |
| `.roo/rules/` | Custom instructions | Directory containing markdown files with custom instructions for Roo Code |
| `.roo/rules/01-coding-standards.md` | Coding standards | Defines coding standards for AI assistants to follow |
| `.roo/rules/02-architecture-guide.md` | Architecture guide | Explains project architecture for AI context |
| `.roomodes` | Custom mode definitions | JSON configuration file for Roo Code's custom modes |
| `.roo/rules-{mode-slug}/` | Mode-specific rules | Directories containing custom instructions for specific Roo modes |
| `.rooignore` | Excluded files | Patterns for files that Roo Code should ignore |
| `.gitignore` | Version control exclusions | Updated with AI-specific files that should not be committed |
| `.vscode/settings.json` | VS Code configuration | Editor settings optimized for AI assistant usage |
| `.mcp.json` | Claude MCP configuration | Global configuration for Model Context Protocol servers used by Claude |
| `.ai-credentials.template.json` | Credentials template | Template for API keys that can be committed without exposing actual credentials |

### Project Detection & Configuration

- **Project Structure Detection**: Automatically identifies whether you're using a standard repository or monorepo
- **Monorepo Support**: Detects workspace configurations in `package.json`, `pnpm-workspace.yaml`, or other monorepo indicators
- **Workspace Package Recognition**: Identifies packages, apps, and other directories to properly configure path handling

### Security & Credentials Management

- **Secure API Key Handling**: Encrypts API keys using AES-256-CBC with a user-specific key stored in `~/.ai-assist-key`
- **Separation of Concerns**: Keeps shared settings separate from sensitive credentials
- **Gitignore Updates**: Automatically adds patterns to exclude credential files from version control
- **Credential Template**: Creates non-sensitive template files that can be committed, showing which credentials are needed

### Ignore File Management

- **AI-Specific Ignore Patterns**: Creates `.rooignore` and updates `.gitignore` with appropriate patterns
- **Gitignore Validation**: Checks existing `.gitignore` for potentially problematic patterns that might expose sensitive files or cause AI tools to access too many files
- **Interactive Correction**: If problematic patterns are found in `.gitignore`, prompts the user with:
  ```
  The following patterns in .gitignore may cause issues:
  - "!.env.example" (may expose environment variables)
  - "!credentials/*.example.json" (may expose credentials)
  
  Would you like to remove these patterns? [Y/n]
  ```
- **Comprehensive Default Patterns**: Configures ignores for:
  - `node_modules/` and other dependency directories
  - `dist/`, `build/`, and other output folders
  - `.git/` and other version control directories
  - `.env`, `.env.*` and other environment files
  - `*.log` and other log files
  - Cache directories for various build tools
  - Credential files like `**/credentials.json`, `**/secrets.json`
  - Certificate files like `**/*.pem`, `**/*.key`

### Shared Memory System Configuration

- **Team Context Sharing**: Creates shared context files that can be committed to git
- **Cross-Assistant Compatibility**: Sets up memory systems that work with both Claude Code and Roo Code
- **Context Format Standardization**: Ensures consistent formatting of context information for both assistants
- **Persistent Memory Configuration**: Configures memory servers for both assistants

### MCP Server Setup

The script configures MCP servers for both assistants with appropriate configuration files:

#### Claude MCP Configuration (`.mcp.json`):
```json
{
  "servers": ["github", "context7", "memory"],
  "serverConfigs": {
    "github": {
      "owner": "yourOrg",
      "repo": "yourRepo",
      "branch": "main"
    },
    "context7": {
      "depth": 3,
      "includeTests": true
    },
    "memory": {
      "persistence": true,
      "sessionLength": "7d"
    }
  }
}
```

#### Roo MCP Configuration (`.roo/mcp.json`):
```json
{
  "enabled": true,
  "servers": ["github", "context7", "memory"],
  "configs": {
    "github": {
      "owner": "yourOrg",
      "repo": "yourRepo"
    },
    "context7": {
      "depth": 3,
      "includePackages": true
    },
    "memory": {
      "persistence": true,
      "sessionLength": "7d"
    }
  }
}
```

The script ensures both configurations are synchronized to provide consistent behavior across both assistants.

### VS Code Integration

- **Settings Configuration**: Creates or updates `.vscode/settings.json` with:
  ```json
  {
    "editor.inlineSuggest.enabled": true,
    "editor.inlineSuggest.showToolbar": "always",
    "claude.enableAutoCompletion": true,
    "rooCode.useIgnoreFiles": true,
    "rooCode.autoApproveReads": true,
    "git.ignoreLimitWarning": true
  }
  ```
- **Extension Recommendations**: Creates or updates `.vscode/extensions.json` with recommended extensions
- **Default Configuration**: Ensures consistent editor behavior across the team

### Project-Specific Documentation

- **AI Usage Guide**: Creates `docs/ai-assistants-guide.md` with usage instructions 
- **Custom Instructions**: Sets up custom instruction files in `.roo/rules/` directory
- **Examples**: Provides usage examples in documentation files

## When to Run the Script Again

Run the script again when:

1. **Onboarding New Team Members**: Help them get the same AI assistant setup as the rest of the team
2. **Updating AI Tool Versions**: When Claude Code or Roo Code releases major updates
3. **Adding New MCP Servers**: To expand AI capabilities with additional context sources
4. **Switching Projects**: When moving to a different project
5. **Changing Security Requirements**: When API keys or authentication methods change
6. **After Major Refactoring**: When project structure changes significantly
7. **After Package Updates**: When adding or removing major packages/dependencies
8. **Upon Claude or Roo Updates**: When new versions with different configuration requirements are released

## What Happens During Re-runs

When run again, the script:

1. **Detects Existing Configuration**: Identifies which files already exist:
   - `.claude/settings.json`
   - `.roo/settings.json`
   - `.vscode/settings.json`
   - `.mcp.json` and `.roo/mcp.json`
   - `.rooignore`
   - `CLAUDE.md`

2. **Offers Update Options**: Presents a menu with these choices:
   ```
   What would you like to do?
   > Update both Claude Code and Roo Code
     Update only Claude Code
     Update only Roo Code
     Reconfigure MCP servers
     Update ignore patterns only
     Update VS Code settings only
   ```

3. **Preserves Custom Settings**: Detects and maintains:
   - Custom MCP server configurations
   - Custom rules in `.roo/rules/` directory
   - Manual edits to `CLAUDE.md`
   - User-specific VS Code settings

4. **Validates Gitignore**: Scans `.gitignore` for problematic patterns:
   - Identifies patterns that might expose sensitive files (like negated `.env` patterns)
   - Suggests removals or modifications to maintain security
   - Asks for permission before making changes to existing `.gitignore` entries

5. **Updates Ignore Patterns**: Based on current project structure:
   - Scans project for new directories to ignore
   - Adds patterns for newly discovered build outputs
   - Ensures credential files are properly excluded

6. **Checks for Extensions**: Verifies these VS Code extensions are installed:
   - `anthropic.claude-code`
   - `roo.roo-code`
   - `aaron-bond.better-comments`
   - `dbaeumer.vscode-eslint`
   - `esbenp.prettier-vscode`
   - `editorconfig.editorconfig`

7. **Updates Shared Memory Configuration**: Ensures both assistants share context:
   - Updates MCP configurations with latest memory server settings
   - Configures memory retention settings based on project size
   - Synchronizes context references between Claude and Roo

8. **Project Structure Validation**: Verifies structure is valid:
   - Checks for proper package.json configuration
   - Validates workspace package references for monorepos
   - Ensures proper directory structure

## Command Line Arguments

The script supports several command line arguments:

```bash
# Show help information
npx ai-assistant-setup --help

# Perform a dry run without making changes
npx ai-assistant-setup --dry-run

# Skip interactive prompts (use defaults)
npx ai-assistant-setup --non-interactive

# Force overwrite of existing configurations
npx ai-assistant-setup --force

# Set verbosity level (0-3)
npx ai-assistant-setup --verbose=2
```

## Troubleshooting

### Common Issues

| Issue | Solution |
| ----- | -------- |
| **"Project root not found"** | Verify your project has `package.json` |
| **"API key validation failed"** | Check that your Anthropic/OpenAI keys are valid with proper permissions |
| **"Extension installation failed"** | Install VS Code extensions manually through the Extensions panel |
| **"Permission denied" errors** | Run with `sudo` if needed or check file permissions |
| **"Encryption key could not be created"** | Ensure you have write permissions to your home directory |
| **"Unable to detect project structure"** | Verify workspace configuration in `package.json` or presence of appropriate directories |
| **Configuration not being detected** | Check if running from the correct directory (should be project root) |
| **API request errors** | Verify your internet connection and API endpoint availability |
| **Gitignore validation warnings** | Review your `.gitignore` file for patterns that might exclude configuration files that should be shared or include sensitive files |
| **Missing shared files after git pull** | Check if important configuration files are incorrectly in `.gitignore` |

### Logs and Debugging

The script creates detailed logs at `.ai-assistants/logs/setup.log`. Log levels include:

- `INFO`: Standard operation information
- `WARN`: Non-critical issues that were handled
- `ERROR`: Problems that prevented completion of specific tasks
- `DEBUG`: Detailed information useful for troubleshooting

You can increase log verbosity with the `--verbose=3` flag.

## Example of Full Setup Process

Here's what a typical setup process looks like:

```
$ npx ai-assistant-setup

AI Coding Assistant Integration Script

Found project at: /Users/developer/projects/my-project
Detected project type: Monorepo (using workspace packages)

What would you like to do?
> Setup both Claude Code and Roo Code

==========================================================
  Claude Code Setup
==========================================================

Enter your Anthropic API key: ****************************
Maximum memory limit for Claude Code (in MB): 2048

==========================================================
  Roo Code Setup
==========================================================

Select AI providers to configure:
 ◉ OpenAI (GPT-4o, etc.)
 ◉ Anthropic (Claude)
 ◯ Local models

Enter your OpenAI API key: ****************************
Enter your Anthropic API key: ****************************

Maximum tokens for Roo Code context window: 16000

Select operations to auto-approve:
 ◉ File reads
 ◯ File writes
 ◯ Terminal commands

Create standard rules for Roo Code? Yes

==========================================================
  Setting up .gitignore patterns
==========================================================

The following patterns in .gitignore may cause issues:
- "!.env.example" (may expose environment variables)
- "!credentials/*.example.json" (may expose credentials)
  
Would you like to remove these patterns? Yes

The following configuration files are currently ignored but should be shared:
- ".roo/rules/" (team-shared coding standards)
- ".mcp.json" (MCP server configuration)
- "CLAUDE.md" (project context)
  
Would you like to remove these from .gitignore? Yes

.gitignore updated with AI assistant patterns.

==========================================================
  Setting up VS Code settings
==========================================================

VS Code settings updated for AI assistants.

==========================================================
  Configuring MCP servers
==========================================================

Select MCP servers to configure:
 ◉ github (Repository awareness)
 ◉ context7 (Code understanding)
 ◉ memory (Knowledge persistence)
 ◯ jira (Task integration)
 ◯ playwright (Testing automation)
 ◯ fetch (API communication)
 ◯ browser (Web content retrieval)

MCP servers configured for both Claude Code and Roo Code.

==========================================================
  Setup Complete!
==========================================================

Your project is now configured to use AI coding assistants.

Manual steps required:
1. Install the Claude extension for VS Code
2. Install the Roo Code extension for VS Code
3. Restart VS Code to apply the settings

Thank you for using the AI Coding Assistant Integration Script!
```

## License

MIT License# ai-coding-assistants-setup
