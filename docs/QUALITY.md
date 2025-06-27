# Quality Workflow Documentation

This document provides a comprehensive overview of the `quality.yml` workflow, which performs automated quality checks, security scanning, and compliance validation for your codebase.

## Overview

The Quality Workflow (`quality.yml`) is a reusable GitHub Actions workflow that runs various quality checks including:

- Code linting and formatting
- Type checking
- Unit, integration, and E2E testing
- Security vulnerability scanning
- AI-powered code reviews
- Compliance validation
- Performance monitoring

## Workflow Jobs and Steps

| Job Name                   | Purpose                                          | Required Secrets      | Skip Options                                         |
| -------------------------- | ------------------------------------------------ | --------------------- | ---------------------------------------------------- |
| **install_dependencies**   | 📦 Installs and caches project dependencies      | None                  | N/A                                                  |
| **lint**                   | 🧹 Runs ESLint to check code style and quality   | None                  | `skip_lint` or `skip_jobs: lint`                     |
| **typecheck**              | 🔍 Runs TypeScript type checking                 | None                  | `skip_typecheck` or `skip_jobs: typecheck`           |
| **test**                   | 🧪 Runs all tests via `npm test`                 | None                  | `skip_test` or `skip_jobs: test`                     |
| **test_unit**              | 🧪 Runs unit tests specifically                  | None                  | `skip_test` or `skip_jobs: test:unit`                |
| **test_integration**       | 🧪 Runs integration tests                        | None                  | `skip_test` or `skip_jobs: test:integration`         |
| **test_e2e**               | 🧪 Runs end-to-end tests                         | None                  | `skip_test` or `skip_jobs: test:e2e`                 |
| **format**                 | 📐 Checks code formatting with Prettier          | None                  | `skip_format` or `skip_jobs: format`                 |
| **build**                  | 🏗️ Builds the project                            | None                  | `skip_build` or `skip_jobs: build`                   |
| **npm_security_scan**      | 🔒 Runs npm audit for dependency vulnerabilities | None                  | `skip_security` or `skip_jobs: npm_security_scan`    |
| **sonarcloud**             | 🔍 Static Application Security Testing (SAST)    | `SONAR_TOKEN`         | `skip_security` or `skip_jobs: sonarcloud`           |
| **snyk**                   | 🛡️ Dependency vulnerability scanning             | `SNYK_TOKEN`          | `skip_security` or `skip_jobs: snyk`                 |
| **secret_scanning**        | 🔐 Detects hardcoded secrets and credentials     | `GITGUARDIAN_API_KEY` | `skip_security` or `skip_jobs: secret_scanning`      |
| **license_compliance**     | 📜 Validates open source license compliance      | `FOSSA_API_KEY`       | `skip_security` or `skip_jobs: license_compliance`   |
| **code_quality_check**     | 🤖 AI-powered code quality review                | `ANTHROPIC_API_KEY`   | `skip_security` or `skip_jobs: code_quality_check`   |
| **claude_security_scan**   | 🛡️ AI-powered security vulnerability detection   | `ANTHROPIC_API_KEY`   | `skip_security` or `skip_jobs: claude_security_scan` |
| **ai_scanners_summary**    | 📊 Summarizes AI scanner results                 | None                  | N/A                                                  |
| **security_tools_summary** | 🔒 Summarizes enterprise security tool results   | None                  | N/A                                                  |
| **compliance_validation**  | ✅ Validates compliance framework requirements   | None                  | Only runs if `compliance_framework` is set           |
| **audit_logger**           | 📊 Creates audit logs for compliance             | None                  | N/A                                                  |
| **approval_gate**          | 🚦 Manual approval for production deployments    | None                  | Only runs if `require_approval` is true              |
| **performance_summary**    | ⚡ Reports workflow performance metrics          | None                  | N/A                                                  |

## Input Parameters

| Parameter                   | Type    | Default      | Description                                                             |
| --------------------------- | ------- | ------------ | ----------------------------------------------------------------------- |
| `node_version`              | string  | '20.x'       | Node.js version to use                                                  |
| `package_manager`           | string  | 'npm'        | Package manager (npm, yarn, or bun)                                     |
| `skip_lint`                 | boolean | false        | Skip the lint job                                                       |
| `skip_typecheck`            | boolean | false        | Skip the typecheck job                                                  |
| `skip_test`                 | boolean | false        | Skip all test jobs                                                      |
| `skip_format`               | boolean | false        | Skip the format check job                                               |
| `skip_build`                | boolean | false        | Skip the build job                                                      |
| `skip_security`             | boolean | false        | Skip all security scan jobs                                             |
| `skip_jobs`                 | string  | ''           | Comma-separated list of specific jobs to skip                           |
| `working_directory`         | string  | ''           | Directory to run commands in (if not root)                              |
| `compliance_framework`      | string  | 'none'       | Compliance framework to validate (none, soc2, iso27001, hipaa, pci-dss) |
| `require_approval`          | boolean | false        | Require manual approval for production deployments                      |
| `audit_retention_days`      | number  | 90           | Number of days to retain audit logs                                     |
| `generate_evidence_package` | boolean | false        | Generate compliance evidence package for audits                         |
| `approval_environment`      | string  | 'production' | GitHub environment name for approval gate                               |

## Required Secrets

