# Quality Workflow Quick Reference

## 🚀 Quick Start

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    uses: ./.github/workflows/quality.yml
    secrets: inherit  # Passes all secrets
```

## 🔑 Required Secrets

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `ANTHROPIC_API_KEY` | AI code review | Claude scanners |
| `SONAR_TOKEN` | Code quality | SonarCloud SAST |
| `SNYK_TOKEN` | Vulnerabilities | Snyk scanning |
| `GITGUARDIAN_API_KEY` | Secrets | GitGuardian |
| `FOSSA_API_KEY` | Licenses | FOSSA compliance |
| `PAT` | PR comments | All PR features |

## 📋 Job Names for Skipping

```yaml
with:
  skip_jobs: 'job1,job2,job3'
```

**Quality Jobs**: `lint`, `typecheck`, `test`, `format`, `build`
**Security Jobs**: `npm_security_scan`, `sonarcloud`, `snyk`, `secret_scanning`, `license_compliance`
**AI Jobs**: `code_quality_check`, `claude_security_scan`

## ⚡ Performance Features

- ✅ Single dependency installation
- ✅ Parallel job execution
- ✅ Intelligent caching
- ✅ ~40% faster execution

## 🎯 Common Configurations

### Minimal (Fast CI)
```yaml
with:
  skip_security: true  # Skips all security tools
```

### Security Focus
```yaml
with:
  skip_jobs: 'code_quality_check,claude_security_scan'  # Traditional tools only
```

### PR Only Security
```yaml
jobs:
  quality:
    if: github.event_name == 'pull_request'
    uses: ./.github/workflows/quality.yml
```

### Different Package Managers
```yaml
with:
  package_manager: 'yarn'  # or 'bun'
```

### Compliance Mode
```yaml
with:
  compliance_framework: 'soc2'
  audit_retention_days: 365
  generate_evidence_package: true
```

### Production Deployment with Approval
```yaml
with:
  compliance_framework: 'soc2'
  require_approval: true  # Uses GitHub environments
```

## 📊 Understanding Results

### Workflow Summary Sections
1. **AI Scanners Summary** - Non-blocking recommendations
2. **Security Tools Summary** - Traditional tool results  
3. **Performance Summary** - Execution metrics

### Status Meanings
- ✅ Passed - No issues
- ⚠️ Warning - Non-blocking issues (AI)
- ❌ Failed - Blocking issues
- ⏭️ Skipped - No token/disabled

## 🛠️ Troubleshooting

### Dependencies Not Cached
```yaml
# Check your lock file is committed
git add package-lock.json  # or yarn.lock, bun.lockb
git commit -m "Add lock file"
```

### Security Tool Not Running
1. Check secret is set: `Settings > Secrets > Actions`
2. Check job isn't skipped: Remove from `skip_jobs`
3. Check logs for token validation

### Workflow Too Slow
```yaml
with:
  # Skip non-critical jobs
  skip_jobs: 'sonarcloud,fossa'
  # Or skip all security
  skip_security: true
```

## 📁 Required Files

### For SonarCloud
Create `sonar-project.properties`:
```properties
sonar.organization=your-org
sonar.projectKey=your-project
sonar.sources=src
sonar.tests=tests
```

### For Security Tools
No configuration files needed - tools work out of the box!

## 🔗 Useful Links

- [Full Documentation](./enterprise-quality-workflow.md)
- [Security Policy](../SECURITY.md)
- [Workflow File](.github/workflows/quality.yml)
- [Example Usage](.github/workflows/ci.yml)

## 💡 Pro Tips

1. **Start Simple**: Enable basic checks first, add security tools gradually
2. **Cache Warmup**: Run workflow after dependency updates
3. **Token Scopes**: Use minimum required permissions
4. **Monitor Usage**: Check Actions minutes consumption
5. **Parallel Power**: Let jobs run concurrently for speed