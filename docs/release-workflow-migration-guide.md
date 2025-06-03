# Enterprise Release Workflow Migration Guide

## Overview

This guide provides a comprehensive approach to migrating from the existing release workflow to the new enterprise-grade release workflow. The migration can be done incrementally, allowing teams to adopt features gradually.

## Table of Contents

1. [Pre-Migration Assessment](#pre-migration-assessment)
2. [Migration Strategies](#migration-strategies)
3. [Phase-by-Phase Migration](#phase-by-phase-migration)
4. [Configuration Migration](#configuration-migration)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Post-Migration Validation](#post-migration-validation)

## Pre-Migration Assessment

### Current State Analysis

Before migrating, assess your current release workflow:

```bash
# Check current workflow version
grep "name:" .github/workflows/release.yml

# List workflow dependencies
gh workflow list

# Check recent workflow runs
gh run list --workflow=release.yml --limit=10

# Identify custom modifications
diff .github/workflows/release.yml <original-release.yml>
```

### Requirements Checklist

#### Infrastructure Requirements
- [ ] GitHub Actions runners available
- [ ] Sufficient API rate limits
- [ ] Network connectivity to external services
- [ ] Storage for artifacts (365-day retention)

#### Security Requirements
- [ ] GPG keys generated (for v4)
- [ ] Secrets configured in repository
- [ ] Approval environments set up (for v4)
- [ ] Access controls reviewed

#### Team Requirements
- [ ] Release managers identified
- [ ] Training schedule planned
- [ ] Communication plan ready
- [ ] Support resources available

## Migration Strategies

### 1. Big Bang Migration
**Best for**: Small teams, non-critical applications

```yaml
# Simply replace the entire workflow
mv .github/workflows/release.yml .github/workflows/release-legacy.yml
cp .github/workflows/release.yml .github/workflows/release.yml
```

### 2. Incremental Migration (Recommended)
**Best for**: Large teams, production systems

```yaml
# Phase 1: Basic features (v1)
# Phase 2: Add reliability (v2)
# Phase 3: Add observability (v3)
# Phase 4: Add enterprise features (v4)
```

### 3. Parallel Migration
**Best for**: Risk-averse organizations

```yaml
# Run both workflows in parallel
# Old workflow: release.yml
# New workflow: release.yml
# Gradually shift traffic
```

## Phase-by-Phase Migration

### Phase 1: Basic Enhancement (Week 1)

1. **Deploy Enhanced v1**
   ```yaml
   # Copy v1 workflow
   cp .github/workflows/release.yml .github/workflows/release-new.yml
   
   # Test with non-production branches
   on:
     push:
       branches: [develop, feature/*]
   ```

2. **Configure Basic Secrets**
   ```bash
   # Set required secrets
   gh secret set NPM_TOKEN
   gh secret set JIRA_TOKEN
   ```

3. **Validate Core Features**
   - Version management
   - Changelog generation
   - Basic release creation

### Phase 2: Reliability Features (Week 2)

1. **Upgrade to v2**
   ```yaml
   # Update workflow reference
   cp .github/workflows/release.yml .github/workflows/release-new.yml
   ```

2. **Test Error Scenarios**
   - Network failures
   - API timeouts
   - Version conflicts

3. **Verify Recovery**
   - Automatic retries working
   - State recovery functional
   - Rollback procedures tested

### Phase 3: Observability (Week 3)

1. **Upgrade to v3**
   ```yaml
   # Update workflow
   cp .github/workflows/release.yml .github/workflows/release-new.yml
   ```

2. **Configure Metrics** (Optional)
   ```bash
   gh secret set METRICS_API_KEY
   gh secret set METRICS_ENDPOINT
   ```

3. **Validate Observability**
   - Check event logs
   - Verify metrics collection
   - Review audit trails

### Phase 4: Enterprise Features (Week 4)

1. **Upgrade to v4**
   ```yaml
   # Final workflow version
   cp .github/workflows/release.yml .github/workflows/release.yml
   ```

2. **Configure Enterprise Features**
   ```bash
   # Signing keys (optional)
   gh secret set RELEASE_SIGNING_KEY
   gh secret set SIGNING_KEY_ID
   
   # Create approval environments
   gh api -X PUT /repos/:owner/:repo/environments/production-release \
     --field wait_timer=5 \
     --field reviewers='[{"type":"User","id":123}]'
   ```

3. **Enable Features Gradually**
   ```yaml
   # Start with minimal features
   with:
     require_approval: false
     require_signatures: false
   
   # Then enable as ready
   with:
     require_approval: true
     require_signatures: true
     generate_sbom: true
   ```

## Configuration Migration

### Workflow Inputs Mapping

| Old Workflow | New Workflow (v4) | Notes |
|--------------|-------------------|-------|
| `environment` | `environment` | No change |
| `skip_quality_checks` | `skip_jobs` | More granular control |
| N/A | `release_strategy` | New: version strategies |
| N/A | `require_approval` | New: optional approvals |
| N/A | `require_signatures` | New: signing support |
| N/A | `generate_sbom` | New: SBOM generation |

### Secrets Migration

```bash
# Migrate existing secrets
for secret in NPM_TOKEN JIRA_TOKEN; do
  VALUE=$(gh secret list | grep $secret)
  if [ -n "$VALUE" ]; then
    echo "✓ $secret already configured"
  else
    echo "✗ Need to set $secret"
  fi
done

# Add new secrets for v3+
gh secret set AUDIT_SIGNING_KEY < audit-key.pem
gh secret set METRICS_API_KEY

# Add new secrets for v4
gh secret set RELEASE_SIGNING_KEY < release-key.pem
gh secret set SIGNING_KEY_ID
```

### Environment Migration

```bash
# Create new environments for v4
gh api repos/:owner/:repo/environments -X PUT \
  -F name="production-release" \
  -F wait_timer=10 \
  -F deployment_branch_policy='{"protected_branches":true}'

# Add required reviewers
gh api repos/:owner/:repo/environments/production-release/reviewers \
  -X POST \
  -F reviewers='[{"type":"Team","id":123456}]'
```

## Rollback Procedures

### Immediate Rollback

```bash
#!/bin/bash
# rollback-release-workflow.sh

echo "🔄 Rolling back release workflow..."

# 1. Disable new workflow
gh workflow disable release.yml || true
gh workflow disable release.yml || true

# 2. Restore legacy workflow
if [ -f .github/workflows/release-legacy.yml ]; then
  mv .github/workflows/release-legacy.yml .github/workflows/release.yml
  echo "✅ Legacy workflow restored"
else
  echo "❌ Legacy workflow not found!"
  exit 1
fi

# 3. Re-enable workflow
gh workflow enable release.yml

# 4. Clear caches
gh cache delete --all || true

echo "✅ Rollback complete"
```

### Gradual Rollback

```yaml
# Disable features one by one
name: Release (Rollback Mode)
uses: ./.github/workflows/release.yml
with:
  # Disable enterprise features first
  require_approval: false
  require_signatures: false
  generate_sbom: false
  
  # Then disable observability
  debug: false
  
  # Keep basic enhancements
  environment: ${{ inputs.environment }}
```

### Data Recovery

```bash
# Recover from failed migration
# 1. Export workflow runs
gh run list --workflow=release.yml --json conclusion,createdAt,name > workflow-history.json

# 2. Export artifacts
for run_id in $(gh run list --workflow=release.yml --json databaseId -q '.[].databaseId'); do
  gh run download $run_id -D "backup/run-$run_id"
done

# 3. Restore if needed
```

## Troubleshooting

### Common Migration Issues

#### Issue: Workflow Not Triggering
```yaml
# Check workflow triggers
on:
  workflow_call:  # For reusable workflows
  workflow_dispatch:  # For manual triggers
  push:
    branches: [main]  # For automatic triggers
```

#### Issue: Secret Not Found
```bash
# Verify secrets
gh secret list

# Check secret names match exactly
grep -r "secrets\." .github/workflows/
```

#### Issue: Approval Timeout
```bash
# Check environment protection rules
gh api repos/:owner/:repo/environments/production-release

# Verify reviewers have access
gh api repos/:owner/:repo/collaborators
```

#### Issue: Signing Failures
```bash
# Test GPG key
echo "test" | gpg --armor --sign --local-user $SIGNING_KEY_ID

# Verify key not expired
gpg --list-secret-keys
```

### Debug Mode

Enable debug mode during migration:

```yaml
uses: ./.github/workflows/release.yml
with:
  debug: true
  # This enables verbose logging
```

## Post-Migration Validation

### Validation Checklist

1. **Functional Validation**
   ```bash
   # Test basic release
   gh workflow run release.yml -f environment=test -f force_release=true
   
   # Verify completion
   gh run watch
   ```

2. **Feature Validation**
   - [ ] Version bumping works
   - [ ] Changelog generation accurate
   - [ ] Release notes formatted correctly
   - [ ] GitHub release created
   - [ ] Artifacts uploaded
   - [ ] Signatures valid (if enabled)
   - [ ] SBOM generated (if enabled)
   - [ ] Metrics collected
   - [ ] Audit trail complete

3. **Performance Validation**
   ```bash
   # Compare execution times
   OLD_TIME=$(gh run list --workflow=release-legacy.yml --json durationMS -q '.[0].durationMS')
   NEW_TIME=$(gh run list --workflow=release.yml --json durationMS -q '.[0].durationMS')
   echo "Old: ${OLD_TIME}ms, New: ${NEW_TIME}ms"
   ```

4. **Security Validation**
   - [ ] Secrets properly scoped
   - [ ] Signatures verifiable
   - [ ] Audit logs tamper-proof
   - [ ] Access controls enforced

### Success Metrics

Track these metrics for 30 days post-migration:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Release Success Rate | >95% | Successful runs / Total runs |
| Average Duration | <5 min | Mean execution time |
| Error Rate | <5% | Failed runs / Total runs |
| Recovery Success | >90% | Recovered / Total failures |
| User Satisfaction | >4/5 | Survey results |

### Monitoring Setup

```yaml
# Add monitoring job
monitoring:
  runs-on: ubuntu-latest
  if: always()
  steps:
    - name: Report Metrics
      run: |
        # Send to monitoring platform
        curl -X POST ${{ secrets.METRICS_ENDPOINT }}/releases \
          -H "Authorization: Bearer ${{ secrets.METRICS_API_KEY }}" \
          -d '{
            "workflow": "release",
            "status": "${{ job.status }}",
            "duration": ${{ github.run_duration }},
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }'
```

## Migration Timeline Example

### Week 1: Preparation
- Day 1-2: Assessment and planning
- Day 3-4: Infrastructure setup
- Day 5: Team training

### Week 2: Development Environment
- Day 1-2: Deploy v1 to dev
- Day 3-4: Testing and validation
- Day 5: Team feedback

### Week 3: Staging Environment
- Day 1-2: Deploy v2-v3 to staging
- Day 3-4: Integration testing
- Day 5: Performance testing

### Week 4: Production Rollout
- Day 1: Deploy v4 to production (limited)
- Day 2-3: Monitor and adjust
- Day 4: Full rollout
- Day 5: Documentation and handoff

## Support Resources

### Documentation
- [Enterprise Release Workflow Overview](./enterprise-release-workflow.md)
- [Release Observability Guide](./release-observability-guide.md)
- [Enterprise Features Guide](./enterprise-release-features-guide.md)

### Getting Help
1. Check workflow logs for detailed errors
2. Review troubleshooting section
3. Search existing issues
4. Contact release engineering team

### Emergency Contacts
- Release Engineering: #release-eng (Slack)
- On-call: See PagerDuty
- Escalation: release-team@company.com

## Conclusion

The migration to the enterprise release workflow can be done safely and incrementally. Start with basic features and gradually enable more advanced capabilities as your team becomes comfortable. Always have a rollback plan and monitor the migration closely.

Remember: The new workflow is designed to be backward compatible, so you can take your time with the migration and adopt features as needed.