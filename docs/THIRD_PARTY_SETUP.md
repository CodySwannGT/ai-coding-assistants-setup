# Third-Party Services Setup Guide

This guide provides CLI-based setup instructions for all third-party services used in the AI Coding Assistants Setup project. Each service enhances the development workflow with specific capabilities.

## Prerequisites

- Active accounts for the services you want to configure
- CLI tools installed (installation instructions provided for each service)
- Admin access to your GitHub repository

## Quick Setup Script

```bash
# Run this comprehensive setup script
# Save as scripts/setup-third-party-services.sh

#!/bin/bash
set -e

echo "🚀 Setting up third-party services for AI Coding Assistants"

# Check for required tools and install if missing
echo "🔧 Checking and installing CLI tools..."
./scripts/install-cli-tools.sh

# Configure each service
echo "🔒 Setting up security services..."
./scripts/setup-security-services.sh

echo "📊 Setting up monitoring services..."
./scripts/setup-monitoring-services.sh

echo "🧪 Setting up testing services..."
./scripts/setup-testing-services.sh

echo "🤖 Setting up AI services..."
./scripts/setup-ai-services.sh

echo "✅ All third-party services configured successfully!"
echo "📋 Next steps:"
echo "1. Verify all services are working with: ./scripts/verify-services.sh"
echo "2. Update your GitHub secrets with: ./scripts/update-github-secrets.sh"
echo "3. Test a complete workflow with a sample PR"
```

## CLI Tools Installation

Save as `scripts/install-cli-tools.sh`:

```bash
#!/bin/bash
set -e

echo "🔧 Installing required CLI tools..."

# GitHub CLI
if ! command -v gh &> /dev/null; then
  echo "Installing GitHub CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install gh
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update && sudo apt install gh
  fi
fi

# Jira CLI
if ! command -v jira &> /dev/null; then
  echo "Installing Jira CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install ankitpokhrel/jira-cli/jira-cli
  else
    # Install via Go
    go install github.com/ankitpokhrel/jira-cli/cmd/jira@latest
  fi
fi

# Sentry CLI
if ! command -v sentry-cli &> /dev/null; then
  echo "Installing Sentry CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install getsentry/tools/sentry-cli
  else
    curl -sL https://sentry.io/get-cli/ | bash
  fi
fi

# SonarCloud Scanner
if ! command -v sonar-scanner &> /dev/null; then
  echo "Installing SonarCloud Scanner..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install sonar-scanner
  else
    wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip
    unzip sonar-scanner-cli-4.8.0.2856-linux.zip
    sudo mv sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner
    sudo ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner
  fi
fi

# Snyk CLI
if ! command -v snyk &> /dev/null; then
  echo "Installing Snyk CLI..."
  npm install -g snyk
fi

# K6 CLI
if ! command -v k6 &> /dev/null; then
  echo "Installing K6..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install k6
  else
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver keyserver.ubuntu.com --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update && sudo apt-get install k6
  fi
fi

echo "✅ All CLI tools installed successfully!"
```

## Anthropic (Claude) Setup

### Installation and Configuration

```bash
# Install Claude CLI
npm install -g @anthropic-ai/claude-cli

# Authenticate with your API key
claude auth login

# Set up Claude for your project
claude init

# Configure Claude settings
cat > .claude/settings.json << 'EOF'
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 8192,
  "temperature": 0,
  "timeout": 120000,
  "mcp_servers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anysphere/memory-mcp-server", ".ai/memory.jsonl"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-github"]
    }
  }
}
EOF

# Set API key in GitHub secrets
gh secret set ANTHROPIC_API_KEY --body "your-anthropic-api-key-here"
```

### Claude GitHub App Installation

```bash
# Install Claude GitHub App via CLI (requires browser)
claude github install

# Or get the installation link
echo "📱 Install Claude GitHub App manually:"
echo "1. Visit: https://github.com/apps/claude-ai"
echo "2. Click 'Install' and select your repository"
echo "3. Configure permissions for code review and issue management"
```

## Jira Integration

### Initial Setup

```bash
# Initialize Jira CLI configuration
jira init

# Configure Jira server details
jira config set server "https://your-domain.atlassian.net"
jira config set project "YOUR_PROJECT_KEY"
jira config set user "your-email@company.com"

# Authenticate (will prompt for API token)
jira auth login

# Test connection
jira issue list --assignee "$(jira me)"
```

### Project Configuration

