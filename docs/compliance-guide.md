# Compliance Automation Guide

## Overview

This guide explains how the enterprise quality workflow helps automate compliance requirements for SOC 2, ISO 27001, HIPAA, and PCI-DSS frameworks.

## Important: What This Does and Doesn't Do

### ✅ What It DOES

- **Automates evidence collection** for audits
- **Validates security controls** are in place
- **Creates audit trails** of all changes
- **Generates compliance reports** for auditors
- **Enforces approval workflows** for production
- **Tracks vulnerability remediation**

### ❌ What It DOESN'T Do

- Does NOT make you compliant by itself
- Does NOT replace security policies
- Does NOT handle infrastructure compliance
- Does NOT provide legal compliance certification
- Does NOT detect all compliance violations

Think of it as an **automated compliance assistant** that helps you prepare for audits.

## Quick Start

### Step 1: Choose Your Framework

```yaml
with:
  compliance_framework: 'soc2'  # or 'iso27001', 'hipaa', 'pci-dss'
```

### Step 2: Run the Workflow

The workflow will:
1. Run all quality and security checks
2. Validate framework-specific controls
3. Generate a compliance score
4. Create an audit log
5. Produce evidence artifacts

### Step 3: Review Results

Check the workflow summary for:
- Compliance validation report
- Control-by-control results
- Overall compliance score
- Recommendations for gaps

## Framework Details

### SOC 2 Type II

**Purpose**: Demonstrates security controls for service organizations

**Controls Validated**:
- **CC6.1 - Access Control**: No hardcoded credentials
- **CC7.1 - Vulnerability Management**: Security scanning
- **CC7.2 - Monitoring**: Audit logging enabled
- **CC8.1 - Change Management**: PR-based changes

**Evidence Generated**:
- Change approval records
- Security scan results
- Audit trail (90+ days)
- Test execution reports

### ISO 27001:2022

**Purpose**: Information security management system (ISMS) compliance

**Controls Validated**:
- **A.8.1 - Asset Management**: Software inventory via FOSSA
- **A.12.1 - Operations Security**: SAST via SonarCloud
- **A.14.2 - Secure Development**: Security testing suite

**Evidence Generated**:
- Software bill of materials
- Security testing reports
- Code quality metrics
- Vulnerability assessments

### HIPAA Security Rule

**Purpose**: Protects electronic protected health information (ePHI)

**Controls Validated**:
- **Access Control (164.312(a))**: GitHub permissions
- **Audit Controls (164.312(b))**: Workflow logging
- **Integrity (164.312(c))**: Testing validation
- **Transmission Security (164.312(e))**: HTTPS/TLS only

**Limitations**:
- Does NOT detect PHI in code
- Does NOT validate encryption at rest
- Manual review still required

### PCI-DSS v4.0

**Purpose**: Credit card data security

**Controls Validated**:
- **Req 2.2**: No default passwords
- **Req 6.3**: Secure coding (SAST)
- **Req 6.4**: Change control process
- **Req 11.3**: Vulnerability scanning

**Limitations**:
- Application layer only
- No network scanning
- No cardholder data detection

## Audit Preparation

### 1. Enable Evidence Collection

```yaml
with:
  compliance_framework: 'soc2'
  audit_retention_days: 365        # 1 year retention
  generate_evidence_package: true  # Creates audit bundle
```

### 2. Configure Approval Gates

For SOC 2 and PCI-DSS, enable approval workflows:

```yaml
with:
  compliance_framework: 'soc2'
  require_approval: true
```

Then configure GitHub environment protection:
1. Go to Settings > Environments
2. Create "production" environment
3. Add required reviewers
4. Set deployment branch rules

### 3. Run Regular Compliance Checks

Schedule weekly compliance validation:

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  compliance:
    uses: ./.github/workflows/quality.yml
    with:
      compliance_framework: 'soc2'
      generate_evidence_package: true
```

### 4. Collect Evidence

Download evidence packages:

```bash
# List recent workflow runs
gh run list --workflow=quality.yml

# Download evidence for specific run
gh run download $RUN_ID -n compliance-evidence-$RUN_ID
gh run download $RUN_ID -n audit-log-$RUN_ID
```

## Control Mapping

### Quality Controls → Compliance

| Workflow Check | SOC 2 | ISO 27001 | HIPAA | PCI-DSS |
|---------------|-------|-----------|-------|---------|
| Lint/Format | - | A.12.1 | - | Req 6.3 |
| Type Check | - | A.12.1 | - | Req 6.3 |
| Unit Tests | CC7.1 | A.14.2 | 164.312(c) | Req 6.3 |
| Build | - | - | - | - |
| npm audit | CC7.1 | A.12.6 | - | Req 11.3 |
| SonarCloud | CC7.1 | A.12.1 | - | Req 6.3 |
| Snyk | CC7.1 | A.12.6 | - | Req 11.3 |
| Secret Scan | CC6.1 | A.8.2 | 164.312(a) | Req 2.2 |
| License Check | - | A.8.1 | - | - |

### Workflow Features → Compliance

| Feature | Compliance Benefit |
|---------|-------------------|
| PR Required | Change management control |
| Audit Logs | Evidence trail for auditors |
| Approval Gates | Segregation of duties |
| Security Scans | Vulnerability management |
| Test Automation | Quality assurance |

## Common Audit Questions

### Q: "Show me your change management process"
**A**: Point to:
- PR-based workflow requirement
- Approval gates for production
- Audit logs showing who/what/when
- Test requirements before merge

### Q: "How do you manage vulnerabilities?"
**A**: Show:
- Automated scanning (Snyk, npm audit)
- SAST results (SonarCloud)
- Secret detection (GitGuardian)
- Remediation timeline in issues

### Q: "Demonstrate access controls"
**A**: Provide:
- GitHub permission model
- No hardcoded credentials (secret scan)
- Environment-based approvals
- Audit trail of all actions

### Q: "Where's your security testing?"
**A**: Display:
- Security tool configuration
- Latest scan results
- Compliance dashboard
- Evidence packages

## Best Practices

### 1. Run Compliance Checks Early
Don't wait for audit season. Run regularly:
- Every PR for code changes
- Weekly for full compliance
- Monthly evidence archival

### 2. Address Gaps Immediately
When compliance score drops:
- Review the specific control
- Create issue for remediation
- Track in project board
- Re-run after fixes

### 3. Maintain Evidence
- Set appropriate retention (365 days for annual audits)
- Download critical evidence locally
- Document any manual overrides
- Keep approval records

### 4. Customize for Your Needs
The workflow is a starting point. Add:
- Custom control validations
- Additional security tools
- Company-specific policies
- Integration with GRC platforms

## Limitations and Disclaimers

1. **Not Legal Advice**: This tool assists with compliance but doesn't guarantee it
2. **Application Layer Only**: Doesn't cover infrastructure, network, or physical security
3. **Framework Subset**: Implements common controls, not comprehensive coverage
4. **Manual Review Required**: Automated checks supplement, not replace, human review
5. **No Data Classification**: Doesn't detect or classify sensitive data types

## Getting Help

- **Setup Issues**: Check workflow logs and documentation
- **Compliance Questions**: Consult your compliance team or auditor
- **Tool Integration**: See enterprise-quality-workflow.md
- **Custom Controls**: Submit PR with additions