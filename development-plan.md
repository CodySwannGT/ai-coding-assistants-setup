# Development Plan for ai-coding-assistants-setup

## Project Overview
Create an npx-callable package that sets up AI coding assistant configurations in any project by copying templates and updating package.json scripts.

## Phase 1: Project Setup & Core Structure (Day 1)
- [ ] Initialize the npx command structure
- [ ] Set up the CLI entry point (`bin/index.js` or similar)
- [ ] Configure package.json with proper bin field for npx
- [ ] Create basic project structure with src/ directory
- [ ] Set up TypeScript configuration if needed

## Phase 2: Template Copying Logic (Day 2-3)
- [ ] Implement recursive directory copying function
- [ ] Preserve directory structure during copy
- [ ] Add file conflict detection
- [ ] Implement user prompts for overwrite decisions
- [ ] Handle skip/overwrite logic with appropriate user feedback
- [ ] Track and report skipped files with template locations

## Phase 3: Package.json Script Management (Day 4)
- [ ] Detect and read existing package.json
- [ ] Parse scripts section safely
- [ ] Add missing scripts with no-op implementations:
  - `lint`: `echo "lint not configured yet"`
  - `typecheck`: `echo "typecheck not configured yet"`
  - `format:check`: `echo "format:check not configured yet"`
  - `build`: `echo "build not configured yet"`
  - `test`: `echo "test not configured yet"`
  - `test:unit`: `echo "test:unit not configured yet"`
  - `test:integration`: `echo "test:integration not configured yet"`
  - `test:e2e`: `echo "test:e2e not configured yet"`
- [ ] Preserve existing scripts (don't overwrite)
- [ ] Write updated package.json with proper formatting

## Phase 4: Documentation Generation (Day 5)
- [ ] Parse template files to extract:
  - Environment variables from .env.example files
  - GitHub secrets from workflow files
  - MCP configurations from .mcp.json
  - GitHub Actions from .github/workflows/
- [ ] Generate templates/docs/README.md with:
  - Environment variables table
  - Commands reference
  - Secrets documentation
  - MCP server descriptions
  - GitHub Actions usage guide
- [ ] Include examples for workflow calls

## Phase 5: Testing & Polish (Day 6)
- [ ] Add error handling for edge cases
- [ ] Test on different project types (npm, yarn, bun)
- [ ] Test with various file conflict scenarios
- [ ] Add progress indicators for better UX
- [ ] Add --dry-run option to preview changes
- [ ] Create usage documentation
- [ ] Test npx command locally

## Phase 6: Publishing & Documentation (Day 7)
- [ ] Finalize package.json metadata
- [ ] Write main README.md with usage instructions
- [ ] Add examples of before/after setup
- [ ] Test npx command from npm registry
- [ ] Create release notes
- [ ] Publish to npm

## Technical Considerations
- Use Node.js built-in `fs` and `path` modules for file operations
- Use `inquirer` or `prompts` for user interactions
- Use `chalk` for colored terminal output
- Keep dependencies minimal for fast npx execution
- Support Node.js 18+ (LTS version)

## Success Criteria
- [ ] Can be run with `npx ai-coding-assistants-setup`
- [ ] Successfully copies all templates while preserving structure
- [ ] Handles file conflicts gracefully with user choice
- [ ] Updates package.json scripts without breaking existing ones
- [ ] Generates comprehensive documentation
- [ ] Works across npm, yarn, and bun projects