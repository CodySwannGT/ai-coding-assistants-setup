# GitHub Repository Setup Guide

This guide provides comprehensive instructions for configuring GitHub repositories to work optimally with the AI Coding Assistants Setup project, including branch protection rules, status checks, and GitHub Copilot integration.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) installed and authenticated
- Repository admin access
- GitHub Copilot access (for Copilot configuration)

## Quick Setup Script

```bash
# Run this script to configure your repository with optimal settings
# Save as scripts/setup-github.sh and run: chmod +x scripts/setup-github.sh && ./scripts/setup-github.sh

#!/bin/bash
set -e

REPO_OWNER="${1:-$(gh repo view --json owner --jq .owner.login)}"
REPO_NAME="${2:-$(gh repo view --json name --jq .name)}"

echo "🚀 Setting up GitHub repository: $REPO_OWNER/$REPO_NAME"

# Enable required repository features
echo "📋 Configuring repository settings..."
gh api repos/$REPO_OWNER/$REPO_NAME --method PATCH --field \
  has_issues=true \
  has_projects=true \
  has_wiki=false \
  delete_branch_on_merge=true \
  allow_squash_merge=true \
  allow_merge_commit=true \
  allow_rebase_merge=true \
  allow_auto_merge=true

# Configure branch protection rules
echo "🛡️ Setting up branch protection rules..."
./scripts/setup-branch-protection.sh $REPO_OWNER $REPO_NAME

# Set up GitHub Copilot
echo "🤖 Configuring GitHub Copilot..."
./scripts/setup-copilot.sh $REPO_OWNER $REPO_NAME

echo "✅ GitHub repository setup complete!"
```

## Repository Settings Configuration

### Basic Repository Settings

```bash
# Configure basic repository settings
gh api repos/OWNER/REPO --method PATCH --field \
  has_issues=true \
  has_projects=true \
  has_wiki=false \
  delete_branch_on_merge=true \
  allow_squash_merge=true \
  allow_merge_commit=true \
  allow_rebase_merge=true \
  allow_auto_merge=true \
  security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"},"dependency_graph":{"status":"enabled"},"dependabot_security_updates":{"status":"enabled"}}'
```

### Security Settings

```bash
# Enable security features
gh api repos/OWNER/REPO --method PATCH --field \
  security_and_analysis='{
    "secret_scanning": {"status": "enabled"},
    "secret_scanning_push_protection": {"status": "enabled"},
    "dependency_graph": {"status": "enabled"},
    "dependabot_security_updates": {"status": "enabled"},
    "dependabot_alerts": {"status": "enabled"}
  }'

# Configure vulnerability reporting
gh api repos/OWNER/REPO --method PATCH --field \
  has_vulnerability_reports=true
```

## Branch Protection Rules

Based on the provided screenshots, here's the complete branch protection configuration:

### Create Branch Protection Script

Save as `scripts/setup-branch-protection.sh`:

```bash
#!/bin/bash
set -e

REPO_OWNER="${1:-$(gh repo view --json owner --jq .owner.login)}"
REPO_NAME="${2:-$(gh repo view --json name --jq .name)}"

echo "🛡️ Setting up branch protection for: $REPO_OWNER/$REPO_NAME"

# Function to create branch protection rule
create_branch_protection() {
  local branch_pattern="$1"
  local rule_name="$2"

  echo "Creating protection rule for: $branch_pattern"

  gh api repos/$REPO_OWNER/$REPO_NAME/branches/$branch_pattern/protection \
    --method PUT \
    --field required_status_checks='{
      "strict": true,
      "checks": [
        {"context": "Quality Checks / 🏗️ Build", "app_id": 15368},
        {"context": "Quality Checks / 📝 Check Formatting", "app_id": 15368},
        {"context": "Quality Checks / 🔍 SonarCloud SAST", "app_id": 15368},
        {"context": "Quality Checks / 🔧 Type Check", "app_id": 15368},
        {"context": "Quality Checks / 🔒 Security Scan", "app_id": 15368},
        {"context": "Quality Checks / ✅ Lint", "app_id": 15368}
      ]
    }' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "require_last_push_approval": true,
      "bypass_pull_request_allowances": {
        "users": [],
        "teams": [],
        "apps": []
      }
    }' \
    --field restrictions=null \
    --field required_linear_history=false \
    --field allow_force_pushes=false \
    --field allow_deletions=false \
    --field block_creations=false \
    --field required_conversation_resolution=true \
    --field lock_branch=false \
    --field allow_fork_syncing=true
}

# Create branch protection for main branches
create_branch_protection "main" "Main Branch Protection"
create_branch_protection "dev" "Development Branch Protection"
create_branch_protection "staging" "Staging Branch Protection"

echo "✅ Branch protection rules configured successfully!"
```

