# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the AI Coding Assistants Setup project.

## Table of Contents

- [Core API Keys](#core-api-keys)
- [Jira Integration](#jira-integration)
- [GitHub Actions Secrets](#github-actions-secrets)
- [System Variables](#system-variables)
- [MCP Server Variables](#mcp-server-variables)

## Core API Keys

These are the primary API keys used by the CLI tools and IDE extensions.

| Variable                       | Required     | Description                                                           | Used In                                    |
| ------------------------------ | ------------ | --------------------------------------------------------------------- | ------------------------------------------ |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | **Required** | GitHub personal access token for API access and repository operations | CLI, MCP config, GitHub Actions (as `PAT`) |
| `ANTHROPIC_API_KEY`            | **Required** | Anthropic Claude API key for AI-powered features                      | CLI, MCP config, GitHub Actions            |
| `CONTEXT7_API_KEY`             | Optional     | Context7 API key for enhanced documentation lookup                    | CLI, MCP config                            |
| `BRAVE_API_KEY`                | Optional     | Brave Search API key for web search capabilities                      | CLI, MCP config                            |
| `OPENAI_API_KEY`               | Optional     | OpenAI API key for alternative AI provider support                    | CLI configuration                          |
| `FIRECRAWL_API_KEY`            | Optional     | Firecrawl API key for advanced web scraping features                  | CLI, MCP config                            |

## Jira Integration

Environment variables for Jira integration and automation.

| Variable                             | Required   | Description                                                                           | Used In                   |
| ------------------------------------ | ---------- | ------------------------------------------------------------------------------------- | ------------------------- |
| `JIRA_PROJECT_KEY`                   | Optional   | Jira project key pattern for commit message integration (e.g., "SE", "SE\|PROJ\|ABC") | Git hooks, GitHub Actions |
| `JIRA_API_TOKEN`                     | Required\* | Jira API authentication token                                                         | CLI, GitHub Actions       |
| `JIRA_BASE_URL`                      | Required\* | Jira instance URL (e.g., https://company.atlassian.net)                               | CLI, GitHub Actions       |
| `JIRA_USER_EMAIL`                    | Required\* | Email associated with Jira account                                                    | CLI, GitHub Actions       |
| `JIRA_AUTOMATION_WEBHOOK`            | Optional   | General Jira automation webhook URL                                                   | CLI configuration         |
| `JIRA_AUTOMATION_WEBHOOK_DEV`        | Optional   | Development environment Jira webhook                                                  | CLI configuration         |
| `JIRA_AUTOMATION_WEBHOOK_STAGING`    | Optional   | Staging environment Jira webhook                                                      | CLI configuration         |
| `JIRA_AUTOMATION_WEBHOOK_PRODUCTION` | Optional   | Production environment Jira webhook                                                   | CLI configuration         |

\*Required only if using Jira integration features

## GitHub Actions Secrets

These secrets are used in GitHub Actions workflows for CI/CD operations.

### Essential Secrets

| Variable       | Required     | Description                                                                        | Workflow                         |
| -------------- | ------------ | ---------------------------------------------------------------------------------- | -------------------------------- |
| `PAT`          | **Required** | GitHub Personal Access Token (alternative name for `GITHUB_PERSONAL_ACCESS_TOKEN`) | ci.yml, quality.yml, release.yml |
| `NPM_TOKEN`    | Required\*   | NPM authentication token for package publishing                                    | publish.yml                      |
| `GITHUB_TOKEN` | Automatic    | Built-in GitHub Actions token (automatically provided)                             | All workflows                    |

\*Required only if publishing to NPM

### Security & Quality Scanning

| Variable              | Required | Description                                   | Workflow    |
| --------------------- | -------- | --------------------------------------------- | ----------- |
| `SONAR_TOKEN`         | Optional | SonarCloud token for code quality analysis    | quality.yml |
| `SNYK_TOKEN`          | Optional | Snyk token for vulnerability scanning         | quality.yml |
| `GITGUARDIAN_API_KEY` | Optional | GitGuardian API key for secret detection      | quality.yml |
| `FOSSA_API_KEY`       | Optional | FOSSA API key for license compliance checking | quality.yml |

### Release & Monitoring

| Variable                 | Required | Description                                    | Workflow    |
| ------------------------ | -------- | ---------------------------------------------- | ----------- |
| `SENTRY_AUTH_TOKEN`      | Optional | Sentry authentication token for error tracking | release.yml |
| `SENTRY_ORG`             | Optional | Sentry organization identifier                 | release.yml |
| `SENTRY_PROJECT`         | Optional | Sentry project identifier                      | release.yml |
| `RELEASE_SIGNING_KEY`    | Optional | GPG private key for signing releases           | release.yml |
| `RELEASE_SIGNING_KEY_ID` | Optional | GPG key ID for release signing                 | release.yml |
| `SIGNING_KEY_ID`         | Optional | Alternative GPG key ID                         | release.yml |
| `SIGNING_KEY_PASSPHRASE` | Optional | GPG key passphrase                             | release.yml |

### Load Testing

| Variable         | Required | Description                                    | Workflow         |
| ---------------- | -------- | ---------------------------------------------- | ---------------- |
| `K6_CLOUD_TOKEN` | Optional | K6 Cloud token for load testing                | k6-load-test.yml |
| `CUSTOM_HEADERS` | Optional | Custom headers for K6 load tests (JSON format) | k6-load-test.yml |

## System Variables

Standard system environment variables used by the application.

| Variable      | Required  | Description                                       | Used In                |
| ------------- | --------- | ------------------------------------------------- | ---------------------- |
| `HOME`        | Automatic | User home directory on Unix/macOS systems         | VS Code setup          |
| `USERPROFILE` | Automatic | User home directory on Windows systems            | VS Code setup          |
| `NODE_ENV`    | Optional  | Node.js environment (development/production/test) | Runtime configuration  |
| `PORT`        | Optional  | Application port number                           | Example configurations |
| `DEBUG`       | Optional  | Enable debug mode                                 | Example configurations |

## MCP Server Variables

Variables specific to Model Context Protocol (MCP) server configuration.

| Variable            | Required | Description                                           | Used In           |
| ------------------- | -------- | ----------------------------------------------------- | ----------------- |
| `MEMORY_PATH`       | Optional | Path to memory storage file for AI context            | MCP configuration |
| `FASTMCP_LOG_LEVEL` | Optional | Log level for FastMCP servers (debug/info/warn/error) | MCP configuration |

## Configuration Files

### .env File

Create a `.env` file in your project root with your required variables:

```bash
# Core API Keys
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# Optional API Keys
CONTEXT7_API_KEY=your-context7-key
BRAVE_API_KEY=your-brave-key
FIRECRAWL_API_KEY=your-firecrawl-key

# Jira Integration (if needed)
JIRA_PROJECT_KEY="SE|PROJ|ABC"
JIRA_API_TOKEN=your-jira-token
JIRA_BASE_URL=https://company.atlassian.net
JIRA_USER_EMAIL=your-email@company.com
```

### GitHub Actions Secrets

Configure these in your repository's Settings → Secrets and variables → Actions:

1. **Required**: `PAT` (your GitHub personal access token)
2. **For Publishing**: `NPM_TOKEN`
3. **For Security Scanning**: `SONAR_TOKEN`, `SNYK_TOKEN`, etc.
4. **For Monitoring**: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

## Security Best Practices

1. **Never commit** `.env` files or any file containing actual secret values
2. **Use `.gitignore`** to exclude environment files
3. **Rotate secrets** regularly, especially API keys and tokens
4. **Use least privilege** - only grant the minimum required permissions
5. **Store secrets securely** - use GitHub Secrets for CI/CD, secure vaults for production

## Troubleshooting

### Missing Required Variables

If you see errors about missing environment variables:

1. Check that your `.env` file exists and is properly formatted
2. Ensure the variable names match exactly (case-sensitive)
3. Restart your terminal or IDE after adding new variables
4. For GitHub Actions, verify secrets are added to the repository settings

### Variable Priority

Variables are loaded in this order (later sources override earlier):

1. System environment variables
2. `.env` file in project root
3. Process-specific variables (e.g., CI/CD injected)

## See Also

- [Environment Setup Guide](./docs/env-setup.md)
- [GitHub Actions Documentation](./docs/github-actions.md)
- [MCP Configuration Examples](./docs/mcp-config-examples.md)
