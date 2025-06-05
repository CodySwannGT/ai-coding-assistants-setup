# Phase 2: Traditional Security Tools Integration

## Objective
Integrate enterprise-standard security scanning tools to complement AI scanners, providing comprehensive security coverage that meets enterprise compliance requirements.

## Technical Specifications

### Security Tools to Integrate
1. **SAST (Static Application Security Testing)**
   - Primary: SonarQube/SonarCloud
   - Alternative: Checkmarx (for enterprises with existing licenses)

2. **Dependency Scanning**
   - Primary: Snyk
   - Alternative: WhiteSource/Mend
   - Existing: npm audit (keep as baseline)

3. **Secret Detection**
   - Primary: GitGuardian
   - Alternative: TruffleHog
   - Backup: GitHub secret scanning

4. **License Compliance**
   - Primary: FOSSA
   - Alternative: License Finder

5. **Container Scanning** (if applicable)
   - Primary: Trivy
   - Alternative: Anchore

### Implementation Strategy
- Each tool should be independently skippable
- Tools should automatically skip if API keys are not provided
- Results should be aggregated in a security dashboard
- Tools should support both cloud and self-hosted options
- Integration should use official GitHub Actions where available

### Token Existence Checking
Since GitHub Actions doesn't allow direct secret checking in `if` conditions, we'll implement a two-step approach:
1. Primary: Use `if: ${{ !contains(inputs.skip_jobs, 'job_name') && secrets.TOKEN_NAME != '' }}`
2. Fallback: Add a check step within each job that gracefully exits if the token is not set

Example pattern:
```yaml
security_tool:
  name: 🔒 Security Tool
  runs-on: ubuntu-latest
  if: ${{ !contains(inputs.skip_jobs, 'security_tool') }}
  steps:
    - name: Check for required secrets
      id: check_secrets
      run: |
        if [ -z "${{ secrets.TOOL_TOKEN }}" ]; then
          echo "⚠️ TOOL_TOKEN not set, skipping security scan"
          echo "skip=true" >> $GITHUB_OUTPUT
        else
          echo "skip=false" >> $GITHUB_OUTPUT
        fi
    
    - name: Checkout
      if: steps.check_secrets.outputs.skip != 'true'
      uses: actions/checkout@v4
      
    - name: Run security scan
      if: steps.check_secrets.outputs.skip != 'true'
      uses: security/tool-action@v1
      env:
        TOOL_TOKEN: ${{ secrets.TOOL_TOKEN }}
```

## Tasks

### Task 1: Design Security Tool Architecture
- [ ] Create security tools configuration schema
- [ ] Design result aggregation strategy
- [ ] Plan secret management for tool APIs
- [ ] Define severity thresholds and policies

### Task 2: Implement SAST Integration
- [ ] Add SonarQube/SonarCloud job
- [ ] Configure quality gates
- [ ] Set up project analysis properties
- [ ] Handle monorepo scenarios
- [ ] Add token existence check
```yaml
sonarcloud:
  name: 🔍 SonarCloud Analysis
  runs-on: ubuntu-latest
  if: ${{ !contains(inputs.skip_jobs, 'sonarcloud') && secrets.SONAR_TOKEN != '' }}
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Task 3: Implement Enhanced Dependency Scanning
- [ ] Add Snyk integration
- [ ] Configure severity thresholds
- [ ] Set up policy files
- [ ] Create dependency update workflow
- [ ] Add token existence check
```yaml
snyk:
  name: 🛡️ Snyk Security
  runs-on: ubuntu-latest
  if: ${{ !contains(inputs.skip_jobs, 'snyk') && secrets.SNYK_TOKEN != '' }}
  steps:
    - uses: actions/checkout@v4
    - uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

### Task 4: Implement Secret Detection
- [ ] Add GitGuardian scanning
- [ ] Configure pre-commit hooks reference
- [ ] Set up baseline for existing secrets
- [ ] Create remediation workflow
- [ ] Add API key existence check
```yaml
secret_scanning:
  name: 🔐 Secret Detection
  runs-on: ubuntu-latest
  if: ${{ !contains(inputs.skip_jobs, 'secret_scan') && secrets.GITGUARDIAN_API_KEY != '' }}
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: GitGuardian/ggshield-action@master
      env:
        GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
```

### Task 5: Implement License Compliance
- [ ] Add FOSSA integration
- [ ] Configure allowed/denied licenses
- [ ] Set up attribution file generation
- [ ] Create license policy documentation
- [ ] Add API key existence check
```yaml
license_check:
  name: 📜 License Compliance
  runs-on: ubuntu-latest
  if: ${{ !contains(inputs.skip_jobs, 'license_check') && secrets.FOSSA_API_KEY != '' }}
  steps:
    - uses: actions/checkout@v4
    - uses: fossas/fossa-action@main
      with:
        api-key: ${{ secrets.FOSSA_API_KEY }}
```

### Task 6: Create Security Dashboard Job
- [ ] Aggregate results from all security tools
- [ ] Generate unified security report
- [ ] Create security score calculation
- [ ] Implement trend tracking

## Quality Assurance

### Verification Steps
1. Each tool can be individually enabled/disabled
2. Tools fail gracefully when tokens are not provided
3. Security reports are properly aggregated
4. No duplicate scanning of same vulnerabilities
5. Performance impact is within acceptable limits

### Test Scenarios
- Run with all tools enabled
- Run with selective tools disabled
- Test with known vulnerable dependencies
- Test with planted secrets (in test files)
- Test with various license types

## Documentation

### Configuration Guide
Create comprehensive guide covering:
- How to obtain API tokens for each tool
- Configuration options and thresholds
- Interpreting scan results
- Remediation workflows

### Security Policy Template
```markdown
# Security Policy

## Supported Versions
| Version | Supported          |
| ------- | ------------------ |
| x.x.x   | :white_check_mark: |

## Security Scanning
This project uses the following security tools:
- SonarQube for SAST
- Snyk for dependency scanning
- GitGuardian for secret detection
- FOSSA for license compliance

## Reporting a Vulnerability
[Instructions for security reports]
```

## Expected Outcomes

### Success Indicators
- Comprehensive security coverage across multiple vectors
- Reduced false positives through tool correlation
- Clear security posture visibility
- Automated compliance reporting

### Metrics
- Number of vulnerabilities detected by category
- Mean time to remediation
- Security tool coverage percentage
- Compliance score improvements