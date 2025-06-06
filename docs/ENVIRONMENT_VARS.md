# Environment Variables Reference

This document provides a comprehensive reference of all environment variables and secrets used in the AI Coding Assistants Setup project.

## Table of Contents

- [Overview](#overview)
- [Local Development Variables](#local-development-variables)
- [GitHub Actions Secrets](#github-actions-secrets)
- [MCP Server Configuration](#mcp-server-configuration)
- [Environment-Specific Variables](#environment-specific-variables)
- [Setting Up Variables](#setting-up-variables)

## Overview

Environment variables in this project are used in three main contexts:

1. **Local Development** - Variables set in your local `.env` file
2. **GitHub Actions** - Secrets configured in your GitHub repository settings
3. **MCP Servers** - API keys for Claude's Model Context Protocol servers

## Local Development Variables

These variables should be set in your local `.env` file for development:

| Variable            | Required | Description                                   | Where to Get                                        |
| ------------------- | -------- | --------------------------------------------- | --------------------------------------------------- |
| `ANTHROPIC_API_KEY` | **Yes**  | Your Anthropic API key for Claude AI features | [Anthropic Console](https://console.anthropic.com/) |

### Example `.env` file:

```bash
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx
```

## GitHub Actions Secrets

These secrets should be configured in your GitHub repository settings under **Settings → Secrets and variables → Actions**:

### Core Secrets

| Secret              | Required | Description                                                         | Used In          |
| ------------------- | -------- | ------------------------------------------------------------------- | ---------------- |
| `PAT`               | **Yes**  | GitHub Personal Access Token with appropriate permissions           | All workflows    |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for AI-powered code reviews and security scanning | Quality workflow |

### Security Scanning Secrets

| Secret                | Required | Description                                          | Used In          |
| --------------------- | -------- | ---------------------------------------------------- | ---------------- |
| `SONAR_TOKEN`         | Optional | SonarCloud authentication token                      | Quality workflow |
| `SONAR_ORGANIZATION`  | Optional | SonarCloud organization name                         | Quality workflow |
| `SONAR_PROJECT_KEY`   | Optional | SonarCloud project key                               | Quality workflow |
| `SNYK_TOKEN`          | Optional | Snyk authentication token for vulnerability scanning | Quality workflow |
| `GITGUARDIAN_API_KEY` | Optional | GitGuardian API key for secret detection             | Quality workflow |
| `FOSSA_API_KEY`       | Optional | FOSSA API key for license compliance                 | Quality workflow |

### Release Management Secrets

| Secret              | Required | Description                                      | Used In          |
| ------------------- | -------- | ------------------------------------------------ | ---------------- |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry authentication token for release tracking | Release workflow |
| `SENTRY_ORG`        | Optional | Sentry organization slug                         | Release workflow |
| `SENTRY_PROJECT`    | Optional | Sentry project slug                              | Release workflow |
| `NPM_TOKEN`         | Optional | NPM authentication token for package publishing  | Release workflow |

### Load Testing Secrets

| Secret                | Required | Description                                     | Used In            |
| --------------------- | -------- | ----------------------------------------------- | ------------------ |
| `K6_CLOUD_TOKEN`      | Optional | K6 Cloud API token for cloud-based load testing | Load test workflow |
| `K6_CLOUD_PROJECT_ID` | Optional | K6 Cloud project ID                             | Load test workflow |

### Integration Secrets

| Secret              | Required | Description                               | Used In          |
| ------------------- | -------- | ----------------------------------------- | ---------------- |
| `JIRA_USER_EMAIL`   | Optional | Jira user email for ticket validation     | Pre-commit hooks |
| `JIRA_API_TOKEN`    | Optional | Jira API token                            | Pre-commit hooks |
| `JIRA_BASE_URL`     | Optional | Jira instance URL                         | Pre-commit hooks |
| `SLACK_WEBHOOK_URL` | Optional | Slack webhook for notifications           | All workflows    |
| `TEAMS_WEBHOOK_URL` | Optional | Microsoft Teams webhook for notifications | All workflows    |

## MCP Server Configuration

These API keys are configured in `.claude/settings.local.json` for MCP (Model Context Protocol) servers:

| Variable                       | Required    | Description                                | Service          |
| ------------------------------ | ----------- | ------------------------------------------ | ---------------- |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Recommended | GitHub PAT for Claude's GitHub integration | GitHub MCP       |
| `CONTEXT7_API_KEY`             | Optional    | Context7 API key for documentation search  | Context7 MCP     |
| `BRAVE_API_KEY`                | Optional    | Brave Search API key                       | Brave Search MCP |
| `FIRECRAWL_API_KEY`            | Optional    | Firecrawl API key for web scraping         | Firecrawl MCP    |

### Example `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxx"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSA_xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Environment-Specific Variables

These variables are automatically set based on the deployment environment:

| Variable       | Description                           | Values                                 |
| -------------- | ------------------------------------- | -------------------------------------- |
| `ENVIRONMENT`  | Deployment environment                | `development`, `staging`, `production` |
| `NODE_ENV`     | Node.js environment                   | `development`, `test`, `production`    |
| `CI`           | Whether running in CI/CD              | `true` when in GitHub Actions          |
| `GITHUB_TOKEN` | GitHub token (automatically provided) | Set by GitHub Actions                  |

## Setting Up Variables

### 1. Local Development Setup

```bash
# Copy the example file
cp .env.example .env

# Edit with your values
vim .env

# The file should contain:
ANTHROPIC_API_KEY=your-api-key-here
```

### 2. GitHub Secrets Setup

Using GitHub CLI:

```bash
# Set individual secrets
gh secret set ANTHROPIC_API_KEY
gh secret set PAT

# Or use an env file (recommended)
cp .github/workflows/.env.example .github/workflows/.env
# Edit the file with your values
gh secret set --env-file .github/workflows/.env
```

Using GitHub Web UI:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value

### 3. MCP Server Setup

```bash
# Copy the example configuration
cp .claude/settings.local.json.example .claude/settings.local.json

# Edit with your API keys
vim .claude/settings.local.json
```

## Security Best Practices

1. **Never commit secrets** - Always use `.env` files or GitHub secrets
2. **Use minimal permissions** - Create tokens with only necessary permissions
3. **Rotate regularly** - Update tokens and API keys periodically
4. **Monitor usage** - Check API usage to detect any anomalies
5. **Use environment-specific secrets** - Different values for dev/staging/production

## Troubleshooting

### Common Issues

1. **Workflow fails with "secret not found"**

   - Ensure the secret is set in GitHub repository settings
   - Check the secret name matches exactly (case-sensitive)

2. **MCP server not working**

   - Verify API key is correct in `.claude/settings.local.json`
   - Check the MCP server logs for authentication errors

3. **Local development issues**
   - Ensure `.env` file exists and contains required variables
   - Check that `.env` is not committed to git (should be in `.gitignore`)

### Getting Help

If you need help obtaining any of these API keys or tokens:

- **Anthropic API Key**: Visit [console.anthropic.com](https://console.anthropic.com/)
- **GitHub PAT**: Go to GitHub Settings → Developer settings → Personal access tokens
- **Other Services**: Check the documentation for each respective service

For project-specific help, please [open an issue](https://github.com/CodySwannGT/ai-coding-assistants-setup/issues).
