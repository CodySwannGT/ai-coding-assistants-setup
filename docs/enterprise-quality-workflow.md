# Enterprise Quality Workflow Documentation

## Overview

The enhanced quality workflow provides comprehensive code quality, security scanning, and compliance checking capabilities suitable for enterprise environments. It combines AI-powered analysis with traditional security tools while optimizing for performance.

## Key Features

### 🚀 Performance Optimizations
- **Single Dependency Installation**: Dependencies are installed once and shared across all jobs
- **Parallel Execution**: Independent jobs run concurrently
- **Intelligent Caching**: Node modules and build artifacts are cached
- **Reduced Runtime**: ~40% faster than sequential execution

### 🔒 Security Scanning
- **AI-Powered Analysis** (Non-blocking):
  - Claude Code Quality Review
  - Claude Security Scanning
- **Traditional Security Tools**:
  - SonarCloud (SAST)
  - Snyk (Dependency vulnerabilities)
  - GitGuardian (Secret detection)
  - FOSSA (License compliance)
  - npm audit (Baseline security)

### 📊 Quality Checks
- ESLint (Code linting)
- TypeScript (Type checking)
- Prettier (Format checking)
- Jest/Vitest (Unit testing)
- Build verification

### 🏢 Compliance Features
- **Framework Support**: SOC 2, ISO 27001, HIPAA, PCI-DSS
- **Audit Logging**: Complete workflow execution trails
- **Evidence Generation**: Automated compliance evidence packages
- **Control Validation**: Framework-specific control checks
- **Approval Gates**: GitHub environment-based approvals

## Configuration

### Required Secrets

Add these secrets to your repository or organization:

