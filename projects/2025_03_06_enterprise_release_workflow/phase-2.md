# Phase 2: Reliability & Error Handling

## Objective
Add comprehensive retry mechanisms, proper error handling, and validation specifically for release operations including git commands, API calls, and release artifact creation.

## Tasks

### 1. Git Operation Retry Mechanisms
- [ ] Add retry logic for git push operations
- [ ] Implement retry for tag creation
- [ ] Handle network timeouts gracefully
- [ ] Add conflict resolution retries
- [ ] Implement git operation validation

### 2. API Call Resilience
- [ ] Add retry logic for GitHub API calls
- [ ] Implement Jira webhook retries (if configured)
- [ ] Handle rate limiting properly
- [ ] Add timeout configurations
- [ ] Implement circuit breaker pattern

### 3. Release Validation
- [ ] Validate package.json version updates
- [ ] Check changelog generation success
- [ ] Verify tag creation
- [ ] Validate release artifact integrity
- [ ] Implement pre-release checks

### 4. Error Recovery
- [ ] Create rollback mechanisms for failed releases
- [ ] Implement partial release recovery
- [ ] Add cleanup for failed operations
- [ ] Create error state management
- [ ] Implement failure notifications

### 5. Release Health Checks
- [ ] Verify git repository state
- [ ] Check branch protection rules
- [ ] Validate permissions before operations
- [ ] Ensure clean working directory
- [ ] Verify release prerequisites

## Technical Specifications

### Git Operation Retry Implementation
```yaml
git-retry-operations:
  name: 🔄 Git Operations with Retry
  steps:
    - name: Setup Retry Function
      run: |
        # Create reusable retry function
        cat > /tmp/git-retry.sh << 'EOF'
        #!/bin/bash
        git_retry() {
          local max_attempts=${MAX_ATTEMPTS:-3}
          local timeout=${TIMEOUT:-30}
          local attempt=0
          local exit_code=0
          
          while [ $attempt -lt $max_attempts ]; do
            attempt=$((attempt + 1))
            
            echo "Attempt $attempt of $max_attempts..."
            
            # Execute command with timeout
            if timeout $timeout "$@"; then
              echo "✅ Command succeeded on attempt $attempt"
              return 0
            else
              exit_code=$?
              echo "❌ Command failed with exit code $exit_code"
              
              if [ $attempt -lt $max_attempts ]; then
                echo "⏳ Retrying in $((attempt * 5)) seconds..."
                sleep $((attempt * 5))
              fi
            fi
          done
          
          echo "❌ All $max_attempts attempts failed"
          return $exit_code
        }
        
        export -f git_retry
        EOF
        
        chmod +x /tmp/git-retry.sh
        source /tmp/git-retry.sh
    
    - name: Push with Retry
      run: |
        source /tmp/git-retry.sh
        
        # Configure git with retry
        git config --global http.retryCount 3
        git config --global http.timeout 30
        
        # Push changes with retry
        MAX_ATTEMPTS=5 TIMEOUT=60 git_retry git push --follow-tags origin ${{ github.ref_name }}
    
    - name: Tag Creation with Validation
      run: |
        source /tmp/git-retry.sh
        
        TAG_NAME="${{ needs.version.outputs.tag }}"
        
        # Validate tag doesn't exist
        if git ls-remote --tags origin | grep -q "refs/tags/$TAG_NAME$"; then
          echo "❌ Tag $TAG_NAME already exists!"
          
          # Try to delete and recreate if force enabled
          if [ "${{ inputs.force_release }}" == "true" ]; then
            echo "Force mode enabled, deleting existing tag..."
            git_retry git push origin :refs/tags/$TAG_NAME
            git tag -d $TAG_NAME 2>/dev/null || true
          else
            exit 1
          fi
        fi
        
        # Create and push tag with retry
        git_retry git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
        git_retry git push origin "$TAG_NAME"
```

