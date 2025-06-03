# Phase 5: Secret Management Enhancement [OPTIONAL - SKIP FOR NOW]

## Status: DEFERRED
This phase is being skipped for the initial implementation. Secrets will continue to be stored in GitHub Secrets. This phase is preserved for future enhancement when ready to implement OIDC and advanced secret management.

## Objective
Implement enterprise-grade secret management using OIDC authentication, least-privilege access patterns, and secure secret handling to eliminate long-lived credentials.

## Technical Specifications

### Current Issues
1. PAT token requires broad permissions
2. Multiple API tokens stored as secrets
3. No secret rotation mechanism
4. No audit trail for secret access

### Target Architecture
1. **OIDC Authentication**
   - GitHub OIDC provider for cloud services
   - Short-lived tokens only
   - Role-based access control

2. **Least Privilege Access**
   - Minimal required permissions per job
   - Scoped tokens for specific operations
   - Time-limited access windows

3. **Secret Management Service**
   - HashiCorp Vault integration option
   - AWS Secrets Manager for AWS users
   - Azure Key Vault for Azure users

## Tasks

### Task 1: Implement OIDC for Cloud Providers
- [ ] Configure GitHub OIDC provider
- [ ] Set up AWS role for OIDC
- [ ] Configure Azure service principal
- [ ] Create GCP workload identity

```yaml
# AWS OIDC Configuration
configure_aws_credentials:
  name: 🔐 Configure AWS Credentials
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
  steps:
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}
        role-session-name: GitHubActions-${{ github.run_id }}
        aws-region: ${{ vars.AWS_REGION }}
        
    - name: Get secrets from AWS Secrets Manager
      run: |
        # Retrieve API keys from Secrets Manager
        SONAR_TOKEN=$(aws secretsmanager get-secret-value \
          --secret-id prod/sonar/token \
          --query SecretString --output text)
        echo "::add-mask::$SONAR_TOKEN"
        echo "SONAR_TOKEN=$SONAR_TOKEN" >> $GITHUB_ENV
```

### Task 2: Refactor PAT Token Usage
- [ ] Identify minimum required permissions
- [ ] Create fine-grained PAT scopes
- [ ] Implement GitHub App authentication
- [ ] Remove broad PAT requirements

```yaml
# GitHub App Authentication
- name: Generate GitHub App token
  id: app-token
  uses: tibdex/github-app-token@v2
  with:
    app_id: ${{ vars.APP_ID }}
    private_key: ${{ secrets.APP_PRIVATE_KEY }}
    
- name: Use app token for PR comments
  uses: actions/github-script@v7
  with:
    github-token: ${{ steps.app-token.outputs.token }}
    script: |
      // Post PR comment with minimal permissions
```

### Task 3: Implement Secrets Vault Integration
- [ ] Add HashiCorp Vault support
- [ ] Create secret retrieval job
- [ ] Implement secret caching strategy
- [ ] Add secret rotation notifications

```yaml
vault_secrets:
  name: 🔒 Retrieve Secrets
  runs-on: ubuntu-latest
  outputs:
    secrets-json: ${{ steps.secrets.outputs.json }}
  steps:
    - name: Import Secrets from Vault
      id: secrets
      uses: hashicorp/vault-action@v2
      with:
        url: ${{ vars.VAULT_URL }}
        method: jwt
        role: github-actions
        secrets: |
          secret/data/ci sonar_token | SONAR_TOKEN ;
          secret/data/ci snyk_token | SNYK_TOKEN ;
          secret/data/ci anthropic_key | ANTHROPIC_API_KEY
          
    - name: Mask and export secrets
      run: |
        # Mask all secrets and prepare for job outputs
```

### Task 4: Implement Secret Access Policies
- [ ] Create secret access matrix
- [ ] Implement job-level secret scoping
- [ ] Add secret usage auditing
- [ ] Create secret request workflow

```yaml
# Secret access policy
secret_policy:
  quality_checks:
    allowed_secrets: []  # No secrets needed
    
  security_scanning:
    allowed_secrets:
      - SONAR_TOKEN
      - SNYK_TOKEN
      - GITGUARDIAN_API_KEY
      
  ai_scanning:
    allowed_secrets:
      - ANTHROPIC_API_KEY
    optional: true
    
  deployment:
    allowed_secrets:
      - AWS_ROLE_ARN
    use_oidc: true
```

### Task 5: Add Secret Rotation Mechanism
- [ ] Implement rotation detection
- [ ] Add rotation notifications
- [ ] Create automated rotation workflow
- [ ] Document rotation procedures

```yaml
secret_rotation_check:
  name: 🔄 Secret Rotation Check
  runs-on: ubuntu-latest
  schedule:
    - cron: '0 0 * * 1'  # Weekly check
  steps:
    - name: Check secret age
      run: |
        # Query secret metadata for age
        
    - name: Notify if rotation needed
      if: ${{ steps.check.outputs.rotation_needed == 'true' }}
      run: |
        # Send notification to security team
```

### Task 6: Create Secret Management Documentation
- [ ] Document OIDC setup procedures
- [ ] Create secret rotation runbook
- [ ] Add troubleshooting guide
- [ ] Provide migration path from PAT

## Quality Assurance

### Verification Steps
1. Test OIDC authentication with each cloud provider
2. Verify least-privilege access is enforced
3. Test secret rotation notifications
4. Validate audit logging for secret access
5. Confirm no long-lived credentials remain

### Security Test Scenarios
```bash
# Scenario 1: OIDC token generation
# Verify short-lived tokens are generated

# Scenario 2: Secret access denial
# Test job without required permissions

# Scenario 3: Secret rotation
# Simulate expired secret handling

# Scenario 4: Audit trail
# Verify all secret access is logged
```

## Documentation

### OIDC Setup Guide
- Provider-specific configuration
- Role and permission setup
- Trust relationship configuration
- Troubleshooting common issues

### Secret Migration Guide
```markdown
# Migrating from PAT to OIDC

## Phase 1: Setup OIDC
1. Configure GitHub OIDC provider
2. Create cloud provider roles
3. Test authentication

## Phase 2: Migrate Secrets
1. Move secrets to vault/cloud service
2. Update workflow to use OIDC
3. Test with non-production first

## Phase 3: Remove PAT
1. Verify all workflows function
2. Revoke PAT token
3. Update documentation
```

## Expected Outcomes

### Success Indicators
- Zero long-lived credentials in GitHub secrets
- All cloud operations use OIDC
- Secret rotation implemented
- Complete audit trail for secret access

### Metrics
- Number of long-lived credentials: 0
- Average token lifetime: <1 hour
- Secret rotation compliance: 100%
- Security audit findings: 0 critical