# GitHub Actions Workflows

This document provides information on the GitHub Actions workflow templates included in this project. These reusable workflows can be copied into target repositories to enhance CI/CD capabilities with minimal configuration.

## Overview

The AI Coding Assistants Setup includes several GitHub Actions workflow templates that follow the `workflow_call` pattern. This allows them to be referenced from other workflows, making them modular and reusable across projects.

All workflow templates are located in `src/templates/.github/workflows/` and should be copied to the target repository's `.github/workflows/` directory.

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

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      node_version: '20.x'
      package_manager: 'npm'
      skip_security: true
    secrets:
      PAT: ${{ secrets.GITHUB_TOKEN }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `node_version` | Node.js version to use | `20.x` |
| `package_manager` | Package manager to use (npm, yarn, or bun) | `npm` |
| `skip_lint` | Skip the lint job | `false` |
| `skip_typecheck` | Skip the typecheck job | `false` |
| `skip_test` | Skip the test job | `false` |
| `skip_format` | Skip the format check job | `false` |
| `skip_build` | Skip the build job | `false` |
| `skip_security` | Skip the security scan job | `false` |
| `skip_code_quality_check` | Skip the Claude quality check job | `false` |
| `skip_claude_security_scan` | Skip the Claude security scan job | `false` |
| `working_directory` | Directory to run commands in (if not root) | `''` |

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

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: ${{ github.ref_name }}
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
| `skip_quality` | Skip the quality workflow | `false` |
| `skip_github_release` | Skip creating GitHub release | `false` |
| `skip_jira` | Skip creating Jira release | `false` |
| `skip_github_issue` | Skip creating GitHub issue on failure | `false` |
| `skip_jira_issue` | Skip creating Jira issue on failure | `false` |
| Various `skip_*` | Skip individual quality checks | `false` |

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
4. Commit and push the changes to your repository

## Best Practices

- Start with the quality workflow to ensure basic CI checks
- Use the release workflow when you have a versioned package that needs automated releases
- Configure the issue creation workflows to improve your team's awareness of CI failures
- Ensure all required secrets are set up in your repository settings
- Consider adding documentation about these workflows in your project's README or CONTRIBUTING guide