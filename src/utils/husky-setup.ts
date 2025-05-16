/* eslint-disable no-useless-escape */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Feedback } from './feedback';
import { PackageManager, ProjectDetector } from './project-detector';

export class HuskySetup {
  private projectRoot: string;
  private projectDetector: ProjectDetector;
  // Feedback is used statically

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectDetector = new ProjectDetector(this.projectRoot);
    // Note: Feedback is not needed as an instance since all methods are static
  }

  /**
   * Check if husky is already installed
   */
  isHuskyInstalled(): boolean {
    return this.projectDetector.detectFeaturesSync().hasHusky;
  }

  /**
   * Install husky if not already installed
   */
  async installHusky(): Promise<boolean> {
    if (this.isHuskyInstalled()) {
      Feedback.info('Husky is already installed');
      return true;
    }

    try {
      Feedback.info('Installing husky...');
      const packageManager = this.projectDetector.getPackageManagerSync();
      
      let command = '';
      switch (packageManager) {
        case PackageManager.NPM:
          command = 'npm install --save-dev husky';
          break;
        case PackageManager.YARN:
          command = 'yarn add --dev husky';
          break;
        case PackageManager.PNPM:
          command = 'pnpm add --save-dev husky';
          break;
        case PackageManager.BUN:
          command = 'bun add --dev husky';
          break;
        default:
          throw new Error(`Unsupported package manager: ${packageManager}`);
      }
      
      execSync(command, { cwd: this.projectRoot, stdio: 'inherit' });
      
      // Initialize husky
      execSync('npx husky init', { cwd: this.projectRoot, stdio: 'inherit' });
      
      Feedback.success('Husky installed successfully');
      return true;
    } catch (error) {
      Feedback.error(`Failed to install husky: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Create a husky hook
   */
  createHook(hookName: string, command: string): boolean {
    try {
      const hooksDir = path.join(this.projectRoot, '.husky');
      
      if (!fs.existsSync(hooksDir)) {
        Feedback.error('Husky hooks directory not found. Make sure husky is installed properly.');
        return false;
      }
      
      const hookPath = path.join(hooksDir, hookName);
      const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${command}
`;
      
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      Feedback.success(`Created ${hookName} hook`);
      return true;
    } catch (error) {
      Feedback.error(`Failed to create ${hookName} hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Setup common hooks for code quality
   */
  setupCodeQualityHooks(): boolean {
    try {
      // Create pre-commit hook for linting and type checking
      const features = this.projectDetector.detectFeaturesSync();
      const hasTypeScript = features.hasTypeScript;
      const hasEslint = features.hasEslint;
      
      const preCommitCommands = [];
      
      if (hasEslint) {
        preCommitCommands.push('npx lint-staged');
      }
      
      if (hasTypeScript) {
        preCommitCommands.push('npx tsc --noEmit');
      }
      
      if (preCommitCommands.length > 0) {
        this.createHook('pre-commit', preCommitCommands.join(' && '));
      } else {
        Feedback.warning('No linting or type checking tools detected for pre-commit hook');
      }
      
      // Create commit-msg hook for commit message validation
      this.createHook('commit-msg', 'npx --no -- commitlint --edit ${1}');
      
      // Create prepare-commit-msg hook for AI assistance if available
      // Check for Claude synchronously by looking for the package in package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      let hasClaude = false;
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          const allDependencies = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
          };
          
          hasClaude = '@anthropic-ai/claude-code' in allDependencies ||
                     'claude-cli' in allDependencies;
        } catch (error) {
          // Ignore errors reading package.json
        }
      }
      
      if (hasClaude) {
        this.createHook('prepare-commit-msg', 'npx claude review ${1}');
      }
      
      // Create pre-push hook for security scanning if Claude is available
      if (hasClaude) {
        this.setupSecurityScanHook();
      }
      
      // Setup post-commit memory hook for AI context
      this.setupMemoryHook();
      
      Feedback.success('Code quality hooks set up successfully');
      return true;
    } catch (error) {
      Feedback.error(`Failed to set up code quality hooks: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Setup security scan pre-push hook using Claude
   */
  setupSecurityScanHook(): boolean {
    try {
      const prePushScript = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Get list of files that are being pushed
FILES_CHANGED=$(git diff --name-only HEAD@{1} HEAD | grep -E '\\.(js|jsx|ts|tsx|py|rb|php|go|java|rs|c|cpp|h|hpp)$' || echo '')

if [ -z "$FILES_CHANGED" ]; then
  echo "No relevant files to scan"
  exit 0
fi

echo "🔒 Running Claude security scan on files being pushed..."

# Create security scan prompt
cat > /tmp/security_prompt.txt << 'EOF'
You are a cybersecurity expert specializing in code security. Analyze this code for security vulnerabilities including:

1. Injection vulnerabilities (SQL, command, etc.)
2. Insecure authentication or authorization
3. Sensitive data exposure or improper handling
4. Incorrect use of cryptography
5. Insecure configuration
6. Hard-coded credentials or secrets
7. Path traversal vulnerabilities
8. Insecure deserialization
9. Insufficient logging and monitoring
10. Cross-site scripting (XSS) or CSRF
11. Dependency vulnerabilities
12. Use of unsafe or deprecated functions

Focus only on legitimate security issues with HIGH confidence. For each issue found, provide:
- The specific location of the vulnerability
- The severity level (Critical, High, Medium, Low)
- A clear explanation of the vulnerability
- A recommended fix or mitigation strategy

If no security issues are found, confirm that the code appears secure and follows best practices.
EOF

HAS_ISSUES=0

for FILE in $FILES_CHANGED; do
  # Check if file exists and has content
  if [ -f "$FILE" ] && [ -s "$FILE" ]; then
    echo "Scanning $FILE for security issues..."
    
    # Run security scan on the file
    RESULTS=$(cat "$FILE" | claude explain "$(cat /tmp/security_prompt.txt)" || echo "Failed to scan $FILE")
    
    # Check if any issues were found (crude check for security-related terms)
    if echo "$RESULTS" | grep -E 'vulnerability|security issue|severity|insecure|risk|exploit' > /dev/null; then
      echo "⚠️ Potential security issues found in $FILE:"
      echo "$RESULTS"
      HAS_ISSUES=1
    else
      echo "✅ No security issues found in $FILE"
    fi
  fi
done

# Clean up
rm /tmp/security_prompt.txt

if [ $HAS_ISSUES -eq 1 ]; then
  echo ""
  echo "⚠️ Security issues were found in your code."
  echo "Please review the findings above and fix the issues before pushing."
  echo "To override this check, use: git push --no-verify"
  exit 1
fi

exit 0
`;

      // Create the pre-push hook
      return this.createHook('pre-push', prePushScript);
    } catch (error) {
      Feedback.error(`Failed to set up security scan hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Setup post-commit memory hook for storing commit information
   */
  setupMemoryHook(): boolean {
    try {
      const postCommitScript = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Get more detailed commit info
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_AUTHOR=$(git log -1 --pretty=%an)
COMMIT_DATE=$(git log -1 --pretty=%ad --date=format:'%Y-%m-%d %H:%M:%S')
COMMIT_HASH=$(git log -1 --pretty=%H)

# Try to determine the root directory and project name
# First attempt to use git if available
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  ROOT_DIR="$(git rev-parse --show-toplevel)"
  PROJECT_NAME=$(basename "$ROOT_DIR")
else
  # Fallback method if not in a git repository
  # Get the absolute path of the current directory
  CURRENT_DIR="$(pwd)"
  
  # Determine the parent directory (one level up)
  # This assumes the ai-coding-assistants-setup is installed as a dependency
  # in the parent project's node_modules
  ROOT_DIR="$(dirname "$CURRENT_DIR")"
  PROJECT_NAME=$(basename "$ROOT_DIR")
  
  echo "⚠️ Not in a git repository. Using parent directory as root: $ROOT_DIR"
fi

MEMORY_PATH="$ROOT_DIR/.ai/memory.jsonl"

# Simple commit type extraction using standard shell commands
COMMIT_TYPE="other"
for type in feat fix docs style refactor perf test build ci chore revert; do
  if [[ "$COMMIT_MSG" == "$type:"* || "$COMMIT_MSG" == "$type("* ]]; then
    COMMIT_TYPE="$type"
    break
  fi
done

echo "📥 Writing to memory: $COMMIT_MSG"
echo "📁 Memory file: $MEMORY_PATH"
echo "🏷️ Commit type detected: $COMMIT_TYPE"

# Make sure the .ai directory exists in the root of the parent project
mkdir -p "$ROOT_DIR/.ai"

# Make sure the directory exists (redundant but keeping for safety)
mkdir -p "$(dirname "$MEMORY_PATH")"

# Create JSON in the same format as MCP-created entities
OBSERVATION="{\\\"type\\\":\\\"entity\\\",\\\"name\\\":\\\"Commit:$COMMIT_HASH\\\",\\\"entityType\\\":\\\"Commit\\\",\\\"observations\\\":[\\\"[$COMMIT_TYPE] $COMMIT_MSG\\\",\\\"Author: $COMMIT_AUTHOR\\\",\\\"Date: $COMMIT_DATE\\\"]}"

# Also create a relation from the project to this commit
RELATION="{\\\"type\\\":\\\"relation\\\",\\\"from\\\":\\\"Project:$PROJECT_NAME\\\",\\\"to\\\":\\\"Commit:$COMMIT_HASH\\\",\\\"relationType\\\":\\\"HAS_COMMIT\\\"}"

# Use printf for better control over newlines
printf "%s\\n" "$OBSERVATION" >> "$MEMORY_PATH"
printf "%s\\n" "$RELATION" >> "$MEMORY_PATH"

echo "✅ Commit information stored in project memory"
`;

      // Create hidden directory for hook helpers if it doesn't exist
      const hooksDir = path.join(this.projectRoot, '.husky', '_');
      
      if (!fs.existsSync(hooksDir)) {
        fs.mkdirSync(hooksDir, { recursive: true });
      }
      
      // Create the post-commit hook
      Feedback.info('Setting up post-commit memory hook');
      return this.createHook('post-commit', postCommitScript);
    } catch (error) {
      Feedback.error(`Failed to set up memory hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Setup all husky hooks in one command
   */
  async setupAll(): Promise<boolean> {
    const isInstalled = await this.installHusky();
    if (!isInstalled) return false;
    
    // setupCodeQualityHooks returns boolean, not Promise<boolean>
    return this.setupCodeQualityHooks();
  }
}
/* eslint-enable no-useless-escape */