# Model Context Protocol (MCP) Reference

This document provides a comprehensive reference for all Model Context Protocol (MCP) servers supported by the AI Coding Assistants Setup script. Each MCP server extends the capabilities of Claude Code and Roo Code by allowing them to access external information or perform specific actions.

## MCP Overview

Model Context Protocols (MCPs) are standardized interfaces that enable AI assistants to interact with external tools, data sources, and services. They provide a secure and consistent way for AI models to access information beyond their training data or perform actions they couldn't do natively.

## Supported MCP Servers

| MCP Name | Description | Configuration Requirements | API Keys/Credentials | Rate Limits/Usage Considerations | Example Configuration | Example Usage |
|----------|-------------|----------------------------|----------------------|---------------------------------|------------------------|--------------|
| **GitHub** | Provides repository awareness and GitHub API access. Allows Claude/Roo to read code, issues, PRs, and more from GitHub repositories. | Docker installation for running the official GitHub MCP server | GitHub Personal Access Token with repo and user scopes | Subject to GitHub API rate limits (5000 req/hr for authenticated users) | ```json<br>{ "mcpServers": { "github": { "command": "docker", "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "ghcr.io/github/github-mcp-server"], "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}" } } } }``` | ```Using GitHub MCP to find all open PRs: @github list-prs --state open```  |
| **Context7** | Provides up-to-date documentation and code understanding for thousands of libraries. Helps Claude/Roo access documentation without using tokens for common libraries. | NPX package installation capability | Context7 API Key | Free tier: 100 req/day; Paid tiers available for higher usage | ```json<br>{ "mcpServers": { "context7-mcp": { "command": "npx", "args": ["-y", "@upstash/context7-mcp@latest"], "env": { "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}" } } } }``` | ```Looking up React documentation: @context7-mcp resolve-library-id --libraryName "react"``` |
| **Memory** | Provides persistent memory between sessions for Claude/Roo, allowing knowledge to persist across sessions in a knowledge graph. | Storage location accessible for writing | None | Storage limited by file system capacity | ```json<br>{ "mcpServers": { "memory": { "command": "npx", "args": ["-y", "mcp-knowledge-graph", "--memory-path", "${MEMORY_PATH}"], "autoapprove": ["create_entities", "create_relations", "add_observations", "delete_entities", "delete_observations", "delete_relations", "read_graph", "search_nodes", "open_nodes"] } } }``` | ```Storing information for later: @memory create_entities --entities '[{"name": "Project Structure", "entityType": "Documentation", "observations": ["The project uses a modular architecture with separate components for frontend and backend"]}]'``` |
| **Task Master AI** | Provides task management, tracking, and subtask organization capabilities. Helps systematically manage complex project tasks. | Storage location for tasks | Anthropic API Key (for generating tasks) | Costs based on token usage with Anthropic API | ```json<br>{ "mcpServers": { "task-master-ai": { "command": "npx", "args": ["-y", "--package=task-master-ai", "task-master-ai"], "env": { "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}" } } } }``` | ```Creating a new task: @task-master-ai add_task --projectRoot "/path/to/project" --prompt "Implement user authentication with JWT"``` |
| **StackOverflow** | Searches StackOverflow for answers to programming questions. Helps Claude/Roo provide more accurate answers to common coding problems. | None (StackExchange API key optional) | StackExchange API Key (optional) | Without API key: 300 req/day; With API key: 10,000 req/day | ```json<br>{ "mcpServers": { "stackoverflow": { "command": "npx", "args": ["-y", "stackoverflow-mcp-server"], "env": { "STACKEXCHANGE_API_KEY": "${STACKEXCHANGE_API_KEY}", "MAX_SEARCH_RESULTS": "5", "SEARCH_TIMEOUT_MS": "5000", "INCLUDE_CODE_SNIPPETS": "true", "PREFER_ACCEPTED_ANSWERS": "true" } } } }``` | ```Searching for solutions: @stackoverflow search --query "How to handle React useEffect cleanup" --limit 5``` |
| **Command Shell** | Executes shell commands on behalf of Claude/Roo. ⚠️ Security caution: gives AI ability to run system commands. | Command allow/block list configuration | None | Limited by system resources and timeout parameter | ```json<br>{ "mcpServers": { "command-shell": { "command": "npx", "args": ["-y", "command-shell-mcp-server"], "env": { "ALLOWED_COMMANDS": "git,npm,node,yarn", "BLOCKED_COMMANDS": "rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown", "COMMAND_TIMEOUT_MS": "5000", "LOG_COMMANDS": "true", "ENABLE_ENVIRONMENT_VARIABLES": "false" } } } }``` | ```Running a git command: @command-shell execute --command "git status"``` |
| **Fetch** | Retrieves content from web URLs, allowing Claude/Roo to access internet resources. | None | None | Subject to remote server rate limits | ```json<br>{ "mcpServers": { "fetch": { "command": "uvx", "args": ["mcp-server-fetch"] } } }``` | ```Fetching documentation: @fetch fetch --url "https://docs.example.com/api-reference" --max_length 5000``` |
| **Playwright** | Enables browser automation and web testing via Playwright. | Playwright installation | None | Limited by system resources | ```json<br>{ "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/browser-mcp", "start"] } } }``` | ```Taking a screenshot: @playwright browser_take_screenshot``` |
| **Browser** | Provides web browsing capabilities to Claude/Roo. | None | None | Subject to remote server rate limits | ```json<br>{ "mcpServers": { "browser": { "command": "npx", "args": ["-y", "@anthropic/browser-mcp"] } } }``` | ```Navigating to a URL: @browser navigate --url "https://example.com"``` |
| **Jira** | Integrates with Jira for task management. | Jira account | Jira API Token | Subject to Jira API rate limits | ```json<br>{ "mcpServers": { "jira": { "command": "npx", "args": ["-y", "jira-mcp-server"], "env": { "JIRA_API_TOKEN": "${JIRA_API_TOKEN}", "JIRA_EMAIL": "${JIRA_EMAIL}", "JIRA_DOMAIN": "${JIRA_DOMAIN}" } } } }``` | ```Creating a Jira ticket: @jira create-issue --project "PROJ" --summary "Fix authentication bug" --description "Users unable to login with correct credentials"``` |