### Individual Branch Protection Commands

#### Main Branch Protection

```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "checks": [
      {"context": "Quality Checks / 🏗️ Build", "app_id": 15368},
      {"context": "Quality Checks / 📝 Check Formatting", "app_id": 15368},
      {"context": "Quality Checks / 🔍 SonarCloud SAST", "app_id": 15368},
      {"context": "Quality Checks / 🔧 Type Check", "app_id": 15368},
      {"context": "Quality Checks / 🔒 Security Scan", "app_id": 15368},
      {"context": "Quality Checks / ✅ Lint", "app_id": 15368}
    ]
  }' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": true
  }' \
  --field restrictions=null \
  --field required_linear_history=false \
  --field allow_force_pushes=false \
  --field allow_deletions=true \
  --field block_creations=false \
  --field required_conversation_resolution=true
```

#### Development and Staging Branches

```bash
# Apply same protection to dev and staging
for branch in dev staging; do
  gh api repos/OWNER/REPO/branches/$branch/protection \
    --method PUT \
    --field required_status_checks='{
      "strict": true,
      "checks": [
        {"context": "Quality Checks / 🏗️ Build", "app_id": 15368},
        {"context": "Quality Checks / 📝 Check Formatting", "app_id": 15368},
        {"context": "Quality Checks / 🔍 SonarCloud SAST", "app_id": 15368},
        {"context": "Quality Checks / 🔧 Type Check", "app_id": 15368},
        {"context": "Quality Checks / 🔒 Security Scan", "app_id": 15368},
        {"context": "Quality Checks / ✅ Lint", "app_id": 15368}
      ]
    }' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "require_last_push_approval": true
    }' \
    --field restrictions=null \
    --field required_linear_history=false \
    --field allow_force_pushes=false \
    --field allow_deletions=true \
    --field block_creations=false \
    --field required_conversation_resolution=true
done
```

## GitHub Copilot Configuration

### Enable Copilot for Pull Request Reviews

Save as `scripts/setup-copilot.sh`:

```bash
#!/bin/bash
set -e

REPO_OWNER="${1:-$(gh repo view --json owner --jq .owner.login)}"
REPO_NAME="${2:-$(gh repo view --json name --jq .name)}"

echo "🤖 Setting up GitHub Copilot for: $REPO_OWNER/$REPO_NAME"

# Enable Copilot pull request reviews
gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
  --method PATCH \
  --field required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": true,
    "bypass_pull_request_allowances": {
      "users": [],
      "teams": [],
      "apps": [{"id": 271156}]
    }
  }'

# Configure Copilot workspace settings (requires organization admin)
# Note: This requires organization-level permissions
gh api orgs/$REPO_OWNER/copilot/billing --method GET > /dev/null 2>&1 && {
  echo "📊 Configuring organization Copilot settings..."

  gh api orgs/$REPO_OWNER/copilot/billing --method PATCH --field \
    seat_breakdown='{
      "total": 1,
      "added_this_cycle": 0,
      "pending_invitation": 0,
      "pending_cancellation": 0,
      "active_this_cycle": 1,
      "inactive_this_cycle": 0
    }'
} || {
  echo "⚠️  Skipping organization Copilot settings (requires org admin access)"
}

echo "✅ GitHub Copilot configuration complete!"
```

### Manual Copilot Setup

If the script doesn't work, configure Copilot manually:

1. **Enable Copilot for the repository:**

   - Go to repository Settings → Code security and analysis
   - Enable "GitHub Copilot autofix suggestions"

2. **Configure PR review automation:**

   - Go to repository Settings → Branches
   - Edit branch protection rule for `main`
   - Check "Request pull request review from Copilot"

3. **Organization settings** (requires org admin):
   - Go to Organization Settings → Copilot
   - Add repository to enabled repositories
   - Configure policies and usage restrictions

## Secrets and Environment Variables Setup

### Required Secrets

```bash
# Set up all required secrets at once
# First, create .github/workflows/.env with your values, then:

gh secret set PAT --body "$(cat .env | grep PAT= | cut -d= -f2-)"
gh secret set ANTHROPIC_API_KEY --body "$(cat .env | grep ANTHROPIC_API_KEY= | cut -d= -f2-)"

# Optional secrets for enhanced features
gh secret set SONAR_TOKEN --body "$(cat .env | grep SONAR_TOKEN= | cut -d= -f2-)" || true
gh secret set SNYK_TOKEN --body "$(cat .env | grep SNYK_TOKEN= | cut -d= -f2-)" || true
gh secret set GITGUARDIAN_API_KEY --body "$(cat .env | grep GITGUARDIAN_API_KEY= | cut -d= -f2-)" || true
gh secret set K6_CLOUD_TOKEN --body "$(cat .env | grep K6_CLOUD_TOKEN= | cut -d= -f2-)" || true
gh secret set SENTRY_AUTH_TOKEN --body "$(cat .env | grep SENTRY_AUTH_TOKEN= | cut -d= -f2-)" || true
```

