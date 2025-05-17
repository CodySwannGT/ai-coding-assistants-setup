# GitHub Actions Workflows

This document provides information on the GitHub Actions workflow templates included in this project. These reusable workflows can be copied into target repositories to enhance CI/CD capabilities with minimal configuration.

## Overview

The AI Coding Assistants Setup includes several GitHub Actions workflow templates that follow the `workflow_call` pattern. This allows them to be referenced from other workflows, making them modular and reusable across projects.

All workflow templates are located in `src/templates/.github/workflows/` and should be copied to the target repository's `.github/workflows/` directory.

## Required Secrets and Variables

The workflows require certain GitHub repository secrets and variables to function properly. During the setup process, you'll be prompted for these values, which will be saved to your `.env` file. You'll also need to add them to your GitHub repository.

### Required Secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `PAT` | GitHub Personal Access Token | All workflows |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Quality and security workflows |
| `JIRA_API_TOKEN` | Jira API authentication token | Jira integration |
| `JIRA_AUTOMATION_WEBHOOK` | General Jira automation webhook | Jira integration |
| `JIRA_AUTOMATION_WEBHOOK_DEV` | Dev-specific Jira webhook | Environment-specific Jira integration |
| `JIRA_AUTOMATION_WEBHOOK_STAGING` | Staging-specific Jira webhook | Environment-specific Jira integration |
| `JIRA_AUTOMATION_WEBHOOK_PRODUCTION` | Production-specific Jira webhook | Environment-specific Jira integration |

### Required Variables

| Variable Name | Description | Required For |
|---------------|-------------|--------------|
| `JIRA_BASE_URL` | Jira instance URL (e.g., `https://your-org.atlassian.net`) | Jira integration |
| `JIRA_USER_EMAIL` | Email address for Jira authentication | Jira integration |
| `JIRA_PROJECT_KEY` | The key of the Jira project (e.g., `PROJ`) | Jira integration |

### Setting up Secrets and Variables with GitHub CLI

You can use the GitHub CLI to set up repository secrets and variables from your terminal. This is especially helpful for automating the process or for setting up multiple repositories.

