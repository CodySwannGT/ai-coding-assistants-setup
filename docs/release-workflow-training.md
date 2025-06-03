# Enterprise Release Workflow Training Guide

## Overview

This training guide provides hands-on exercises and scenarios to help teams master the enterprise release workflow. The training is organized into modules, each focusing on specific features and use cases.

## Training Modules

1. [Module 1: Basic Release Operations](#module-1-basic-release-operations)
2. [Module 2: Version Management Strategies](#module-2-version-management-strategies)
3. [Module 3: Error Handling and Recovery](#module-3-error-handling-and-recovery)
4. [Module 4: Observability and Debugging](#module-4-observability-and-debugging)
5. [Module 5: Enterprise Features](#module-5-enterprise-features)
6. [Module 6: Emergency Procedures](#module-6-emergency-procedures)

## Prerequisites

Before starting this training:
- GitHub account with repository access
- Basic understanding of Git and GitHub Actions
- Access to a test repository
- Completion of pre-training setup

## Module 1: Basic Release Operations

### Learning Objectives
- Trigger a basic release
- Understand workflow inputs
- Monitor workflow execution
- Access release artifacts

### Exercise 1.1: Your First Release

1. **Navigate to Actions Tab**
   ```
   Repository → Actions → Release Workflow
   ```

2. **Trigger Manual Release**
   ```yaml
   Click "Run workflow"
   Select branch: main
   Fill inputs:
     environment: test
     release_strategy: standard-version
     force_release: true
   ```

3. **Monitor Execution**
   - Watch real-time logs
   - Identify job dependencies
   - Note execution time

4. **Verify Results**
   - Check new version tag
   - Review generated changelog
   - Confirm GitHub release created

### Exercise 1.2: Understanding Workflow Jobs

```mermaid
graph LR
    A[Initialize] --> B[Quality Checks]
    B --> C[Version Management]
    C --> D[Create Release]
    D --> E[Summary]
```

**Tasks:**
1. Identify each job in the workflow
2. Understand job dependencies
3. Review job outputs

### Quiz 1
1. What is the default version strategy?
2. Which jobs run in parallel?
3. How do you skip specific quality checks?

**Answers:**
1. standard-version
2. None in basic flow (all sequential)
3. Use `skip_jobs` input with comma-separated job names

## Module 2: Version Management Strategies

### Learning Objectives
- Use different version strategies
- Create pre-releases
- Handle version conflicts
- Implement custom versioning

### Exercise 2.1: Semantic Versioning

1. **Create Feature Commit**
   ```bash
   git checkout -b feature/new-feature
   echo "feature" > feature.txt
   git add feature.txt
   git commit -m "feat: Add new feature"
   git push origin feature/new-feature
   ```

2. **Merge and Release**
   ```yaml
   # PR merge triggers minor version bump
   environment: test
   release_strategy: semantic
   ```

3. **Verify Version Bump**
   - Previous: 1.0.0
   - New: 1.1.0 (minor bump for feat:)

### Exercise 2.2: Calendar Versioning

```yaml
# Trigger release with calendar version
environment: test
release_strategy: calendar
prerelease: ''  # Results in 2024.03.06
```

**With Pre-release:**
```yaml
prerelease: 'beta'  # Results in 2024.03.06-beta.1430
```

### Exercise 2.3: Custom Versioning

```yaml
# Use specific version
environment: test
release_strategy: custom
custom_version: '2.0.0-special'
```

### Lab: Version Conflict Resolution

1. **Simulate Conflict**
   - User A triggers release
   - User B triggers release simultaneously

2. **Observe Resolution**
   - Second release detects conflict
   - Automatic retry with rebase
   - Successful resolution

## Module 3: Error Handling and Recovery

### Learning Objectives
- Understand retry mechanisms
- Handle common failures
- Implement recovery procedures
- Use rollback strategies

### Exercise 3.1: Network Failure Simulation

```yaml
# This exercise requires instructor setup
# Simulates GitHub API timeout
```

**Expected Behavior:**
1. Initial API call fails
2. Exponential backoff retry (2s, 4s, 8s)
3. Success on retry or graceful failure

### Exercise 3.2: Recovery Procedures

1. **State Recovery**
   ```bash
   # Download state artifact
   gh run download <run-id> -n state-backup
   
   # Review saved state
   cat state-backup/release-state.json
   ```

2. **Manual Recovery**
   ```bash
   # Re-run failed jobs
   gh run rerun <run-id> --failed-jobs-only
   ```

### Lab: Rollback Scenario

```bash
# 1. Identify problematic release
gh release list --limit 5

# 2. Delete release and tag
gh release delete v1.2.3 --yes
git push --delete origin v1.2.3

# 3. Re-run with previous version
gh workflow run release.yml \
  -f release_strategy=custom \
  -f custom_version=1.2.2
```

## Module 4: Observability and Debugging

### Learning Objectives
- Enable debug logging
- Analyze structured logs
- Use metrics for optimization
- Troubleshoot issues

### Exercise 4.1: Debug Mode

```yaml
# Enable comprehensive logging
environment: test
debug: true
```

**What to Look For:**
- Correlation IDs in logs
- Performance timing
- Detailed error messages
- API request/response data

### Exercise 4.2: Log Analysis

1. **Download Logs**
   ```bash
   gh run download <run-id> -n release-events
   ```

2. **Query Logs**
   ```bash
   # Find all errors
   jq 'select(.event_status == "failed")' release-events.jsonl
   
   # Track specific operation
   jq 'select(.event_type == "version_determination")' release-events.jsonl
   
   # Performance analysis
   jq 'select(.event_type == "performance_warning")' release-events.jsonl
   ```

### Exercise 4.3: Metrics Dashboard

```bash
# View metrics summary
cat release-metrics.json | jq '.metrics'

# Check performance
cat performance-metrics.csv | column -t -s '|'
```

### Lab: Troubleshooting Challenge

**Scenario:** Release failed with vague error

**Steps:**
1. Enable debug mode
2. Re-run workflow
3. Analyze logs for root cause
4. Implement fix
5. Verify resolution

## Module 5: Enterprise Features

### Learning Objectives
- Configure approval workflows
- Implement release signing
- Generate SBOMs
- Validate compliance

### Exercise 5.1: Approval Configuration

1. **Create Environment**
   ```bash
   # Via GitHub UI
   Settings → Environments → New environment
   Name: production-release
   Required reviewers: 2
   ```

2. **Test Approval**
   ```yaml
   environment: production
   require_approval: true
   approval_environment: production-release
   ```

3. **Approve Release**
   - Navigate to Actions
   - Click "Review deployments"
   - Approve or reject

### Exercise 5.2: Release Signing

1. **Generate GPG Key**
   ```bash
   gpg --gen-key
   # Choose: RSA and RSA, 4096 bits
   
   # Export key
   gpg --armor --export-secret-keys release@company.com > release.key
   ```

2. **Configure Secrets**
   ```bash
   # Encode and set secret
   base64 release.key | gh secret set RELEASE_SIGNING_KEY
   gh secret set SIGNING_KEY_ID "release@company.com"
   ```

3. **Verify Signatures**
   ```bash
   # Download signed artifact
   gh release download v1.2.3 -p "*.sig"
   
   # Verify
   gpg --verify CHANGELOG.md.sig CHANGELOG.md
   ```

### Exercise 5.3: SBOM Generation

```yaml
# Enable SBOM
environment: production
generate_sbom: true
```

**Analyze SBOM:**
```bash
# Download SBOM
gh release download v1.2.3 -p "sbom.json"

# Review contents
jq '.components | length' sbom.json
jq '.components[0]' sbom.json
```

### Lab: Full Enterprise Release

Execute a complete enterprise release with all features:

```yaml
environment: production
release_strategy: semantic
require_approval: true
require_signatures: true
generate_sbom: true
check_dependencies: true
release_notes_template: detailed
```

## Module 6: Emergency Procedures

### Learning Objectives
- Handle emergency releases
- Override blackout periods
- Fast-track critical fixes
- Document emergency procedures

### Exercise 6.1: Emergency Release

```yaml
# Bypass normal controls
environment: production
emergency_release: true
override_blackout: true
require_approval: false  # Or keep true for critical approval
release_strategy: custom
custom_version: '1.2.3-hotfix'
```

### Exercise 6.2: Blackout Override

1. **Test During Blackout**
   ```yaml
   # Try normal release on weekend
   environment: production
   # Should fail with blackout message
   ```

2. **Override Blackout**
   ```yaml
   environment: production
   override_blackout: true
   emergency_release: true
   ```

### Lab: Emergency Response Drill

**Scenario:** Critical security vulnerability discovered

**Response Steps:**
1. Create hotfix branch
2. Apply security patch
3. Trigger emergency release
4. Verify deployment
5. Document in post-mortem

## Practical Scenarios

### Scenario 1: Monthly Release Cycle

**Setup:**
- Team releases monthly
- Multiple features per release
- Requires approval

**Solution:**
```yaml
# Scheduled workflow
on:
  schedule:
    - cron: '0 10 1 * *'  # First day of month, 10 AM

# Configuration
environment: production
release_strategy: semantic
require_approval: true
generate_sbom: true
```

### Scenario 2: Continuous Deployment

**Setup:**
- Deploy on every merge to main
- No manual approval for staging
- Full approval for production

**Solution:**
```yaml
# Staging (automatic)
on:
  push:
    branches: [main]

jobs:
  release_staging:
    uses: ./.github/workflows/release.yml
    with:
      environment: staging
      require_approval: false

# Production (manual with approval)
on:
  workflow_dispatch:

jobs:
  release_production:
    uses: ./.github/workflows/release.yml
    with:
      environment: production
      require_approval: true
```

### Scenario 3: Compliance-First Release

**Setup:**
- Regulated industry
- Requires signatures
- Full audit trail
- SBOM mandatory

**Solution:**
```yaml
environment: production
require_approval: true
require_signatures: true
generate_sbom: true
release_notes_template: detailed
# Ensure secrets configured:
# - RELEASE_SIGNING_KEY
# - AUDIT_SIGNING_KEY
```

## Best Practices

### 1. Version Strategy Selection
- **standard-version**: Node.js projects
- **semantic**: Conventional commits
- **calendar**: Time-based releases
- **custom**: Special cases only

### 2. Environment Configuration
- **test**: All features enabled, no approval
- **staging**: Most features, optional approval
- **production**: Full features, mandatory approval

### 3. Secret Management
- Rotate signing keys annually
- Use separate keys per environment
- Never share signing keys
- Document key fingerprints

### 4. Monitoring and Alerts
```yaml
# Add to workflow
- name: Send Notification
  if: failure()
  run: |
    curl -X POST $SLACK_WEBHOOK \
      -d '{"text":"Release failed: ${{ github.run_id }}"}'
```

## Troubleshooting Guide

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Approval timeout | Workflow cancelled | Check environment protection rules |
| Signing failure | "No secret key" | Verify RELEASE_SIGNING_KEY secret |
| Version conflict | "Version already exists" | Workflow will auto-retry |
| SBOM generation fails | Empty SBOM | Check npm dependencies |
| Blackout rejection | "Release blocked" | Use override_blackout |

### Debug Checklist
1. Enable debug mode
2. Check correlation ID in logs
3. Verify all secrets configured
4. Review environment settings
5. Check branch protection rules

## Certification Path

### Level 1: Basic Operator
- Complete Modules 1-2
- Pass basic operations quiz
- Execute 5 successful releases

### Level 2: Advanced User
- Complete Modules 3-4
- Handle error scenarios
- Demonstrate debugging skills

### Level 3: Enterprise Administrator
- Complete all modules
- Configure full enterprise setup
- Lead emergency drill
- Pass final assessment

## Quick Reference Card

### Essential Commands
```bash
# Trigger release
gh workflow run release.yml -f environment=test

# Check status
gh run list --workflow=release.yml

# View logs
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>

# Verify signatures
gpg --verify file.sig file
```

### Workflow Inputs Reference
```yaml
environment: test|staging|production
release_strategy: standard-version|semantic|calendar|custom
custom_version: "x.y.z"
require_approval: true|false
require_signatures: true|false
generate_sbom: true|false
emergency_release: true|false
override_blackout: true|false
debug: true|false
```

## Additional Resources

### Documentation
- [Migration Guide](./release-workflow-migration-guide.md)
- [Comparison Guide](./release-workflow-comparison.md)
- [Observability Guide](./release-observability-guide.md)
- [Enterprise Features Guide](./enterprise-release-features-guide.md)

### Support Channels
- Slack: #release-workflow-help
- Email: release-team@company.com
- Office Hours: Thursdays 2-3 PM

### Feedback
Please provide training feedback to help us improve:
- Training effectiveness survey
- Feature requests
- Bug reports
- Success stories

## Conclusion

This training provides hands-on experience with all aspects of the enterprise release workflow. Practice regularly and refer to this guide when needed. Remember: start simple and gradually adopt more features as your confidence grows.