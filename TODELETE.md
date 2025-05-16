# Files to Delete

The following files are from the previous version and should be removed as part of the project reset:

## JavaScript Source Files

```
src/commands/diff-explain.js
src/config/config-schema.json
src/config/diff-explain-schema.json
src/config/environment.js
src/config/index.js
src/config/mcp-config-schema.js
src/config/paths.js
src/hooks/base-hook.js
src/hooks/branch-strategy-hook.js
src/hooks/code-quality-hooks.js
src/hooks/commit-msg-hook.js
src/hooks/config-manager.js
src/hooks/diff-explain-hook.js
src/hooks/enhanced-base-hook.js
src/hooks/enhanced-commit-msg-hook.js
src/hooks/enhanced-hook-registry.js
src/hooks/enhanced-pre-commit-hook.js
src/hooks/enhanced-prepare-commit-msg-hook.js
src/hooks/enhanced-setup-wizard.js
src/hooks/hook-compatibility.js
src/hooks/hook-config.js
src/hooks/hook-discovery.js
src/hooks/hook-framework-design.md
src/hooks/hook-interfaces.js
src/hooks/hook-middleware.js
src/hooks/hook-registry.js
src/hooks/hook-runner.js
src/hooks/hook-utils.js
src/hooks/index-enhanced.js
src/hooks/index.js
src/hooks/post-commit-hook.js
src/hooks/post-merge-hook.js
src/hooks/pre-commit-hook.js
src/hooks/pre-push-hook.js
src/hooks/pre-rebase-hook.js
src/hooks/prepare-commit-msg-hook.js
src/hooks/setup-wizard.js
src/integrations/claude-cli.js
src/integrations/claude-config.js
src/integrations/diff-explain.js
src/integrations/git.js
src/integrations/index.js
src/integrations/mcp-config.js
src/integrations/roo-config.js
src/integrations/uninstall.js
src/integrations/vscode.js
src/utils/encryption.js
src/utils/file.js
src/utils/index.js
src/utils/logger.js
src/utils/project-detector.js
```

## Keep These Files

The following files should be kept or have already been replaced with TypeScript versions:

```
src/index.ts  # Keep and convert to TypeScript
src/utils/feedback.ts  # Already created in TypeScript
src/utils/file-merger.ts  # Already created in TypeScript
src/utils/index.ts  # Already created in TypeScript
```

## Other Files to Keep

```
.github/*  # GitHub configuration files
docs/*  # Documentation files
tests/*  # Test files (convert as needed)
```

## Root Files to Keep 

```
package.json
tsconfig.json
.eslintrc.json
.prettierrc
jest.config.ts
commitlint.config.js
README.md
CONTRIBUTING.md
LICENSE.md
RESET.md
```

## Note

The deletion should only be performed after all necessary files have been converted to TypeScript or recreated in the new structure.