```bash
# Create a new Jira project (if needed)
jira project create \
  --name "AI Coding Assistants" \
  --key "AICA" \
  --type "software" \
  --template "kanban"

# Configure issue types
jira issue-type create \
  --name "Epic" \
  --description "Large feature or initiative"

jira issue-type create \
  --name "Story" \
  --description "User story or feature request"

jira issue-type create \
  --name "Bug" \
  --description "Defect or issue"

jira issue-type create \
  --name "Task" \
  --description "General task or maintenance"

# Set up custom fields
jira field create \
  --name "GitHub PR" \
  --type "url" \
  --description "Link to GitHub Pull Request"

jira field create \
  --name "Severity" \
  --type "select" \
  --options "Critical,High,Medium,Low"
```

### Workflow Integration

```bash
# Create workflow automation rules
cat > jira-automation.json << 'EOF'
{
  "rules": [
    {
      "name": "Auto-transition on PR merge",
      "trigger": "webhook",
      "conditions": [
        {"field": "GitHub PR", "operator": "is_not_empty"}
      ],
      "actions": [
        {"type": "transition", "to": "Done"}
      ]
    },
    {
      "name": "Create issue on workflow failure",
      "trigger": "webhook",
      "conditions": [
        {"field": "webhook.payload.action", "value": "workflow_run.failed"}
      ],
      "actions": [
        {"type": "create_issue", "issue_type": "Bug", "priority": "High"}
      ]
    }
  ]
}
EOF

# Apply automation rules
jira automation import --file jira-automation.json

# Set up GitHub secrets for Jira integration
gh secret set JIRA_BASE_URL --body "https://your-domain.atlassian.net"
gh secret set JIRA_USER_EMAIL --body "your-email@company.com"
gh secret set JIRA_API_TOKEN --body "your-jira-api-token"
gh secret set JIRA_PROJECT_KEY --body "AICA"
```

## Sentry Setup

### Project Initialization

```bash
# Authenticate with Sentry
sentry-cli login

# Create a new project
sentry-cli projects create \
  --name "ai-coding-assistants-setup" \
  --platform "node" \
  --team "your-team"

# Configure DSN and settings
SENTRY_DSN=$(sentry-cli projects info ai-coding-assistants-setup --format json | jq -r '.dsn.public')

# Set up release tracking
sentry-cli repos add \
  --org "your-org" \
  --repo "your-username/ai-coding-assistants-setup"

# Configure source maps (for web projects)
cat > .sentryclirc << EOF
[defaults]
url = https://sentry.io/
org = your-org
project = ai-coding-assistants-setup

[auth]
token = your-sentry-auth-token
EOF
```

### GitHub Integration

```bash
# Set up GitHub secrets for Sentry
gh secret set SENTRY_AUTH_TOKEN --body "your-sentry-auth-token"
gh secret set SENTRY_ORG --body "your-org"
gh secret set SENTRY_PROJECT --body "ai-coding-assistants-setup"
gh secret set SENTRY_DSN --body "$SENTRY_DSN"

# Configure Sentry GitHub integration
sentry-cli integrations install github \
  --org "your-org" \
  --repo "your-username/ai-coding-assistants-setup"
```

## SonarCloud Setup

### Project Configuration

```bash
# Login to SonarCloud
sonar-scanner --version

# Create sonar-project.properties
cat > sonar-project.properties << 'EOF'
sonar.projectKey=your-org_ai-coding-assistants-setup
sonar.organization=your-org
sonar.projectName=AI Coding Assistants Setup
sonar.projectVersion=1.0
sonar.sources=src
sonar.tests=tests
sonar.test.inclusions=**/*.test.js,**/*.test.ts,**/*.spec.js,**/*.spec.ts
sonar.coverage.exclusions=**/*.test.js,**/*.test.ts,**/*.spec.js,**/*.spec.ts,**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.lcov.reportPaths=coverage/lcov.info
EOF

# Set up SonarCloud organization (web interface required)
echo "📊 SonarCloud Setup:"
echo "1. Visit: https://sonarcloud.io/organizations"
echo "2. Import your GitHub organization"
echo "3. Add your repository to SonarCloud"
echo "4. Get your project key and organization key"
echo "5. Generate a token at: https://sonarcloud.io/account/security"

# Set GitHub secrets
gh secret set SONAR_TOKEN --body "your-sonarcloud-token"
gh secret set SONAR_ORGANIZATION --body "your-org"
gh secret set SONAR_PROJECT_KEY --body "your-org_ai-coding-assistants-setup"
```

### Quality Gate Configuration