### Environment-specific Secrets

```bash
# Set up environment-specific secrets
gh secret set PAT_STAGING --env staging --body "your-staging-pat"
gh secret set PAT_PRODUCTION --env production --body "your-production-pat"

# Database and service credentials
gh secret set DATABASE_URL --env production --body "your-production-db-url"
gh secret set API_KEY --env production --body "your-production-api-key"
```

## GitHub Apps Configuration

### Install Required GitHub Apps

```bash
# Install Dependabot (usually pre-installed)
gh api repos/OWNER/REPO/dependabot/alerts --method GET > /dev/null || {
  echo "Installing Dependabot..."
  # Dependabot is typically enabled by default for public repos
}

# Claude GitHub App (follow Claude documentation)
echo "📚 Install Claude GitHub App manually:"
echo "1. Visit: https://github.com/apps/claude-ai"
echo "2. Click 'Install' and select your repository"
echo "3. Follow the setup instructions in Claude documentation"

# SonarCloud App
echo "📊 Install SonarCloud App:"
echo "1. Visit: https://github.com/apps/sonarcloud"
echo "2. Install and configure for your repository"
echo "3. Set SONAR_TOKEN secret with your SonarCloud token"
```

## Repository Labels Setup

```bash
# Create standard labels for issue and PR management
gh label create "type:bug" --description "Something isn't working" --color "d73a4a"
gh label create "type:feature" --description "New feature or request" --color "a2eeef"
gh label create "type:documentation" --description "Improvements or additions to documentation" --color "0075ca"
gh label create "type:maintenance" --description "Maintenance and cleanup tasks" --color "e4e669"
gh label create "priority:high" --description "High priority issue" --color "b60205"
gh label create "priority:medium" --description "Medium priority issue" --color "fbca04"
gh label create "priority:low" --description "Low priority issue" --color "0e8a16"
gh label create "status:needs-review" --description "Ready for review" --color "fbca04"
gh label create "status:in-progress" --description "Currently being worked on" --color "0e8a16"
gh label create "size:small" --description "Small effort required" --color "c2e0c6"
gh label create "size:medium" --description "Medium effort required" --color "fef2c0"
gh label create "size:large" --description "Large effort required" --color "f9c2c2"
```

## Repository Templates Setup

### Issue Templates

Create `.github/ISSUE_TEMPLATE/`:

```bash
mkdir -p .github/ISSUE_TEMPLATE

# Bug report template
cat > .github/ISSUE_TEMPLATE/bug_report.yml << 'EOF'
name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["type:bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: How can we reproduce this issue?
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: What environment are you running in?
      placeholder: |
        - OS: [e.g. macOS, Windows, Linux]
        - Node.js version: [e.g. 18.0.0]
        - Package version: [e.g. 2.0.0]
    validations:
      required: true
EOF

# Feature request template
cat > .github/ISSUE_TEMPLATE/feature_request.yml << 'EOF'
name: Feature Request
description: Suggest an idea for this project
title: "[Feature]: "
labels: ["type:feature"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!
  - type: textarea
    id: problem
    attributes:
      label: Is your feature request related to a problem?
      description: A clear and concise description of what the problem is.
      placeholder: I'm always frustrated when [...]
  - type: textarea
    id: solution
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.
  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context or screenshots about the feature request here.
EOF
```

### Pull Request Template

```bash
cat > .github/pull_request_template.md << 'EOF'
## Description

Brief description of the changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing

- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)

## Additional Notes

Add any additional notes or context here.
EOF
```

## Customizing Lint and Format Rules for CI/CD

The GitHub workflows are designed to work with **any lint and format configuration**. Projects are free to customize or replace the default ESLint and Prettier rules:

### Status Check Compatibility

The required status checks include:

- **✅ Lint** - Runs your project's `npm run lint` command
- **📝 Check Formatting** - Runs your project's `npm run format:check` command

These will work with any configuration as long as your package.json scripts are properly set up.

### Custom Configuration Examples

#### ESLint Customization

```bash
# Replace default ESLint config with your own
cp your-company/.eslintrc.json .eslintrc.json

# Update package.json script to use your custom config
{
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx --config .eslintrc.json"
  }
}
```

#### Prettier Customization

```bash
# Replace default Prettier config
cp your-company/.prettierrc.json .prettierrc.json

# Update package.json script
{
  "scripts": {
    "format:check": "prettier --check . --config .prettierrc.json"
  }
}
```