| Secret                | Purpose                      | Required For                          | How to Obtain                                                 |
| --------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `PAT`                 | GitHub Personal Access Token | PR comments                           | GitHub Settings → Developer settings → Personal access tokens |
| `ANTHROPIC_API_KEY`   | Claude AI integration        | AI code reviews and security scanning | [Anthropic Console](https://console.anthropic.com/)           |
| `SONAR_TOKEN`         | SonarCloud SAST analysis     | Static code analysis                  | [SonarCloud](https://sonarcloud.io/)                          |
| `SNYK_TOKEN`          | Snyk vulnerability scanning  | Dependency scanning                   | [Snyk](https://app.snyk.io/)                                  |
| `GITGUARDIAN_API_KEY` | Secret detection             | Hardcoded credential scanning         | [GitGuardian](https://dashboard.gitguardian.com/)             |
| `FOSSA_API_KEY`       | License compliance           | Open source license validation        | [FOSSA](https://app.fossa.com/)                               |

## Security Features

### Multi-layered Security Scanning

1. **npm audit** - Built-in Node.js security audit (high/critical only)
2. **SonarCloud** - Static Application Security Testing (SAST)
3. **Snyk** - Advanced dependency vulnerability scanning
4. **GitGuardian** - Secret and credential detection
5. **FOSSA** - License compliance and security
6. **Claude AI** - AI-powered security analysis

### AI-Powered Analysis

- **Code Quality Review**: Automated code review focusing on best practices
- **Security Scanning**: AI-based vulnerability detection
- Both AI scanners are **non-blocking** - they provide recommendations without failing the workflow

## Compliance Frameworks

The workflow supports validation for multiple compliance frameworks:

### SOC 2 Type II Controls

- CC6.1: Logical and Physical Access Controls
- CC7.1: System Operations and Vulnerability Management
- CC7.2: System Monitoring and Audit Logging
- CC8.1: Change Management Process

### ISO 27001:2022 Controls

- A.8.1: Asset Management and Software Inventory
- A.12.1: Operational Security and Code Quality
- A.14.2: Security in Development and Testing

### HIPAA Security Rule

- 164.312(a)(1): Access Controls
- 164.312(b): Audit Controls
- 164.312(c)(1): Integrity Controls
- 164.312(e)(1): Transmission Security

### PCI-DSS v4.0

- Req 2.2: Default Password Detection
- Req 6.3: Secure Coding Practices
- Req 6.4: Change Control Process
- Req 11.3: Vulnerability Scanning

## Performance Optimizations

The workflow includes several performance optimizations:

1. **Centralized Dependency Installation**: All jobs share a single dependency installation
2. **Intelligent Caching**: Dependencies are cached based on lock files
3. **Parallel Execution**: Quality and security checks run concurrently
4. **Conditional Execution**: Jobs can be skipped when not needed
5. **Smart Test Detection**: Only runs test scripts that exist in package.json

## Usage Examples

### Basic Usage (Pull Request)

```yaml
name: CI

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    secrets: inherit
```

### Production Deployment with Compliance

```yaml
name: Production Deploy

on:
  push:
    branches: [main]

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      require_approval: true
      generate_evidence_package: true
      audit_retention_days: 365
    secrets: inherit
```

### Skip Specific Jobs

```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      skip_jobs: 'test:e2e,sonarcloud,snyk'
    secrets: inherit
```

### Custom Node Version and Package Manager

```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      node_version: '18.x'
      package_manager: 'yarn'
    secrets: inherit
```

## Artifacts Generated

| Artifact                       | Description                               | Retention                      |
| ------------------------------ | ----------------------------------------- | ------------------------------ |
| `node-modules-{run_id}`        | Cached dependencies                       | 1 day                          |
| `build-output-{run_id}`        | Build artifacts (dist, build, .next, out) | 1 day                          |
| `code-review-results`          | AI code review findings                   | 14 days                        |
| `security-scan-results`        | AI security scan findings                 | 14 days                        |
| `snyk-results`                 | Snyk vulnerability report                 | 14 days                        |
| `audit-log-{run_id}`           | Workflow execution audit trail            | Configurable (default 90 days) |
| `compliance-evidence-{run_id}` | Compliance evidence package               | Configurable (default 90 days) |
| `approval-record-{run_id}`     | Production approval documentation         | Configurable (default 90 days) |

## Workflow Summaries

The workflow generates detailed summaries in the GitHub Actions UI:

1. **AI Scanners Summary**: Overview of AI-powered code quality and security checks
2. **Security Tools Summary**: Status of all enterprise security tools with configuration guidance
3. **Compliance Validation Report**: Detailed compliance control validation results
4. **Performance Report**: Workflow execution metrics and optimization suggestions

## Best Practices

1. **Enable Security Tools Gradually**: Start with npm audit, then add enterprise tools as needed
2. **Configure Secrets Properly**: Use repository or organization secrets for API keys
3. **Review AI Findings**: AI scanners provide valuable insights but are non-blocking
4. **Customize Compliance**: Choose the appropriate framework for your industry
5. **Monitor Performance**: Use the performance summary to optimize workflow execution
6. **Leverage Caching**: Ensure lock files are committed for optimal dependency caching

## Troubleshooting

### Common Issues

1. **"ANTHROPIC_API_KEY not set"**: AI features are skipped - add the key to enable them
2. **"Cache miss on dependencies"**: Normal on first run or after dependency updates
3. **"Security tool skipped"**: The required token/secret is not configured
4. **"Approval environment not found"**: Create the environment in GitHub repository settings
5. **"High vulnerabilities found"**: Review and update dependencies or add audit exceptions

### Performance Tips

- Use `skip_jobs` to disable unnecessary checks for faster feedback
- Enable dependency caching by committing lock files
- Run security tools only on main branches if needed for speed
- Consider using matrix builds for multiple Node versions

## Related Documentation

- [Environment Variables Reference](./ENVIRONMENT_VARS.md)
- [GitHub Repository Setup Guide](./GITHUB_SETUP.md)
- [Third-Party Services Setup Guide](./THIRD_PARTY_SETUP.md)
