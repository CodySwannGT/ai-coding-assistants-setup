# MCP Configuration Examples

This document provides examples of MCP server configurations for use in your project.

## Table of Contents

- [GitHub MCP](#github-mcp)
- [Context7 MCP](#context7-mcp)
- [Memory MCP](#memory-mcp)
- [Task Master AI MCP](#task-master-ai-mcp)
- [StackOverflow MCP](#stackoverflow-mcp)
- [Command Shell MCP](#command-shell-mcp)
- [AWS Documentation MCP](#aws-documentation-mcp)

## GitHub MCP

```json
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
      "env": {}
    }
  }
}
```

Local override with credential:

```json
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
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token-here"
      }
    }
  }
}
```

## Context7 MCP

```json
{
  "mcpServers": {
    "context7-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

## Memory MCP

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-knowledge-graph",
        "--memory-path",
        "${MEMORY_PATH}"
      ],
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

## Task Master AI MCP

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": [
        "-y",
        "--package=task-master-ai",
        "task-master-ai"
      ],
      "env": {}
    }
  }
}
```

## StackOverflow MCP

```json
{
  "mcpServers": {
    "stackoverflow": {
      "command": "npx",
      "args": [
        "-y",
        "stackoverflow-mcp-server"
      ],
      "env": {
        "STACKEXCHANGE_API_KEY": "${STACKEXCHANGE_API_KEY}",
        "MAX_SEARCH_RESULTS": "5",
        "SEARCH_TIMEOUT_MS": "5000",
        "INCLUDE_CODE_SNIPPETS": "true",
        "PREFER_ACCEPTED_ANSWERS": "true"
      }
    }
  }
}
```

### Configuration Options

The StackOverflow MCP supports the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `STACKEXCHANGE_API_KEY` | StackExchange API Key for increased rate limits (optional) | None |
| `MAX_SEARCH_RESULTS` | Maximum number of search results to return | 5 |
| `SEARCH_TIMEOUT_MS` | Timeout for search operations in milliseconds | 5000 |
| `INCLUDE_CODE_SNIPPETS` | Whether to include code snippets in search results | true |
| `PREFER_ACCEPTED_ANSWERS` | Whether to prioritize accepted answers in results | true |

## Command Shell MCP

```json
{
  "mcpServers": {
    "command-shell": {
      "command": "npx",
      "args": [
        "-y",
        "command-shell-mcp-server"
      ],
      "env": {
        "ALLOWED_COMMANDS": "git,npm,node,yarn,ls,cat,echo",
        "BLOCKED_COMMANDS": "rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown",
        "COMMAND_TIMEOUT_MS": "5000",
        "LOG_COMMANDS": "true",
        "ENABLE_ENVIRONMENT_VARIABLES": "false"
      }
    }
  }
}
```

### Configuration Options

The Command Shell MCP supports the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `ALLOWED_COMMANDS` | Comma-separated list of allowed shell commands (empty allows all non-blocked commands) | "" |
| `BLOCKED_COMMANDS` | Comma-separated list of blocked shell commands | rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown |
| `COMMAND_TIMEOUT_MS` | Timeout for command execution in milliseconds | 5000 |
| `WORKING_DIRECTORY` | Working directory for command execution (optional) | Current working directory |
| `LOG_COMMANDS` | Whether to log executed commands | true |
| `ENABLE_ENVIRONMENT_VARIABLES` | Whether to allow custom environment variables in commands | false |

## Security Considerations

### Command Shell MCP

The Command Shell MCP allows AI assistants to execute shell commands, which can be a security risk. Only enable this MCP if you trust the AI assistant and understand the security implications. Consider the following security best practices:

1. Restrict allowed commands to only those necessary
2. Always block potentially dangerous commands
3. Set a reasonable timeout to prevent long-running commands
4. Do not enable environment variables unless necessary
5. Log all commands for auditing purposes

### StackOverflow MCP

The StackOverflow MCP interacts with the StackExchange API. Be mindful of rate limits, especially if not using an API key. The MCP only performs read operations and does not post to StackOverflow.

## AWS Documentation MCP

```json
{
  "mcpServers": {
    "aws-documentation-mcp-server": {
      "command": "uvx",
      "args": [
        "awslabs.aws-documentation-mcp-server@latest"
      ],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Configuration Options

The AWS Documentation MCP has minimal configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `FASTMCP_LOG_LEVEL` | Level of logging (ERROR, WARN, INFO, DEBUG) | INFO |
| `disabled` | Whether the MCP is disabled | false |
| `autoApprove` | List of operations to auto-approve | [] |

This MCP provides access to the AWS documentation and does not require any API keys or special permissions.