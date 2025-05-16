#!/bin/bash

# Cleanup script for removing old JavaScript files

# Change to repository root
cd "$(dirname "$0")/.." || exit 1

echo "🧹 Cleaning up old JavaScript files..."

# Delete files listed in TODELETE.md
# JavaScript Source Files section only

# Check if TODELETE.md exists
if [ ! -f "TODELETE.md" ]; then
  echo "❌ TODELETE.md not found. Aborting."
  exit 1
fi

# Extract file paths from TODELETE.md JavaScript Source Files section
FILES_TO_DELETE=$(sed -n '/^## JavaScript Source Files$/,/^```$/!d;/^```$/q;/^```$/d;/^src\//p' TODELETE.md)

# Check if we have files to delete
if [ -z "$FILES_TO_DELETE" ]; then
  echo "❌ No files found to delete. Check TODELETE.md format."
  exit 1
fi

# Count the files
FILE_COUNT=$(echo "$FILES_TO_DELETE" | wc -l)
echo "🔍 Found $FILE_COUNT files to delete"

# Ask for confirmation
echo "⚠️  WARNING: This will delete the old JavaScript files listed in TODELETE.md"
read -p "🤔 Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Operation cancelled."
  exit 1
fi

# Delete the files
DELETED=0
for file in $FILES_TO_DELETE; do
  if [ -f "$file" ]; then
    rm "$file"
    if [ $? -eq 0 ]; then
      DELETED=$((DELETED + 1))
      echo "✅ Deleted: $file"
    else
      echo "❌ Failed to delete: $file"
    fi
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Cleanup complete! Deleted $DELETED files."

# Check if there are any empty directories to clean up
echo "🧹 Cleaning up empty directories..."
find src -type d -empty -delete 2>/dev/null

echo "✨ All done! The project has been cleaned up."