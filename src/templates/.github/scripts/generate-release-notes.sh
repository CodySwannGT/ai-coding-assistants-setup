#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Generate Release Notes Script
# -----------------------------------------------------------------------------
# This script generates release notes from a template and repository data
#
# Usage: ./generate-release-notes.sh --template <template-file> --version <version> --output <output-file>

set -euo pipefail

# Default values
TEMPLATE_FILE=""
VERSION=""
OUTPUT_FILE="release-notes.md"
PREVIOUS_VERSION=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --template)
      TEMPLATE_FILE="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --previous-version)
      PREVIOUS_VERSION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 --template <template-file> --version <version> [--output <output-file>] [--previous-version <version>]"
      echo ""
      echo "Options:"
      echo "  --template          Path to the release notes template file"
      echo "  --version          The version being released"
      echo "  --output           Output file path (default: release-notes.md)"
      echo "  --previous-version Previous version for comparison"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$TEMPLATE_FILE" ] || [ -z "$VERSION" ]; then
  echo "Error: --template and --version are required"
  exit 1
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Error: Template file not found: $TEMPLATE_FILE"
  exit 1
fi

# Determine previous version if not provided
if [ -z "$PREVIOUS_VERSION" ]; then
  PREVIOUS_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0")
fi

# Function to get commit count between versions
get_commit_count() {
  local from_version=$1
  local to_version=$2
  
  if [ "$from_version" == "0.0.0" ]; then
    git rev-list --count HEAD
  else
    git rev-list --count "${from_version}..${to_version}" 2>/dev/null || echo "0"
  fi
}

# Function to get file change statistics
get_file_stats() {
  local from_version=$1
  local to_version=$2
  
  if [ "$from_version" == "0.0.0" ]; then
    git diff --name-only --diff-filter=ACMRT $(git rev-list --max-parents=0 HEAD) HEAD | wc -l
  else
    git diff --name-only --diff-filter=ACMRT "${from_version}" "${to_version}" 2>/dev/null | wc -l || echo "0"
  fi
}

# Function to get additions and deletions
get_change_stats() {
  local from_version=$1
  local to_version=$2
  local stat_type=$3
  
  local stats
  if [ "$from_version" == "0.0.0" ]; then
    stats=$(git diff --shortstat $(git rev-list --max-parents=0 HEAD) HEAD)
  else
    stats=$(git diff --shortstat "${from_version}" "${to_version}" 2>/dev/null || echo "")
  fi
  
  if [ "$stat_type" == "additions" ]; then
    echo "$stats" | grep -oE '[0-9]+ insertions?' | grep -oE '[0-9]+' || echo "0"
  else
    echo "$stats" | grep -oE '[0-9]+ deletions?' | grep -oE '[0-9]+' || echo "0"
  fi
}

# Function to get contributors
get_contributors() {
  local from_version=$1
  local to_version=$2
  
  if [ "$from_version" == "0.0.0" ]; then
    git log --format='@%an' | sort -u | sed 's/^/- /' | tr '\n' '\n'
  else
    git log "${from_version}..${to_version}" --format='@%an' 2>/dev/null | sort -u | sed 's/^/- /' | tr '\n' '\n' || echo "- Unknown"
  fi
}

# Function to extract highlights from changelog
get_highlights() {
  local version=$1
  local changelog_file="CHANGELOG.md"
  
  if [ -f "$changelog_file" ]; then
    # Extract the section for this version
    awk -v version="$version" '
      /^#+ \['"$version"'\]/ { found=1; next }
      /^#+ \[/ && found { exit }
      found && /^###? Features/ { features=1; next }
      found && features && /^###?/ { features=0 }
      found && features && /^[-*]/ { print }
    ' "$changelog_file" | head -5
  else
    echo "- Release $version"
  fi
}

# Function to get all changes
get_changes() {
  local version=$1
  local changelog_file="CHANGELOG.md"
  
  if [ -f "$changelog_file" ]; then
    # Extract the entire section for this version
    awk -v version="$version" '
      /^#+ \['"$version"'\]/ { found=1; next }
      /^#+ \[/ && found { exit }
      found { print }
    ' "$changelog_file"
  else
    echo "See git log for detailed changes"
  fi
}