```bash
# Create custom quality gate (requires SonarCloud web interface)
echo "🎯 Configure Quality Gate:"
echo "1. Go to https://sonarcloud.io/organizations/your-org/quality_gates"
echo "2. Create a new quality gate named 'AI Coding Assistants'"
echo "3. Set conditions:"
echo "   - Coverage: > 80%"
echo "   - Duplicated Lines: < 3%"
echo "   - Maintainability Rating: A"
echo "   - Reliability Rating: A"
echo "   - Security Rating: A"
echo "   - Security Hotspots Reviewed: 100%"
```

## Snyk Security Scanning

### Authentication and Setup

```bash
# Authenticate with Snyk
snyk auth

# Test current project for vulnerabilities
snyk test

# Configure Snyk for your project
snyk config set org="your-org-id"

# Create .snyk policy file
cat > .snyk << 'EOF'
# Snyk (https://snyk.io) policy file
version: v1.25.0
ignore: {}
patch: {}
EOF

# Set up monitoring
snyk monitor

# Configure GitHub integration
gh secret set SNYK_TOKEN --body "$(snyk config get api)"
gh secret set SNYK_ORG --body "your-org-id"
```

### Advanced Configuration

```bash
# Configure Snyk for different package managers
if [ -f "package.json" ]; then
  snyk test --package-manager=npm
fi

if [ -f "requirements.txt" ]; then
  snyk test --package-manager=pip
fi

if [ -f "Gemfile" ]; then
  snyk test --package-manager=rubygems
fi

# Set up Snyk container scanning (if using Docker)
if [ -f "Dockerfile" ]; then
  snyk container test .
fi

# Configure Snyk Infrastructure as Code scanning
snyk iac test .
```

## K6 Load Testing

### Installation and Setup

```bash
# Initialize K6 configuration
mkdir -p tests/load

# Create basic load test
cat > tests/load/basic-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.1'], // Error rate must be below 10%
  },
};

export default function() {
  let response = http.get('https://your-app-url.com');

  let checkRes = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!checkRes);
  sleep(1);
}
EOF

# Set up K6 Cloud account (optional)
k6 login cloud

# Set GitHub secrets for K6
gh secret set K6_CLOUD_TOKEN --body "your-k6-cloud-token"
```

### K6 Cloud Configuration

```bash
# Create K6 cloud project
k6 cloud --project-name "AI Coding Assistants" tests/load/basic-load-test.js

# Configure different test scenarios
cat > tests/load/smoke-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 1,
  duration: '1m',
};

export default function() {
  let response = http.get('https://your-app-url.com');
  check(response, { 'status is 200': (r) => r.status === 200 });
}
EOF

cat > tests/load/stress-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '10m', target: 200 },
    { duration: '5m', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://your-app-url.com');
  check(response, { 'status is 200': (r) => r.status === 200 });
}
EOF
```

## GitGuardian Security Scanning

### Setup and Configuration

```bash
# Install GitGuardian CLI
pip install detect-secrets

# Initialize GitGuardian configuration
cat > .secrets.baseline << 'EOF'
{
  "version": "1.4.0",
  "plugins_used": [
    {
      "name": "ArtifactoryDetector"
    },
    {
      "name": "AWSKeyDetector"
    },
    {
      "name": "Base64HighEntropyString",
      "limit": 4.5
    },
    {
      "name": "BasicAuthDetector"
    },
    {
      "name": "CloudantDetector"
    },
    {
      "name": "HexHighEntropyString",
      "limit": 3.0
    },
    {
      "name": "IbmCloudIamDetector"
    },
    {
      "name": "IbmCosHmacDetector"
    },
    {
      "name": "JwtTokenDetector"
    },
    {
      "name": "KeywordDetector",
      "keyword_exclude": ""
    },
    {
      "name": "MailchimpDetector"
    },
    {
      "name": "PrivateKeyDetector"
    },
    {
      "name": "SlackDetector"
    },
    {
      "name": "SoftlayerDetector"
    },
    {
      "name": "SquareOAuthDetector"
    },
    {
      "name": "StripeDetector"
    },
    {
      "name": "TwilioKeyDetector"
    }
  ],
  "filters_used": [
    {
      "path": "detect_secrets.filters.allowlist.is_line_allowlisted"
    },
    {
      "path": "detect_secrets.filters.common.is_ignored_due_to_verification_policies",
      "min_level": 2
    },
    {
      "path": "detect_secrets.filters.heuristic.is_indirect_reference"
    },
    {
      "path": "detect_secrets.filters.heuristic.is_likely_id_string"
    },
    {
      "path": "detect_secrets.filters.heuristic.is_templated_secret"
    }
  ],
  "results": {},
  "generated_at": "2023-01-01T00:00:00Z"
}
EOF

# Set up pre-commit hook for secret detection
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# Set GitHub secrets for GitGuardian
gh secret set GITGUARDIAN_API_KEY --body "your-gitguardian-api-key"
```