## MCP Configuration Files

The AI Coding Assistants Setup script creates two main configuration files for MCPs:

1. `.mcp.json` - Shared configuration file committed to version control
2. `.mcp.json.local` - Local configuration file with personal API keys and credentials (not committed)

## Environment Variables

MCP servers often require environment variables for API keys and other sensitive information. These are managed in your `.env` file, which should never be committed to version control.

Example `.env` entries for MCPs:
```
# GitHub MCP
GITHUB_PERSONAL_ACCESS_TOKEN=your-token-here

# Context7 MCP
CONTEXT7_API_KEY=your-key-here

# Memory MCP
MEMORY_PATH=/path/to/your/memory/file.jsonl

# StackOverflow MCP
STACKEXCHANGE_API_KEY=your-key-here
SO_MAX_SEARCH_RESULTS=5
SO_SEARCH_TIMEOUT_MS=5000
SO_INCLUDE_CODE_SNIPPETS=true
SO_PREFER_ACCEPTED_ANSWERS=true

# Command Shell MCP
ALLOWED_COMMANDS=git,npm,node,yarn,ls,cat,echo
BLOCKED_COMMANDS=rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown
COMMAND_TIMEOUT_MS=5000
COMMAND_WORKING_DIRECTORY=
COMMAND_LOG_COMMANDS=true
COMMAND_ENABLE_ENV_VARS=false
```

See the [MCP Configuration Examples](./mcp-config-examples.md) for detailed examples of each MCP server configuration.

## Custom MCP Implementations

You can extend the AI Coding Assistants Setup with custom MCP implementations.

### Creating a Custom MCP Server

A custom MCP server typically consists of:

1. A command-line program that accepts JSON input via stdin and produces JSON output via stdout
2. A configuration entry in `.mcp.json` that specifies how to launch the server

Example custom MCP configuration:

```json
{
  "mcpServers": {
    "my-custom-mcp": {
      "command": "node",
      "args": ["path/to/my-custom-mcp.js"],
      "env": {
        "CUSTOM_API_KEY": "${CUSTOM_API_KEY}"
      },
      "autoapprove": ["custom_operation1", "custom_operation2"]
    }
  }
}
```

### Custom MCP Server Guidelines

When creating a custom MCP server:

1. Follow the stdin/stdout communication protocol established by Anthropic
2. Implement proper error handling and validation
3. Document the operations your MCP server supports
4. Consider security implications, especially if your MCP can modify files or access sensitive data
5. Implement verbose logging options for debugging

### Example Minimal Custom MCP Server

Here's a minimal example of a custom MCP server in Node.js:

```javascript
#!/usr/bin/env node

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const { operation } = request;
    
    let response;
    if (operation === 'get_weather') {
      const { location } = request;
      // Fetch weather data for location
      response = {
        status: 'success',
        result: {
          temperature: 72,
          condition: 'sunny',
          location
        }
      };
    } else {
      response = {
        status: 'error',
        error: `Unknown operation: ${operation}`
      };
    }
    
    console.log(JSON.stringify(response));
  } catch (error) {
    console.log(JSON.stringify({
      status: 'error',
      error: error.message
    }));
  }
});
```

## Best Practices for Using MCPs

1. **Security**: Be extremely cautious with MCPs that can execute code (like Command Shell). Always restrict permissions to the minimum necessary.

2. **API Keys**: Store API keys in `.env` files and reference them in configuration using the `${VAR_NAME}` syntax.

3. **Rate Limiting**: Be aware of rate limits for API-based MCPs like GitHub and StackOverflow.

4. **Local Overrides**: Use `.mcp.json.local` for personal settings that shouldn't be shared with the team.

5. **Documentation**: Keep documentation up-to-date for any custom MCPs you create.

6. **Auto-approval**: Use the `autoapprove` configuration to specify which operations can run without user confirmation.

7. **Error Handling**: Ensure your Claude prompt properly handles potential MCP errors and failures.

## Troubleshooting

### Common MCP Issues

1. **MCP server not found**: Ensure the command specified in your configuration is accessible in your PATH.

2. **Authentication failures**: Check that your API keys and credentials are correctly set in your `.env` file.

3. **Permission denied**: Ensure you have appropriate file system permissions for the directories MCPs need to access.

4. **Timeouts**: For operations that may take a long time, consider increasing the timeout value if available in the MCP's configuration.

5. **Rate limiting**: If you're hitting API rate limits, consider adding delays between requests or obtaining a higher tier API key.

For more detailed troubleshooting, consult the documentation for the specific MCP server you're using.