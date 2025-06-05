#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Release Recovery Script
# -----------------------------------------------------------------------------
# This script helps recover from failed releases by cleaning up partial state
# and providing guided recovery steps.
#
# Usage: ./release-recovery.sh [--version VERSION] [--tag TAG] [--force]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERSION=""
TAG=""
FORCE_MODE=false
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --version)
      VERSION="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --force)
      FORCE_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--version VERSION] [--tag TAG] [--force] [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --version   Version to recover from"
      echo "  --tag       Tag to clean up"
      echo "  --force     Force recovery without prompts"
      echo "  --dry-run   Show what would be done without making changes"
      echo "  --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

confirm() {
    if [ "$FORCE_MODE" = true ]; then
        return 0
    fi
    
    local prompt="$1"
    local response
    
    echo -n "$prompt (y/N): "
    read -r response
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

run_command() {
    local cmd="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would execute: $cmd"
        return 0
    fi
    
    log_info "$description"
    if eval "$cmd"; then
        log_success "Completed: $description"
        return 0
    else
        log_error "Failed: $description"
        return 1
    fi
}

# Main recovery process
main() {
    echo "🔧 Release Recovery Tool"
    echo "======================="
    echo ""
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository!"
        exit 1
    fi
    
    # Gather information if not provided
    if [ -z "$VERSION" ] && [ -z "$TAG" ]; then
        # Try to detect from recent commits
        log_info "Detecting recent release attempts..."
        
        RECENT_RELEASE=$(git log --oneline -10 | grep "chore(release):" | head -1 || true)
        if [ -n "$RECENT_RELEASE" ]; then
            VERSION=$(echo "$RECENT_RELEASE" | sed -n 's/.*chore(release): \([^ ]*\).*/\1/p')
            log_info "Found recent release commit for version: $VERSION"
        fi
        
        # List recent tags
        log_info "Recent tags:"
        git tag --sort=-creatordate | head -10
        
        if [ -z "$VERSION" ]; then
            echo -n "Enter version to recover from: "
            read -r VERSION
        fi
    fi
    
    # Determine tag if not provided
    if [ -z "$TAG" ] && [ -n "$VERSION" ]; then
        # Check for various tag formats
        for tag_format in "v$VERSION" "v$VERSION-dev" "v$VERSION-staging" "v$VERSION-production"; do
            if git tag | grep -q "^$tag_format$"; then
                TAG="$tag_format"
                break
            fi
        done
        
        if [ -z "$TAG" ]; then
            echo -n "Enter tag to clean up (or press Enter to skip): "
            read -r TAG
        fi
    fi
    
    echo ""
    log_info "Recovery Configuration:"
    log_info "  Version: ${VERSION:-'Not specified'}"
    log_info "  Tag: ${TAG:-'Not specified'}"
    log_info "  Force Mode: $FORCE_MODE"
    log_info "  Dry Run: $DRY_RUN"
    echo ""
    
    if ! confirm "Proceed with recovery?"; then
        log_warning "Recovery cancelled by user"
        exit 0
    fi
    
    # Step 1: Check current repository state
    log_info "Checking repository state..."
    
    CURRENT_BRANCH=$(git branch --show-current)
    HAS_UNCOMMITTED=$(git status --porcelain)
    
    if [ -n "$HAS_UNCOMMITTED" ]; then
        log_warning "Uncommitted changes detected!"
        git status --short
        
        if confirm "Stash uncommitted changes?"; then
            run_command "git stash push -m 'Release recovery stash'" "Stashing changes"
        else
            log_error "Cannot proceed with uncommitted changes"
            exit 1
        fi
    fi
    
    # Step 2: Clean up release commit
    if [ -n "$VERSION" ]; then
        log_info "Looking for release commit..."
        
        RELEASE_COMMIT=$(git log --oneline --grep="chore(release): $VERSION" -n 1 --format="%H" || true)
        
        if [ -n "$RELEASE_COMMIT" ]; then
            log_info "Found release commit: $RELEASE_COMMIT"
            
            # Check if commit was pushed
            if git branch -r --contains "$RELEASE_COMMIT" | grep -q "origin/"; then
                log_warning "Release commit was pushed to remote"
                
                if confirm "Create revert commit?"; then
                    run_command "git revert --no-edit $RELEASE_COMMIT" "Reverting release commit"
                fi
            else
                log_info "Release commit not pushed to remote"
                
                if confirm "Remove release commit locally?"; then
                    run_command "git reset --hard HEAD~1" "Removing release commit"
                fi
            fi
        else
            log_info "No release commit found for version $VERSION"
        fi
    fi
    
    # Step 3: Clean up tags
    if [ -n "$TAG" ]; then
        log_info "Cleaning up tag: $TAG"
        
        # Check if tag exists locally
        if git tag | grep -q "^$TAG$"; then
            log_info "Found local tag: $TAG"
            
            # Check if tag was pushed
            if git ls-remote --tags origin | grep -q "refs/tags/$TAG$"; then
                log_warning "Tag exists on remote"
                
                if confirm "Delete remote tag?"; then
                    run_command "git push origin :refs/tags/$TAG" "Deleting remote tag"
                fi
            fi
            
            if confirm "Delete local tag?"; then
                run_command "git tag -d $TAG" "Deleting local tag"
            fi
        else
            log_info "Tag $TAG not found locally"
        fi
    fi
    
    # Step 4: Check for GitHub release
    if [ -n "$TAG" ] && command -v gh &> /dev/null; then
        log_info "Checking for GitHub release..."
        
        if gh release view "$TAG" &> /dev/null; then
            log_warning "GitHub release exists for tag $TAG"
            
            if confirm "Delete GitHub release?"; then
                run_command "gh release delete $TAG --yes" "Deleting GitHub release"
            fi
        else
            log_info "No GitHub release found for tag $TAG"
        fi
    fi
    
    # Step 5: Clean up version in package.json
    if [ -n "$VERSION" ] && [ -f "package.json" ]; then
        CURRENT_PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || true)
        
        if [ "$CURRENT_PACKAGE_VERSION" = "$VERSION" ]; then
            log_warning "package.json still has version $VERSION"
            
            # Get previous version from git history
            PREVIOUS_VERSION=$(git show HEAD:package.json 2>/dev/null | grep '"version"' | sed -n 's/.*"version": "\([^"]*\)".*/\1/p' || true)
            
            if [ -n "$PREVIOUS_VERSION" ] && [ "$PREVIOUS_VERSION" != "$VERSION" ]; then
                if confirm "Revert package.json version to $PREVIOUS_VERSION?"; then
                    run_command "npm version $PREVIOUS_VERSION --no-git-tag-version" "Reverting package.json version"
                fi
            fi
        fi
    fi
    
    # Step 6: Verify final state
    echo ""
    log_info "Final repository state:"
    
    echo "Branch: $(git branch --show-current)"
    echo "Latest commit: $(git log --oneline -1)"
    echo "Package version: $(node -p "require('./package.json').version" 2>/dev/null || echo "N/A")"
    echo "Git status:"
    git status --short
    
    # Step 7: Provide next steps
    echo ""
    log_success "Recovery process completed!"
    echo ""
    log_info "Next steps:"
    echo "  1. Review the repository state above"
    echo "  2. If you stashed changes, run: git stash pop"
    echo "  3. Push any revert commits if needed"
    echo "  4. Re-run the release workflow when ready"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "This was a dry run. No changes were made."
    fi
}

# Run main function
main "$@"