### API Call Resilience
```yaml
api-resilience:
  name: 🌐 API Call Resilience
  steps:
    - name: GitHub API with Retry
      uses: actions/github-script@v7
      with:
        script: |
          const { Octokit } = require("@octokit/rest");
          const { retry } = require("@octokit/plugin-retry");
          const { throttling } = require("@octokit/plugin-throttling");
          
          const MyOctokit = Octokit.plugin(retry, throttling);
          
          const octokit = new MyOctokit({
            auth: '${{ secrets.PAT }}',
            throttle: {
              onRateLimit: (retryAfter, options) => {
                console.warn(`Rate limit exceeded, retrying after ${retryAfter} seconds`);
                return true;
              },
              onSecondaryRateLimit: (retryAfter, options) => {
                console.warn(`Secondary rate limit hit, retrying after ${retryAfter} seconds`);
                return true;
              },
            },
            retry: {
              doNotRetry: ["429"],
              retries: 5,
            },
          });
          
          // Create release with retry
          try {
            const release = await octokit.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: '${{ needs.version.outputs.tag }}',
              name: 'Release ${{ needs.version.outputs.version }}',
              body: core.getInput('release_notes'),
              draft: false,
              prerelease: '${{ needs.version.outputs.prerelease }}' === 'true',
              generate_release_notes: true,
            });
            
            core.setOutput('release_id', release.data.id);
            core.setOutput('release_url', release.data.html_url);
          } catch (error) {
            if (error.status === 422 && error.message.includes('already_exists')) {
              console.log('Release already exists, updating instead...');
              
              // Get existing release
              const releases = await octokit.repos.listReleases({
                owner: context.repo.owner,
                repo: context.repo.repo,
              });
              
              const existingRelease = releases.data.find(r => r.tag_name === '${{ needs.version.outputs.tag }}');
              
              if (existingRelease) {
                // Update existing release
                const updated = await octokit.repos.updateRelease({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  release_id: existingRelease.id,
                  body: core.getInput('release_notes'),
                });
                
                core.setOutput('release_id', updated.data.id);
                core.setOutput('release_url', updated.data.html_url);
              }
            } else {
              throw error;
            }
          }
    
    - name: Jira Webhook with Retry
      if: ${{ inputs.jira_project_key != '' && secrets.JIRA_AUTOMATION_WEBHOOK != '' }}
      run: |
        # Function to call webhook with retry
        call_webhook_with_retry() {
          local webhook_url="$1"
          local payload="$2"
          local max_attempts=3
          local attempt=0
          
          while [ $attempt -lt $max_attempts ]; do
            attempt=$((attempt + 1))
            
            response=$(curl -s -w "\n%{http_code}" -X POST \
              -H "Content-Type: application/json" \
              -d "$payload" \
              --max-time 30 \
              "$webhook_url")
            
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | sed '$d')
            
            if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
              echo "✅ Webhook call succeeded with status $http_code"
              return 0
            elif [ "$http_code" -eq 429 ]; then
              echo "⏳ Rate limited, waiting before retry..."
              sleep $((attempt * 10))
            else
              echo "❌ Webhook call failed with status $http_code"
              echo "Response: $body"
              
              if [ $attempt -lt $max_attempts ]; then
                sleep $((attempt * 5))
              fi
            fi
          done
          
          return 1
        }
        
        # Prepare webhook payload
        PAYLOAD=$(jq -n \
          --arg version "${{ needs.version.outputs.version }}" \
          --arg tag "${{ needs.version.outputs.tag }}" \
          --arg project "${{ inputs.jira_project_key }}" \
          --arg env "${{ inputs.environment }}" \
          '{
            version: $version,
            tag: $tag,
            project: $project,
            environment: $env,
            timestamp: now | strftime("%Y-%m-%dT%H:%M:%SZ")
          }')
        
        # Call webhook with retry
        if ! call_webhook_with_retry "${{ secrets.JIRA_AUTOMATION_WEBHOOK }}" "$PAYLOAD"; then
          echo "⚠️ Jira webhook failed after all retries (non-blocking)"
        fi
```