First, ensure you have the [GitHub CLI](https://cli.github.com/) installed and authenticated:

```bash
# Install GitHub CLI (macOS example)
brew install gh

# Authenticate (follow the prompts)
gh auth login
```

#### Setting Repository Secrets

```bash
# Set a secret for the current repository
gh secret set PAT --body "ghp_yourgithubpersonalaccesstoken"

# Set secrets from your .env file (bash)
while IFS='=' read -r key value || [ -n "$key" ]; do
  if [[ ! $key =~ ^# && -n $key && -n $value ]]; then
    # Only set specific secrets that we use in GitHub Actions
    if [[ $key == "ANTHROPIC_API_KEY" || 
          $key == "JIRA_API_TOKEN" || 
          $key == "JIRA_AUTOMATION_WEBHOOK" || 
          $key == "JIRA_AUTOMATION_WEBHOOK_DEV" || 
          $key == "JIRA_AUTOMATION_WEBHOOK_STAGING" || 
          $key == "JIRA_AUTOMATION_WEBHOOK_PRODUCTION" ]]; then
      # For PAT, use the GitHub name convention
      if [[ $key == "GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
        gh secret set PAT --body "$value"
      else
        gh secret set "$key" --body "$value"
      fi
      echo "Set secret: $key"
    fi
  fi
done < .env
```

#### Setting Repository Variables

```bash
# Set a variable for the current repository
gh variable set JIRA_BASE_URL --body "https://your-org.atlassian.net"

# Set variables from your .env file (bash)
while IFS='=' read -r key value || [ -n "$key" ]; do
  if [[ ! $key =~ ^# && -n $key && -n $value ]]; then
    # Only set specific variables that we use in GitHub Actions
    if [[ $key == "JIRA_BASE_URL" || 
          $key == "JIRA_USER_EMAIL" || 
          $key == "JIRA_PROJECT_KEY" ]]; then
      gh variable set "$key" --body "$value"
      echo "Set variable: $key"
    fi
  fi
done < .env
```

#### Setting Organization Secrets and Variables

For organization-wide secrets and variables (useful for multiple repositories):

```bash
# Set organization secret (requires admin access)
gh secret set PAT --org your-org --body "ghp_yourgithubpersonalaccesstoken"

# Set organization variable
gh variable set JIRA_PROJECT_KEY --org your-org --body "PROJ"
```

## Available Workflows

### Quality Checks Workflow (`quality.yml`)

A comprehensive workflow that runs various quality checks on your codebase:

- Linting
- Type checking
- Unit tests
- Format checking
- Build verification
- Security scanning
- AI-powered code quality and security analysis (using Claude)

Each check runs as a separate job and can be enabled or disabled as needed.

#### Example Usage

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      node_version:
        description: 'Node.js version to use'
        required: false
        default: '20.x'
        type: string
      package_manager:
        description: 'Package manager to use (npm, yarn, or bun)'
        required: false
        default: 'npm'
        type: string
      working_directory:
        description: 'Directory to run commands in (if not root)'
        required: false
        default: ''
        type: string
      skip_jobs:
        description: 'Jobs to skip (comma-separated: lint,typecheck,test,format,build,security,code_quality_check,claude_security_scan,quality,github_issue)'
        required: false
        default: ''
        type: string

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      node_version: ${{ inputs.node_version || '20.x' }}
      package_manager: ${{ inputs.package_manager || 'npm' }}
      working_directory: ${{ inputs.working_directory || '' }}
      skip_jobs: ${{ inputs.skip_jobs || 'security' }}  # Skip security checks by default
    secrets:
      PAT: ${{ secrets.GITHUB_TOKEN }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `node_version` | Node.js version to use | `20.x` |
| `package_manager` | Package manager to use (npm, yarn, or bun) | `npm` |
| `working_directory` | Directory to run commands in (if not root) | `''` |
| `skip_jobs` | Jobs to skip (comma-separated list) | `''` |

The `skip_jobs` parameter accepts a comma-separated list of job names to skip. This replaces the individual `skip_*` parameters to stay within GitHub's limit of 10 inputs for `workflow_dispatch` events. Available job names to skip:

- `lint` - Skip linting
- `typecheck` - Skip type checking
- `test` - Skip unit tests
- `format` - Skip format checking
- `build` - Skip build verification
- `security` - Skip security scanning
- `code_quality_check` - Skip Claude code quality analysis
- `claude_security_scan` - Skip Claude security scan
- `quality` - Skip the entire quality workflow
- `github_issue` - Skip GitHub issue creation on failure

The individual `skip_*` boolean parameters have been removed in favor of the more flexible and concise `skip_jobs` parameter. This change was made to stay within GitHub's limit of 10 inputs for workflow_dispatch events.

### Release Workflow (`release.yml`)

A workflow for versioning, tagging, and creating releases. It:

- Runs quality checks
- Determines the environment
- Bumps the version using conventional commits
- Creates a git tag
- Creates a GitHub release
- Optionally creates a Jira release

#### Example Usage

```yaml
name: Release

on:
  push:
    branches: [main, dev, staging]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'main'
        type: choice
        options:
          - main
          - dev
          - staging
      node_version:
        description: 'Node.js version to use'
        required: false
        default: '20.x'
        type: string
      package_manager:
        description: 'Package manager to use (npm, yarn, or bun)'
        required: false
        default: 'npm'
        type: string
      skip_jobs:
        description: 'Jobs to skip (comma-separated list)'
        required: false
        default: ''
        type: string

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: ${{ inputs.environment || github.ref_name }}
      node_version: ${{ inputs.node_version || '20.x' }}
      package_manager: ${{ inputs.package_manager || 'npm' }}
      skip_jobs: ${{ inputs.skip_jobs }}
    secrets:
      PAT: ${{ secrets.GITHUB_TOKEN }}
      JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `environment` | Environment to deploy to | `dev` |
| `node_version` | Node.js version to use | `20.x` |
| `package_manager` | Package manager to use | `npm` |
| `working_directory` | Directory to run commands in (if not root) | `''` |
| `skip_jobs` | Jobs to skip (comma-separated list) | `''` |
| `jira_project_key` | Jira project key (e.g., PROJ) | `''` |

The `skip_jobs` parameter works the same way as in the quality workflow. For release workflows, you can include additional job names:

- `quality` - Skip the entire quality workflow
- `version` - Skip the version bumping job
- `github_issue` - Skip GitHub issue creation on failure
- `jira_issue` - Skip Jira issue creation on failure
- `github_release` - Skip creating GitHub release
- `jira_release` - Skip creating Jira release

### GitHub Issue Creation (`github-issue-on-failure.yml`)

Creates a GitHub issue when a workflow fails, with detailed information about the failure.

#### Example Usage

```yaml
create_github_issue_on_failure:
  if: failure()
  uses: ./.github/workflows/github-issue-on-failure.yml
  with:
    workflow_name: 'My Workflow'
    failed_job: 'build_and_test'
  secrets:
    PAT: ${{ secrets.GITHUB_TOKEN }}
```

#### Configuration Options

| Option | Description | Required |
|--------|-------------|----------|
| `workflow_name` | Name of the workflow that failed | Yes |
| `failed_job` | Name of the job that failed | No |
| `node_version` | Node.js version to use | No (default: `20.x`) |
| `package_manager` | Package manager to use | No (default: `npm`) |

### Jira Issue Creation (`jira-issue-on-failure.yml`)

Creates a Jira issue when a workflow fails, with detailed information about the failure.

#### Example Usage

```yaml
create_jira_issue_on_failure:
  if: failure()
  uses: ./.github/workflows/jira-issue-on-failure.yml
  with:
    workflow_name: 'My Workflow'
    failed_job: 'build_and_test'
    JIRA_BASE_URL: ${{ vars.JIRA_BASE_URL }}
    JIRA_USER_EMAIL: ${{ vars.JIRA_USER_EMAIL }}
    JIRA_PROJECT_KEY: ${{ vars.JIRA_PROJECT_KEY }}
  secrets:
    JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
```

#### Configuration Options

| Option | Description | Required |
|--------|-------------|----------|
| `workflow_name` | Name of the workflow that failed | Yes |
| `failed_job` | Name of the job that failed | No |
| `issue_type` | Type of Jira issue to create | No (default: `Bug`) |
| `JIRA_BASE_URL` | Jira instance base URL | Yes |
| `JIRA_USER_EMAIL` | Email address of the Jira user | Yes |
| `JIRA_PROJECT_KEY` | The key of the Jira project | Yes |

## Implementation Steps

To use these workflows in your project:

1. Copy the desired workflow files from `src/templates/.github/workflows/` to your project's `.github/workflows/` directory
2. Create a parent workflow that references these workflows using the `uses` keyword
3. Configure the workflows with your specific inputs and secrets
4. Set up all required secrets and variables in your repository settings (see [Setting up Secrets and Variables](#setting-up-secrets-and-variables-with-github-cli))
5. Commit and push the changes to your repository

## Usage Examples

### Using the Skip Jobs Parameter

The `skip_jobs` parameter allows you to skip multiple jobs using a single comma-separated string. This parameter was introduced to stay within GitHub's limit of 10 inputs for `workflow_dispatch` events.

#### Example: Skipping Multiple Quality Checks

```yaml
# In CI workflow
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      node_version: '20.x'
      package_manager: 'npm'
      skip_jobs: 'security,code_quality_check,claude_security_scan'
    secrets:
      PAT: ${{ secrets.GITHUB_TOKEN }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

#### Example: Workflow Dispatch with Skip Jobs Option

```yaml
on:
  workflow_dispatch:
    inputs:
      node_version:
        description: 'Node.js version to use'
        required: false
        default: '20.x'
        type: string
      skip_jobs:
        description: 'Jobs to skip (comma-separated)'
        required: false
        default: ''
        type: string
```

#### Example: Manual Workflow Run with Skip Jobs

When manually running a workflow from the GitHub UI, you can enter job names in the "Skip jobs" input field:

```
lint,typecheck,test
```

This will skip the linting, type checking, and testing jobs while running all other jobs.

## Best Practices

- Start with the quality workflow to ensure basic CI checks
- Use the release workflow when you have a versioned package that needs automated releases
- Configure the issue creation workflows to improve your team's awareness of CI failures
- Use the `skip_jobs` parameter instead of individual `skip_*` parameters when possible
- Ensure all required secrets are set up in your repository settings
- Use organization secrets for values that are common across multiple repositories
- Consider adding documentation about these workflows in your project's README or CONTRIBUTING guide
- Regularly rotate sensitive tokens and update the corresponding repository secrets