# Function to get package name
get_package_name() {
  if [ -f "package.json" ]; then
    node -p "require('./package.json').name" 2>/dev/null || echo "package"
  else
    echo "package"
  fi
}

# Generate release notes data
echo "Generating release notes for version $VERSION..."

# Determine the tag name (it might have environment suffix)
TAG_NAME="v${VERSION}"
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  TO_REF="$TAG_NAME"
else
  # Try with environment suffixes
  for env in dev staging production; do
    if git rev-parse "v${VERSION}-${env}" >/dev/null 2>&1; then
      TO_REF="v${VERSION}-${env}"
      break
    fi
  done
  # If still not found, use HEAD
  TO_REF=${TO_REF:-HEAD}
fi

# Collect all the data
COMMIT_COUNT=$(get_commit_count "$PREVIOUS_VERSION" "$TO_REF")
FILES_CHANGED=$(get_file_stats "$PREVIOUS_VERSION" "$TO_REF")
ADDITIONS=$(get_change_stats "$PREVIOUS_VERSION" "$TO_REF" "additions")
DELETIONS=$(get_change_stats "$PREVIOUS_VERSION" "$TO_REF" "deletions")
CONTRIBUTORS=$(get_contributors "$PREVIOUS_VERSION" "$TO_REF")
HIGHLIGHTS=$(get_highlights "$VERSION")
CHANGES=$(get_changes "$VERSION")
PACKAGE_NAME=$(get_package_name)
REPO_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
CHANGELOG_URL="${REPO_URL}/blob/${TO_REF}/CHANGELOG.md"
COMPARE_URL="${REPO_URL}/compare/${PREVIOUS_VERSION}...${TO_REF}"

# Create a working copy of the template
cp "$TEMPLATE_FILE" "$OUTPUT_FILE.tmp"

# Replace all placeholders
sed -i.bak "s|{{ version }}|${VERSION}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ date }}|$(date +"%B %d, %Y")|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ commit_count }}|${COMMIT_COUNT}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ files_changed }}|${FILES_CHANGED}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ additions }}|${ADDITIONS}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ deletions }}|${DELETIONS}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ package_name }}|${PACKAGE_NAME}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ changelog_url }}|${CHANGELOG_URL}|g" "$OUTPUT_FILE.tmp"
sed -i.bak "s|{{ compare_url }}|${COMPARE_URL}|g" "$OUTPUT_FILE.tmp"

# Handle multiline replacements using temporary files
echo "$HIGHLIGHTS" > highlights.tmp
echo "$CHANGES" > changes.tmp
echo "$CONTRIBUTORS" > contributors.tmp

# Use awk for multiline replacements
awk '/{{ highlights }}/ {
  while ((getline line < "highlights.tmp") > 0)
    print line
  close("highlights.tmp")
  next
} 1' "$OUTPUT_FILE.tmp" > "$OUTPUT_FILE.tmp2" && mv "$OUTPUT_FILE.tmp2" "$OUTPUT_FILE.tmp"

awk '/{{ changes }}/ {
  while ((getline line < "changes.tmp") > 0)
    print line
  close("changes.tmp")
  next
} 1' "$OUTPUT_FILE.tmp" > "$OUTPUT_FILE.tmp2" && mv "$OUTPUT_FILE.tmp2" "$OUTPUT_FILE.tmp"

awk '/{{ contributors }}/ {
  while ((getline line < "contributors.tmp") > 0)
    print line
  close("contributors.tmp")
  next
} 1' "$OUTPUT_FILE.tmp" > "$OUTPUT_FILE.tmp2" && mv "$OUTPUT_FILE.tmp2" "$OUTPUT_FILE.tmp"

# Clean up
rm -f highlights.tmp changes.tmp contributors.tmp "$OUTPUT_FILE.tmp.bak"
mv "$OUTPUT_FILE.tmp" "$OUTPUT_FILE"

echo "✅ Release notes generated successfully: $OUTPUT_FILE"