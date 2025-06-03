# Enterprise Release Features Guide

## Overview

The Enhanced Release Workflow v4 introduces enterprise-grade features including optional approval workflows, release signing, attestation generation, compliance validation, and advanced release management capabilities. This guide explains how to configure and use these features.

## Table of Contents

1. [Optional Approval Workflows](#optional-approval-workflows)
2. [Release Signing](#release-signing)
3. [Release Attestation](#release-attestation)
4. [SBOM Generation](#sbom-generation)
5. [Blackout Periods](#blackout-periods)
6. [Compliance Validation](#compliance-validation)
7. [Emergency Releases](#emergency-releases)
8. [Configuration Examples](#configuration-examples)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Optional Approval Workflows

### Overview

The workflow supports optional approval gates that can be configured per environment. When enabled, releases will pause and wait for approval before proceeding.

### Configuration

```yaml
- uses: ./.github/workflows/release.yml
  with:
    environment: 'production'
    require_approval: true
    approval_environment: 'production-release'  # Optional, defaults to environment
```

### Setting Up Approval Environments

1. Go to Settings > Environments in your repository
2. Create an environment (e.g., `production-release`)
3. Configure protection rules:
   - Required reviewers
   - Restrict deployment branches
   - Add deployment protection rules

### Approval Process

When approval is required:

1. Workflow pauses at the approval step
2. Configured reviewers receive notification
3. Reviewers approve/reject in GitHub UI
4. Workflow continues after approval

### Bypassing Approval

For emergency releases, you can bypass approval:

```yaml
with:
  require_approval: false
  emergency_release: true
```

## Release Signing

### Overview

Release signing provides cryptographic proof of release authenticity and integrity. When enabled, the workflow signs:

- Release artifacts (CHANGELOG, SBOM, etc.)
- Git tags
- Release manifest

### Prerequisites

1. Generate a GPG key pair:
```bash
gpg --full-generate-key
# Choose RSA and RSA, 4096 bits
# Set appropriate expiration
```

2. Export the private key:
```bash
gpg --armor --export-secret-keys YOUR_KEY_ID > release-signing.key
```

3. Configure repository secrets:
- `RELEASE_SIGNING_KEY`: Base64-encoded private key
- `SIGNING_KEY_ID`: Key ID or email
- `SIGNING_KEY_PASSPHRASE`: Key passphrase (if set)

### Enabling Signing

```yaml
- uses: ./.github/workflows/release.yml
  with:
    require_signatures: true
  secrets:
    RELEASE_SIGNING_KEY: ${{ secrets.RELEASE_SIGNING_KEY }}
    SIGNING_KEY_ID: ${{ secrets.SIGNING_KEY_ID }}
    SIGNING_KEY_PASSPHRASE: ${{ secrets.SIGNING_KEY_PASSPHRASE }}
```

### Signature Verification

To verify a signed release:

```bash
# Import public key
gpg --import release-key.pub

# Download artifacts
curl -L -o CHANGELOG.md.sig https://github.com/org/repo/releases/download/v1.0.0/CHANGELOG.md.sig
curl -L -o CHANGELOG.md https://github.com/org/repo/releases/download/v1.0.0/CHANGELOG.md

# Verify signature
gpg --verify CHANGELOG.md.sig CHANGELOG.md
```

### Release Manifest

The workflow creates a signed manifest containing:
- Version information
- SHA256 checksums of all artifacts
- Base64-encoded signatures
- Timestamp and metadata

## Release Attestation

### Overview

Release attestations provide verifiable claims about the release process, including:
- SLSA provenance
- Build environment details
- Quality check results
- Approval records

### SLSA Provenance

The workflow generates SLSA v0.2 provenance containing:
- Builder identity
- Build invocation details
- Source repository information
- Build configuration

### Release Attestation Contents

```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "attestations": {
    "quality": {
      "passed": true,
      "checks": {
        "lint": "success",
        "test": "success",
        "security": "success"
      }
    },
    "approvals": {
      "required": true,
      "received": true,
      "approver": "release-manager"
    },
    "signatures": {
      "required": true,
      "artifacts_signed": true
    },
    "compliance": {
      "frameworks": ["SOC2", "ISO27001"],
      "emergency_release": false
    }
  }
}
```

### Accessing Attestations

Attestations are stored as workflow artifacts with 365-day retention:
- `provenance.json`: SLSA provenance
- `release-attestation.json`: Comprehensive attestation

## SBOM Generation

### Overview

Software Bill of Materials (SBOM) generation provides a complete inventory of dependencies for security and compliance.

### Enabling SBOM

```yaml
- uses: ./.github/workflows/release.yml
  with:
    generate_sbom: true
```

### SBOM Format

The workflow generates SBOMs in CycloneDX format:
- JSON format for machine processing
- Includes all npm dependencies
- Contains version and license information
- Signed when signatures are enabled

### Using the SBOM

```bash
# Download SBOM
curl -L -o sbom.json https://github.com/org/repo/releases/download/v1.0.0/sbom.json

# Analyze with tools
cyclonedx-cli analyze sbom.json
```

## Blackout Periods

### Overview

Blackout periods prevent releases during sensitive times:
- Weekends (production only)
- Late nights (10 PM - 6 AM)
- Holidays
- Custom periods

### Default Blackout Rules

| Environment | Restrictions |
|-------------|--------------|
| production | No weekends, no late nights, holiday blackouts |
| staging | Limited Sunday evening restrictions |
| development | No restrictions |

### Overriding Blackouts

For critical fixes:

```yaml
- uses: ./.github/workflows/release.yml
  with:
    override_blackout: true
    emergency_release: true
```

### Custom Blackout Configuration

Currently, blackout periods are defined in the workflow. To customize:

1. Fork the workflow
2. Modify the `release_schedule` job
3. Add your organization's blackout rules

## Compliance Validation

### Overview

The workflow validates compliance with:
- SOC 2 Type II
- ISO 27001:2022
- SLSA Level 1-2

### Compliance Checks

1. **Change Management**
   - Approval documentation
   - Audit trail completeness
   - Change tracking

2. **Security Controls**
   - Signature validation
   - Access control (approvals)
   - Integrity verification

3. **Operational Procedures**
   - Quality gate enforcement
   - Release documentation
   - Evidence collection

### Compliance Report

Each release generates a compliance report containing:
- Framework compliance status
- Control validation results
- Issues found (if any)
- Evidence references

### Evidence Package

The workflow creates a compliance evidence package:
- 7-year retention
- All attestations and signatures
- Audit trail
- Compliance report

## Emergency Releases

### Overview

Emergency releases bypass certain controls while maintaining audit trail:

```yaml
- uses: ./.github/workflows/release.yml
  with:
    emergency_release: true
    override_blackout: true
    require_approval: false  # Can still require if needed
```

### Emergency Release Features

- Bypass blackout periods
- Expedited process
- Enhanced logging
- Compliance notation
- Post-release review requirements

### Best Practices

1. Document emergency reason
2. Perform post-release review
3. Update normal release with fixes
4. Review process improvements

## Configuration Examples

### Standard Production Release

```yaml
name: Production Release

on:
  workflow_dispatch:

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'production'
      require_approval: true
      require_signatures: true
      generate_sbom: true
      check_dependencies: true
    secrets: inherit
```

### Staging Release with Signing

```yaml
name: Staging Release

on:
  push:
    branches: [staging]

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'staging'
      require_approval: false
      require_signatures: true
      release_strategy: 'semantic'
    secrets: inherit
```

### Development Release (Minimal)

```yaml
name: Development Release

on:
  push:
    branches: [develop]

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'development'
      require_approval: false
      require_signatures: false
      skip_jobs: 'audit,cdk-synth'
    secrets: inherit
```

### Emergency Hotfix

```yaml
name: Emergency Hotfix

on:
  workflow_dispatch:

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'production'
      emergency_release: true
      override_blackout: true
      require_approval: true  # Still require approval
      require_signatures: true
      release_notes_template: 'security'
    secrets: inherit
```

## Security Best Practices

### Key Management

1. **Key Generation**
   - Use strong keys (4096-bit RSA minimum)
   - Set appropriate expiration
   - Use separate keys per environment

2. **Key Storage**
   - Store keys in GitHub Secrets
   - Rotate keys regularly
   - Never commit keys to repository

3. **Key Usage**
   - Limit key access to release workflows
   - Monitor key usage
   - Revoke compromised keys immediately

### Approval Security

1. **Environment Protection**
   - Use branch protection rules
   - Require multiple approvers for production
   - Set deployment windows

2. **Reviewer Management**
   - Regularly review approver list
   - Use teams for approver groups
   - Implement separation of duties

### Attestation Verification

1. **Automated Verification**
   ```yaml
   - name: Verify Previous Release
     run: |
       # Download and verify attestation
       curl -L -o attestation.json $PREV_ATTESTATION_URL
       jq -e '.attestations.signatures.artifacts_signed == true' attestation.json
   ```

2. **Manual Verification**
   - Check attestation completeness
   - Verify signature chains
   - Validate compliance status

## Troubleshooting

### Common Issues

#### Signing Failures

**Problem**: "No signing key available"
**Solution**: 
- Verify `RELEASE_SIGNING_KEY` secret is set
- Check key format (must be base64-encoded)
- Ensure key hasn't expired

**Problem**: "Failed to sign artifact"
**Solution**:
- Check `SIGNING_KEY_ID` matches key
- Verify passphrase if key is encrypted
- Check GPG is installed in runner

#### Approval Timeouts

**Problem**: "Environment protection rules not satisfied"
**Solution**:
- Check environment exists
- Verify approvers have access
- Review protection rules

#### Blackout Override Not Working

**Problem**: "Release blocked despite override"
**Solution**:
- Ensure both `override_blackout: true` and `emergency_release: true`
- Check for typos in input names
- Verify no additional restrictions

#### Compliance Failures

**Problem**: "Compliance validation failed"
**Solution**:
- Review compliance report for specific issues
- Ensure all required features are enabled
- Check quality gates passed

### Debug Mode

Enable debug logging for detailed information:

```yaml
with:
  debug: true
```

This provides:
- Detailed event logging
- Step-by-step execution trace
- Configuration validation
- Error details

### Getting Help

1. Check workflow logs for specific errors
2. Review attestation and compliance reports
3. Verify all secrets are configured
4. Check GitHub Status for service issues

## Summary

The Enterprise Release Features provide:

- **Security**: Cryptographic signing and attestation
- **Control**: Optional approval workflows
- **Compliance**: Automated validation and evidence
- **Flexibility**: Emergency release procedures
- **Visibility**: Comprehensive audit trails

Use these features to create a secure, compliant, and auditable release process that meets enterprise requirements while maintaining developer productivity.