| Secret Name | Purpose | Required | Get Token From |
|------------|---------|----------|----------------|
| `PAT` | GitHub API operations | Optional* | [GitHub Settings](https://github.com/settings/tokens) |
| `ANTHROPIC_API_KEY` | AI code review | Optional | [Anthropic Console](https://console.anthropic.com/) |
| `SONAR_TOKEN` | SAST analysis | Optional | [SonarCloud](https://sonarcloud.io/) |
| `SNYK_TOKEN` | Dependency scanning | Optional | [Snyk](https://app.snyk.io/) |
| `GITGUARDIAN_API_KEY` | Secret detection | Optional | [GitGuardian](https://dashboard.gitguardian.com/) |
| `FOSSA_API_KEY` | License compliance | Optional | [FOSSA](https://app.fossa.com/) |

*PAT is required for PR commenting functionality

### Workflow Usage

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      node_version: '20.x'
      package_manager: 'npm'
    secrets:
      PAT: ${{ secrets.PAT }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
      FOSSA_API_KEY: ${{ secrets.FOSSA_API_KEY }}
```

### Input Parameters

| Parameter | Description | Default | Options |
|-----------|-------------|---------|---------|
| `node_version` | Node.js version | `20.x` | Any valid Node version |
| `package_manager` | Package manager | `npm` | `npm`, `yarn`, `bun` |
| `skip_lint` | Skip linting | `false` | `true`, `false` |
| `skip_typecheck` | Skip type checking | `false` | `true`, `false` |
| `skip_test` | Skip tests | `false` | `true`, `false` |
| `skip_format` | Skip format check | `false` | `true`, `false` |
| `skip_build` | Skip build | `false` | `true`, `false` |
| `skip_security` | Skip all security | `false` | `true`, `false` |
| `skip_jobs` | Skip specific jobs | `''` | Comma-separated job names |
| `working_directory` | Working directory | `''` | Any valid path |
| `compliance_framework` | Compliance framework | `none` | `none`, `soc2`, `iso27001`, `hipaa`, `pci-dss` |
| `require_approval` | Require approval gate | `false` | `true`, `false` |
| `audit_retention_days` | Audit log retention | `90` | Number of days |
| `generate_evidence_package` | Generate evidence | `false` | `true`, `false` |
| `approval_environment` | Environment for approvals | `production` | Any environment name |

### Skipping Specific Jobs

You can skip individual jobs using the `skip_jobs` parameter:

```yaml
with:
  skip_jobs: 'sonarcloud,snyk,license_compliance'
```

Available job names:
- `lint`, `typecheck`, `test`, `format`, `build`
- `npm_security_scan`, `sonarcloud`, `snyk`
- `secret_scanning`, `license_compliance`
- `code_quality_check`, `claude_security_scan`

## Security Tool Configuration

### SonarCloud Setup

1. Create a `sonar-project.properties` file in your repository root:
```properties
sonar.organization=your-org
sonar.projectKey=your-project-key
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

2. Or let the workflow auto-configure using repository information

### Snyk Configuration

The workflow uses high severity threshold by default. To customize:

```yaml
# In your workflow, override the Snyk step
- uses: snyk/actions/node@master
  with:
    args: --severity-threshold=medium --all-projects
```

### GitGuardian Configuration

The workflow scans full repository history. For PR-only scanning:

```yaml
# Limit to PR changes only
- uses: GitGuardian/ggshield-action@master
  with:
    args: --since-commit ${{ github.event.pull_request.base.sha }}
```

## Understanding Results

### Workflow Summary

Each workflow run generates three summary reports:

1. **AI Scanners Summary**: Non-blocking recommendations
2. **Security Tools Summary**: Traditional tool results
3. **Performance Summary**: Execution metrics

### Status Indicators

- ✅ **Passed**: No issues found
- ⚠️ **Issues Found (Non-blocking)**: AI scanners found issues
- ❌ **Failed**: Critical issues that block the workflow
- ⏭️ **Skipped**: Tool not configured or job skipped

### Artifacts

The workflow uploads these artifacts:
- `code-review-results`: AI code review findings
- `security-scan-results`: AI security scan results
- `snyk-results`: Dependency vulnerabilities
- `build-output-{run-id}`: Build artifacts

## Performance Tips

### Optimize Cache Hit Rate

1. **Consistent Lock Files**: Commit lock files (`package-lock.json`, `yarn.lock`)
2. **Minimize Dependencies**: Reduce unnecessary dependencies
3. **Cache Warmup**: Run workflow after dependency updates

### Reduce Execution Time

1. **Selective Jobs**: Skip unnecessary jobs for draft PRs
2. **Path Filters**: Only run relevant jobs based on changed files
3. **Matrix Strategy**: Use for testing multiple configurations

Example with path filters:
```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
```

## Troubleshooting

### Common Issues

#### Cache Misses
- **Symptom**: Dependencies reinstalled every run
- **Solution**: Check lock file is committed and unchanged

#### Security Tool Timeouts
- **Symptom**: Jobs timeout after 10 minutes
- **Solution**: Reduce scan scope or increase timeout

#### Token Permission Errors
- **Symptom**: "401 Unauthorized" or "403 Forbidden"
- **Solution**: Verify token has required permissions

### Debug Mode

Enable debug logging:
```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

## Best Practices

### 1. Progressive Enhancement
Start with basic tools and add more as needed:
- Phase 1: Basic quality checks (lint, test, build)
- Phase 2: AI scanners (Claude)
- Phase 3: Enterprise tools (SonarCloud, Snyk)

### 2. Security Configuration
- Store tokens as organization secrets for reuse
- Use least-privilege tokens
- Rotate tokens regularly
- Monitor token usage

### 3. Performance Optimization
- Review job dependencies regularly
- Monitor cache effectiveness
- Optimize test suites for speed
- Use job matrices wisely

### 4. Compliance Requirements
For regulated environments:
- Enable all security scanners
- Set strict quality gates
- Archive all scan results
- Document remediation actions

## Migration Guide

### From Basic Workflow

1. **Update workflow reference**:
   ```yaml
   # Old
   uses: ./.github/workflows/ci.yml
   
   # New
   uses: ./.github/workflows/quality.yml
   ```

2. **Add security tokens** to repository secrets

3. **Configure tools** with project-specific settings

4. **Test incrementally** by enabling one tool at a time

### Rollback Plan

To rollback to previous behavior:
1. Set `skip_security: true` to disable all security tools
2. Use `skip_jobs` to disable specific additions
3. Revert to previous workflow file if needed

## Compliance Configuration

### Enabling Compliance Framework

To enable compliance validation for your project:

```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'  # or iso27001, hipaa, pci-dss
      audit_retention_days: 365      # Keep audit logs for 1 year
      generate_evidence_package: true # For audit preparation
```

### Framework-Specific Controls

#### SOC 2 Type II
- **CC6.1**: Logical and Physical Access Controls
- **CC7.1**: System Operations (Vulnerability Management)
- **CC7.2**: System Monitoring (Audit Logging)
- **CC8.1**: Change Management (PR Process)

#### ISO 27001:2022
- **A.8.1**: Asset Management (License Inventory)
- **A.12.1**: Operational Security (Code Quality)
- **A.14.2**: Security in Development (SAST/DAST)

#### HIPAA Security Rule
- **164.312(a)(1)**: Access Control
- **164.312(b)**: Audit Controls
- **164.312(c)(1)**: Integrity Controls
- **164.312(e)(1)**: Transmission Security

#### PCI-DSS v4.0
- **Req 2.2**: No Default Passwords
- **Req 6.3**: Secure Coding
- **Req 6.4**: Change Control
- **Req 11.3**: Vulnerability Scanning

### Setting Up Approval Gates

#### Prerequisites
The approval gate feature requires a GitHub environment to be configured in your repository.

#### Step 1: Create the Environment

1. Navigate to your repository on GitHub
2. Go to **Settings** > **Environments**
3. Click **New environment**
4. Name it `production` (or modify the workflow to use your preferred name)
5. Click **Configure environment**

#### Step 2: Add Protection Rules

Configure the following protection rules as needed:

- **Required reviewers**: Add specific users or teams who must approve
- **Deployment branches**: Limit which branches can deploy (e.g., `main`, `release/*`)
- **Wait timer**: Add a delay before deployment (optional)
- **Prevent self-review**: Prevent the person who created the deployment from approving it
- **Deployment branch policy**: Restrict deployments to specific branches

#### Step 3: Enable in Workflow

```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      require_approval: true  # This activates the approval gate
```

#### Alternative Options

**Option 1: Use a Different Environment Name**
```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      require_approval: true
      approval_environment: 'staging'  # Use your custom environment
```

**Option 2: Skip Approval Gate (Even with Compliance)**
```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      require_approval: true
      approval_environment: ''  # Empty string skips the approval gate
```

**Option 3: Disable Approvals Entirely**
```yaml
jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      require_approval: false  # Disables approval gate
```

**Note**: The environment must exist in your repository settings before the workflow can use it. Without this, you'll see a "Value 'production' is not valid" error in your IDE. Setting `approval_environment` to an empty string will skip the approval gate even if `require_approval` is true.

### Audit Evidence Collection

The workflow automatically generates:
- **Audit Logs**: JSON-formatted execution trails
- **Compliance Reports**: Framework-specific validation results
- **Evidence Packages**: Complete audit documentation
- **Approval Records**: Deployment authorization trails

Access artifacts from the workflow run page or via API:
```bash
gh run download $RUN_ID -n audit-log-$RUN_ID
gh run download $RUN_ID -n compliance-evidence-$RUN_ID
```

### Compliance Dashboard

Each workflow run provides:
1. **Compliance Validation Report**: Framework-specific control checks
2. **Compliance Score**: Percentage of controls passed
3. **Audit Log**: Complete execution trail
4. **Evidence Package**: Ready for auditor review

## Support and Contributions

- **Issues**: Report bugs via GitHub Issues
- **Enhancements**: Submit PRs with new features
- **Documentation**: Help improve this guide
- **Examples**: Share your configurations