## Context7 Documentation Service

### Setup and Configuration

```bash
# Context7 is typically configured through their web interface
echo "📚 Context7 Setup:"
echo "1. Visit: https://context7.ai"
echo "2. Create an account and organization"
echo "3. Connect your GitHub repository"
echo "4. Generate an API key"
echo "5. Configure documentation preferences"

# Set GitHub secret for Context7
gh secret set CONTEXT7_API_KEY --body "your-context7-api-key"

# Create Context7 configuration
cat > .context7.json << 'EOF'
{
  "organization": "your-org",
  "project": "ai-coding-assistants-setup",
  "docs_path": "docs/",
  "include_patterns": [
    "**/*.md",
    "**/*.js",
    "**/*.ts",
    "**/*.json"
  ],
  "exclude_patterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**"
  ],
  "auto_update": true
}
EOF
```

## Brave Search API

### Configuration

```bash
# Brave Search API setup (for AI search capabilities)
echo "🔍 Brave Search API Setup:"
echo "1. Visit: https://api.search.brave.com/"
echo "2. Sign up for API access"
echo "3. Generate an API key"
echo "4. Configure rate limits and usage"

# Set GitHub secret for Brave Search
gh secret set BRAVE_SEARCH_API_KEY --body "your-brave-search-api-key"
```

## Firecrawl Web Scraping

### Setup and Configuration

```bash
# Firecrawl setup for web scraping capabilities
echo "🕷️ Firecrawl Setup:"
echo "1. Visit: https://firecrawl.dev/"
echo "2. Create an account"
echo "3. Generate an API key"
echo "4. Configure scraping policies"

# Set GitHub secret for Firecrawl
gh secret set FIRECRAWL_API_KEY --body "your-firecrawl-api-key"

# Create Firecrawl configuration
cat > .firecrawl.json << 'EOF'
{
  "rate_limit": 10,
  "timeout": 30000,
  "include_patterns": [
    "*.docs.*",
    "*.documentation.*",
    "*.api.*"
  ],
  "exclude_patterns": [
    "*.ads.*",
    "*.tracking.*",
    "*.analytics.*"
  ]
}
EOF
```

## Service Verification

Save as `scripts/verify-services.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Verifying all third-party services..."

# Test GitHub CLI
echo "Testing GitHub CLI..."
gh auth status && echo "✅ GitHub CLI working" || echo "❌ GitHub CLI failed"

# Test Jira CLI
echo "Testing Jira CLI..."
jira me > /dev/null 2>&1 && echo "✅ Jira CLI working" || echo "❌ Jira CLI failed"

# Test Sentry CLI
echo "Testing Sentry CLI..."
sentry-cli info > /dev/null 2>&1 && echo "✅ Sentry CLI working" || echo "❌ Sentry CLI failed"

# Test Snyk CLI
echo "Testing Snyk CLI..."
snyk auth && echo "✅ Snyk CLI working" || echo "❌ Snyk CLI failed"

# Test K6
echo "Testing K6..."
k6 version > /dev/null 2>&1 && echo "✅ K6 working" || echo "❌ K6 failed"

# Test SonarCloud Scanner
echo "Testing SonarCloud Scanner..."
sonar-scanner --version > /dev/null 2>&1 && echo "✅ SonarCloud Scanner working" || echo "❌ SonarCloud Scanner failed"

# Test API endpoints
echo "Testing API endpoints..."

# Test Anthropic API
if [ -n "$ANTHROPIC_API_KEY" ]; then
  curl -s -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages > /dev/null && echo "✅ Anthropic API working" || echo "❌ Anthropic API failed"
fi

echo "🎉 Service verification complete!"
```

## Secrets Management

Save as `scripts/update-github-secrets.sh`:

```bash
#!/bin/bash
set -e

echo "🔐 Updating GitHub secrets..."

# Read from environment file if it exists
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

# Required secrets
gh secret set PAT --body "${PAT:-}"
gh secret set ANTHROPIC_API_KEY --body "${ANTHROPIC_API_KEY:-}"

# Optional secrets (only set if value exists)
[ -n "${JIRA_API_TOKEN:-}" ] && gh secret set JIRA_API_TOKEN --body "$JIRA_API_TOKEN"
[ -n "${JIRA_BASE_URL:-}" ] && gh secret set JIRA_BASE_URL --body "$JIRA_BASE_URL"
[ -n "${JIRA_USER_EMAIL:-}" ] && gh secret set JIRA_USER_EMAIL --body "$JIRA_USER_EMAIL"
[ -n "${JIRA_PROJECT_KEY:-}" ] && gh secret set JIRA_PROJECT_KEY --body "$JIRA_PROJECT_KEY"

[ -n "${SENTRY_AUTH_TOKEN:-}" ] && gh secret set SENTRY_AUTH_TOKEN --body "$SENTRY_AUTH_TOKEN"
[ -n "${SENTRY_ORG:-}" ] && gh secret set SENTRY_ORG --body "$SENTRY_ORG"
[ -n "${SENTRY_PROJECT:-}" ] && gh secret set SENTRY_PROJECT --body "$SENTRY_PROJECT"

[ -n "${SONAR_TOKEN:-}" ] && gh secret set SONAR_TOKEN --body "$SONAR_TOKEN"
[ -n "${SNYK_TOKEN:-}" ] && gh secret set SNYK_TOKEN --body "$SNYK_TOKEN"
[ -n "${GITGUARDIAN_API_KEY:-}" ] && gh secret set GITGUARDIAN_API_KEY --body "$GITGUARDIAN_API_KEY"

[ -n "${K6_CLOUD_TOKEN:-}" ] && gh secret set K6_CLOUD_TOKEN --body "$K6_CLOUD_TOKEN"
[ -n "${CONTEXT7_API_KEY:-}" ] && gh secret set CONTEXT7_API_KEY --body "$CONTEXT7_API_KEY"
[ -n "${BRAVE_SEARCH_API_KEY:-}" ] && gh secret set BRAVE_SEARCH_API_KEY --body "$BRAVE_SEARCH_API_KEY"
[ -n "${FIRECRAWL_API_KEY:-}" ] && gh secret set FIRECRAWL_API_KEY --body "$FIRECRAWL_API_KEY"

echo "✅ GitHub secrets updated successfully!"
```

## Troubleshooting

### Common Issues

1. **CLI Authentication Failures:**

   ```bash
   # Re-authenticate with each service
   gh auth login
   jira auth login
   sentry-cli login
   snyk auth
   ```

2. **API Rate Limits:**

   ```bash
   # Check rate limit status
   gh api rate_limit
   snyk test --print-deps
   ```

3. **Configuration Validation:**
   ```bash
   # Validate all configuration files
   jq . .context7.json
   jq . .firecrawl.json
   yaml-lint .pre-commit-config.yaml
   ```

### Service-Specific Troubleshooting

#### Jira Issues

```bash
# Debug Jira connection
jira config list
jira auth status
curl -u "email:token" "https://your-domain.atlassian.net/rest/api/3/myself"
```

#### SonarCloud Issues

```bash
# Test SonarCloud connection
sonar-scanner -Dsonar.verbose=true -X
```

#### K6 Cloud Issues

```bash
# Verify K6 cloud authentication
k6 cloud --help
k6 login cloud --show-token
```

## Security Best Practices

1. **API Key Management:**

   - Rotate API keys regularly
   - Use environment-specific keys
   - Never commit keys to repositories
   - Use GitHub secrets for CI/CD

2. **Access Control:**

   - Follow principle of least privilege
   - Use service accounts where possible
   - Regular access reviews
   - Enable MFA on all services

3. **Monitoring:**
   - Set up alerts for unusual API usage
   - Monitor service health dashboards
   - Track authentication failures
   - Regular security audits

## Next Steps

After completing this setup:

1. **Test Integration:** Run a complete workflow to verify all services work together
2. **Monitor Usage:** Set up dashboards to track service usage and costs
3. **Team Training:** Ensure your team understands how to use each service
4. **Documentation:** Keep service configurations documented and up-to-date
5. **Regular Reviews:** Schedule periodic reviews of service configurations and access

For additional help, refer to each service's official documentation:

- [Jira CLI Documentation](https://github.com/ankitpokhrel/jira-cli)
- [Sentry CLI Documentation](https://docs.sentry.io/cli/)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Snyk CLI Documentation](https://docs.snyk.io/snyk-cli)
- [K6 Documentation](https://k6.io/docs/)
- [GitGuardian Documentation](https://docs.gitguardian.com/)