#### Framework-Specific Setups

**React Projects:**

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "plugins": ["react", "react-hooks"],
  "rules": {
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error"
  }
}
```

**Vue Projects:**

```json
{
  "extends": [
    "eslint:recommended",
    "@vue/eslint-config-typescript",
    "@vue/eslint-config-prettier"
  ],
  "plugins": ["vue"],
  "rules": {
    "vue/multi-word-component-names": "off"
  }
}
```

### Testing Custom Rules

Before enabling branch protection, verify your custom rules work:

```bash
# Test lint configuration
npm run lint

# Test format configuration
npm run format:check

# Test the complete quality workflow locally
npm run test && npm run lint && npm run format:check && npm run typecheck

# Create a test PR to verify CI integration
git checkout -b test-custom-lint-rules
echo "// Test file" > test.js
git add test.js && git commit -m "test: verify custom lint rules"
git push origin test-custom-lint-rules
gh pr create --title "Test: Custom Lint Rules" --body "Testing custom lint configuration"
```

### Excluding Status Checks

If you don't want certain checks (e.g., you don't use TypeScript), modify the branch protection rules:

```bash
# Remove Type Check from required status checks
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --field required_status_checks='{
    "strict": true,
    "checks": [
      {"context": "Quality Checks / 🏗️ Build", "app_id": 15368},
      {"context": "Quality Checks / 📝 Check Formatting", "app_id": 15368},
      {"context": "Quality Checks / 🔍 SonarCloud SAST", "app_id": 15368},
      {"context": "Quality Checks / 🔒 Security Scan", "app_id": 15368},
      {"context": "Quality Checks / ✅ Lint", "app_id": 15368}
    ]
  }'
```

### Company-Wide Standards

For organizations with established coding standards:

1. **Create a shared ESLint config package:**

   ```bash
   npm install --save-dev @your-company/eslint-config
   ```

2. **Extend from your company config:**

   ```json
   {
     "extends": ["@your-company/eslint-config"]
   }
   ```

3. **Update workflows** to use your company's quality standards while keeping the same CI/CD automation.

The GitHub workflows provide the **automation infrastructure** while respecting your **code quality standards**.

## Validation and Testing

### Verify Branch Protection

```bash
# Test branch protection rules
gh api repos/OWNER/REPO/branches/main/protection --jq '.required_status_checks.checks[].context'

# Verify required reviews
gh api repos/OWNER/REPO/branches/main/protection --jq '.required_pull_request_reviews'

# Check if Copilot is enabled
gh api repos/OWNER/REPO/branches/main/protection --jq '.required_pull_request_reviews' | grep -q copilot && echo "✅ Copilot enabled" || echo "❌ Copilot not configured"
```

### Test Status Checks

```bash
# Create a test PR to verify all checks run
git checkout -b test-branch-protection
echo "# Test" > test-file.md
git add test-file.md
git commit -m "test: verify branch protection"
git push origin test-branch-protection

# Create PR and check status
gh pr create --title "Test: Branch Protection" --body "Testing branch protection rules"
gh pr status --json statusCheckRollup --jq '.currentBranch.statusCheckRollup[].status'
```

## Troubleshooting

### Common Issues

1. **Status checks not appearing:**

   ```bash
   # Verify workflow files exist and are valid
   gh workflow list
   gh workflow view quality.yml
   ```

2. **Branch protection not enforced:**

   ```bash
   # Check if rules are properly configured
   gh api repos/OWNER/REPO/branches/main/protection --jq '.required_status_checks.strict'
   ```

3. **Copilot not reviewing PRs:**
   ```bash
   # Verify Copilot is enabled for the repository
   gh api repos/OWNER/REPO/settings --jq '.has_code_scanning'
   ```

### Reset Branch Protection

```bash
# Remove all branch protection (use with caution)
gh api repos/OWNER/REPO/branches/main/protection --method DELETE

# Recreate with correct settings
./scripts/setup-branch-protection.sh
```

## Security Considerations

1. **Secrets Management:**

   - Never commit secrets to the repository
   - Use GitHub secrets for all sensitive data
   - Rotate tokens regularly

2. **Branch Protection:**

   - Always require PR reviews for main branches
   - Enable required status checks
   - Restrict force pushes

3. **Access Control:**
   - Use teams for managing repository access
   - Implement principle of least privilege
   - Regular access reviews

## Next Steps

After completing this setup:

1. **Test the configuration** with a sample PR
2. **Train your team** on the new workflows
3. **Monitor status checks** and adjust as needed
4. **Review security settings** regularly
5. **Update protection rules** as your project evolves

For additional help, see:

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
