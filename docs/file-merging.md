# File Merging Documentation

The AI Coding Assistants Setup provides powerful file merging capabilities, especially for configuration files. This document explains how to use the file merging functionality.

## Overview

The tool includes two primary file merging utilities:

1. **FileMerger**: Basic file merger for handling generic files
2. **ConfigMerger**: Advanced merger for intelligent handling of configuration files (JSON, YAML, INI, etc.)

## Supported File Types

The ConfigMerger can intelligently merge the following file types:

- **JSON** (.json files and other JSON-formatted config files)
- **YAML** (.yml, .yaml files)
- **INI** (.ini, .conf files)
- **ENV** (.env files)
- Other files are handled using the basic FileMerger

## Using the Merge-Configs Command

The tool provides a dedicated command for merging configuration files:

```bash
ai-coding-assistants-setup merge-configs [options]
```

### Options

- `-s, --source-dir <path>`: Source directory for template files (default: ./src/templates)
- `-t, --target-dir <path>`: Target directory for merging files (default: current working directory)
- `-n, --non-interactive`: Run in non-interactive mode (default: false)
- `-f, --force`: Force overwrite of existing files (default: false)
- `-v, --verbose`: Enable verbose output (default: false)

### Interactive Mode

In interactive mode (default), the tool will prompt you for what to do when a conflict is detected:

- **Use source file values (s)**: Replaces the target file with the source file
- **Keep target file values (t)**: Keeps the existing target file
- **Merge both files (m)**: Intelligently merges both files (default)
- **Open in editor (e)**: Opens the file in an editor for manual resolution (coming soon)

## Conflict Resolution Strategies

The ConfigMerger supports several strategies for resolving conflicts:

1. **USE_SOURCE**: Overwrites the target file with the source file
2. **USE_TARGET**: Keeps the existing target file unchanged
3. **MERGE**: Performs a deep merge of both files (default)
4. **MANUAL**: Will open in an editor for manual resolution (coming soon)

## Deep Merge Behavior

The deep merge strategy follows these rules:

- Merges objects recursively
- Concatenates arrays, removing duplicates
- Uses source values for scalar conflicts
- Preserves structure of both files where possible

## Using in Your Own Code

If you want to use the ConfigMerger in your own code:

```typescript
import { ConfigMerger, ConflictStrategy } from 'ai-coding-assistants-setup';

// Create a map of source to target files
const filesToMerge = new Map<string, string>();
filesToMerge.set('/path/to/source/config.json', '/path/to/target/config.json');

// Set merge options
const options = {
  interactive: true,
  defaultStrategy: ConflictStrategy.MERGE,
  verbose: true
};

// Merge the files
const mergedCount = await ConfigMerger.mergeConfigFiles(filesToMerge, options);
```

## Examples

### Basic Usage

```bash
# Merge configuration files from templates to current directory
ai-coding-assistants-setup merge-configs
```

### Merge from Custom Directory

```bash
# Merge configuration files from a custom templates directory
ai-coding-assistants-setup merge-configs --source-dir ./my-templates
```

### Non-Interactive Mode

```bash
# Merge files without prompting (uses default merge strategy)
ai-coding-assistants-setup merge-configs --non-interactive
```

### Force Overwrite

```bash
# Overwrite existing files without prompting
ai-coding-assistants-setup merge-configs --force --non-interactive
```

## Troubleshooting

If you encounter issues with file merging:

1. Try running with the `--verbose` flag to see more detailed information
2. Check file permissions on source and target directories
3. For configuration files with complex structures, manual editing may be required
4. If a file fails to merge, try using the basic setup command for that tool

## Future Enhancements

- Support for more configuration file types (XML, TOML, etc.)
- Enhanced conflict detection and resolution
- Visual diff and merge tool integration
- Custom merge strategies for specific file types