### Release Validation
```yaml
release-validation:
  name: ✅ Release Validation
  steps:
    - name: Pre-Release Checks
      run: |
        echo "🔍 Running pre-release validation..."
        
        # Check git state
        if [ -n "$(git status --porcelain)" ]; then
          echo "❌ Working directory is not clean!"
          git status
          exit 1
        fi
        
        # Verify we're on the correct branch
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "${{ inputs.environment }}" ]; then
          echo "⚠️ Warning: Current branch ($CURRENT_BRANCH) doesn't match environment (${{ inputs.environment }})"
        fi
        
        # Check if we have unpushed commits
        if [ -n "$(git log origin/$CURRENT_BRANCH..HEAD)" ]; then
          echo "❌ Unpushed commits detected!"
          git log origin/$CURRENT_BRANCH..HEAD --oneline
          exit 1
        fi
        
        # Verify package.json exists
        if [ ! -f "package.json" ]; then
          echo "❌ package.json not found!"
          exit 1
        fi
        
        # Validate package.json is valid JSON
        if ! jq empty package.json 2>/dev/null; then
          echo "❌ package.json is not valid JSON!"
          exit 1
        fi
    
    - name: Post-Release Validation
      run: |
        echo "🔍 Validating release artifacts..."
        
        VERSION="${{ needs.version.outputs.version }}"
        TAG="${{ needs.version.outputs.tag }}"
        
        # Verify version in package.json
        PACKAGE_VERSION=$(jq -r .version package.json)
        if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
          echo "❌ Version mismatch! package.json: $PACKAGE_VERSION, expected: $VERSION"
          exit 1
        fi
        
        # Verify tag exists locally
        if ! git tag | grep -q "^$TAG$"; then
          echo "❌ Tag $TAG not found locally!"
          exit 1
        fi
        
        # Verify tag exists on remote
        if ! git ls-remote --tags origin | grep -q "refs/tags/$TAG$"; then
          echo "❌ Tag $TAG not found on remote!"
          exit 1
        fi
        
        # Verify CHANGELOG.md was updated
        if ! git diff HEAD^ HEAD --name-only | grep -q "CHANGELOG.md"; then
          echo "⚠️ Warning: CHANGELOG.md was not updated"
        fi
        
        echo "✅ All release validations passed!"
```

### Error Recovery
```yaml
error-recovery:
  name: 🚨 Error Recovery
  if: failure()
  steps:
    - name: Capture Error State
      run: |
        # Save current state for debugging
        mkdir -p error-logs
        
        echo "=== Git Status ===" > error-logs/git-state.log
        git status >> error-logs/git-state.log
        
        echo "=== Git Log ===" >> error-logs/git-state.log
        git log --oneline -10 >> error-logs/git-state.log
        
        echo "=== Git Tags ===" >> error-logs/git-state.log
        git tag --list >> error-logs/git-state.log
        
        echo "=== Package Info ===" > error-logs/package-state.log
        jq . package.json >> error-logs/package-state.log 2>/dev/null || echo "Failed to read package.json"
    
    - name: Attempt Recovery
      run: |
        echo "🔧 Attempting to recover from failed release..."
        
        # Reset git state if needed
        if [ -n "$(git status --porcelain)" ]; then
          echo "Cleaning working directory..."
          git reset --hard HEAD
          git clean -fd
        fi
        
        # Remove local tag if it wasn't pushed
        TAG="${{ needs.version.outputs.tag }}"
        if git tag | grep -q "^$TAG$"; then
          if ! git ls-remote --tags origin | grep -q "refs/tags/$TAG$"; then
            echo "Removing unpushed tag $TAG..."
            git tag -d "$TAG"
          fi
        fi
        
        # Revert version bump if commit wasn't pushed
        if git log -1 --pretty=%B | grep -q "chore(release):"; then
          if ! git log origin/${{ github.ref_name }}..HEAD | grep -q "chore(release):"; then
            echo "Reverting unpushed release commit..."
            git reset --hard HEAD^
          fi
        fi
    
    - name: Upload Error Logs
      uses: actions/upload-artifact@v4
      with:
        name: release-error-logs-${{ github.run_id }}
        path: error-logs/
        retention-days: 7
```

## Quality Assurance

### Verification Steps
1. Test retry mechanisms with network failures
2. Validate API rate limit handling
3. Test rollback procedures
4. Verify error recovery works
5. Test validation catches issues
6. Confirm partial failure handling

### Success Metrics
- All retryable operations succeed within limits
- Rate limiting handled gracefully
- Failed releases can be recovered
- Validation catches all issues
- Error logs provide debugging info

## Documentation

### Required Documentation
- Retry configuration guide
- Error recovery procedures
- Validation checklist
- Troubleshooting guide
- Recovery runbook

### Operational Procedures
- How to handle failed releases
- Manual recovery steps
- Debugging release issues
- Force release procedures

## Expected Outcomes

1. **Resilient Operations**
   - Transient failures automatically recovered
   - Network issues handled gracefully
   - API limits respected
   - Consistent retry behavior

2. **Release Integrity**
   - All releases validated
   - No partial releases
   - Clean error recovery
   - State consistency maintained

3. **Operational Excellence**
   - Clear error messages
   - Comprehensive logs
   - Recovery procedures
   - Reduced manual intervention

## Dependencies
- Retry utilities
- API client libraries with retry support
- Validation scripts
- Error logging infrastructure