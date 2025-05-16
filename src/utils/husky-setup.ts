import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ProjectDetector } from './project-detector';
import { Feedback } from './feedback';

export class HuskySetup {
  private projectRoot: string;
  private projectDetector: ProjectDetector;
  private feedback: Feedback;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectDetector = new ProjectDetector(this.projectRoot);
    this.feedback = new Feedback();
  }

  /**
   * Check if husky is already installed
   */
  isHuskyInstalled(): boolean {
    return this.projectDetector.hasHusky();
  }

  /**
   * Install husky if not already installed
   */
  async installHusky(): Promise<boolean> {
    if (this.isHuskyInstalled()) {
      this.feedback.info('Husky is already installed');
      return true;
    }

    try {
      this.feedback.info('Installing husky...');
      const packageManager = this.projectDetector.getPackageManager();
      
      let command = '';
      switch (packageManager) {
        case 'npm':
          command = 'npm install --save-dev husky';
          break;
        case 'yarn':
          command = 'yarn add --dev husky';
          break;
        case 'pnpm':
          command = 'pnpm add --save-dev husky';
          break;
        case 'bun':
          command = 'bun add --dev husky';
          break;
        default:
          throw new Error(`Unsupported package manager: ${packageManager}`);
      }
      
      execSync(command, { cwd: this.projectRoot, stdio: 'inherit' });
      
      // Initialize husky
      execSync('npx husky init', { cwd: this.projectRoot, stdio: 'inherit' });
      
      this.feedback.success('Husky installed successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to install husky: ${error instanceof Error ? error.message : String(error)}`);
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
        this.feedback.error(`Husky hooks directory not found. Make sure husky is installed properly.`);
        return false;
      }
      
      const hookPath = path.join(hooksDir, hookName);
      const hookContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${command}
`;
      
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      this.feedback.success(`Created ${hookName} hook`);
      return true;
    } catch (error) {
      this.feedback.error(`Failed to create ${hookName} hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Setup common hooks for code quality
   */
  setupCodeQualityHooks(): boolean {
    try {
      // Create pre-commit hook for linting and type checking
      const hasTypeScript = this.projectDetector.hasTypeScript();
      const hasEslint = this.projectDetector.hasEslint();
      
      let preCommitCommands = [];
      
      if (hasEslint) {
        preCommitCommands.push('npx lint-staged');
      }
      
      if (hasTypeScript) {
        preCommitCommands.push('npx tsc --noEmit');
      }
      
      if (preCommitCommands.length > 0) {
        this.createHook('pre-commit', preCommitCommands.join(' && '));
      } else {
        this.feedback.warning('No linting or type checking tools detected for pre-commit hook');
      }
      
      // Create commit-msg hook for commit message validation
      this.createHook('commit-msg', 'npx --no -- commitlint --edit ${1}');
      
      // Create prepare-commit-msg hook for AI assistance if available
      if (this.projectDetector.hasClaude()) {
        this.createHook('prepare-commit-msg', 'npx claude review ${1}');
      }
      
      // Create pre-push hook for security scanning if Claude is available
      if (this.projectDetector.hasClaude()) {
        this.setupSecurityScanHook();
      }
      
      this.feedback.success('Code quality hooks set up successfully');
      return true;
    } catch (error) {
      this.feedback.error(`Failed to set up code quality hooks: ${error instanceof Error ? error.message : String(error)}`);
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
      this.feedback.error(`Failed to set up security scan hook: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Setup all husky hooks in one command
   */
  async setupAll(): Promise<boolean> {
    const isInstalled = await this.installHusky();
    if (!isInstalled) return false;
    
    return this.setupCodeQualityHooks();
  }
}