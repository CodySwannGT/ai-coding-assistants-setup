# Claude Git Diff Explain

The `diff-explain` command provides AI-enhanced git diff output with natural language explanations, context for changes, and potential issue identification. This feature helps developers understand code changes more easily and identify potential problems before they're committed.

## Features

- **Natural Language Explanations**: Get plain English explanations of what changed and why
- **Issue Detection**: Identify potential bugs, security issues, and code quality problems
- **Improvement Suggestions**: Receive suggestions for better alternatives or improvements
- **Context Awareness**: Understand the broader impact of changes across the codebase
- **Customizable Focus**: Choose specific aspects to focus on (functionality, security, performance, readability)
- **Flexible Output Formats**: View explanations inline with diff, as summaries, or side-by-side

## Usage

### Command Line

To use the diff-explain feature from the command line:

```bash
# Explain staged changes (default)
npx ai-coding-assistants-setup --diff-explain

# Explain specific commit
npx ai-coding-assistants-setup --diff-explain-commit <commit-hash>

# Explain branch differences
npx ai-coding-assistants-setup --diff-explain-branch <branch-name>
```

### Direct Command

For more control, you can use the direct command:

```bash
npx ai-coding-assistants-setup diff-explain [options]
```

#### Available Options

```
Options:
  -V, --version               output the version number
  -c, --commit <hash>         specific commit to explain
  -b, --branch <name>         branch to diff against current
  -f, --files <files...>      specific files to include in diff
  -s, --staged                explain staged changes (default: false)
  --since <ref>               show changes since this reference (e.g., HEAD~3)
  --until <ref>               show changes until this reference
  -o, --output-format <fmt>   output format: inline, side-by-side, summary-only (default: "inline")
  -v, --verbosity <level>     verbosity level: brief, detailed (default: "detailed")
  --focus <areas...>          focus areas: functionality, security, performance, readability
  --no-highlight-issues       do not highlight potential issues
  --no-suggestions            do not include suggestions for improvements
  --no-summary                do not include a summary of changes
  --max-tokens <tokens>       maximum tokens for Claude response (default: "4000")
  -h, --help                  display help for command
```

## Configuration

You can create a persistent configuration file at `.claude/diff-explain-config.json` in your project root:

```json
{
  "verbosity": "detailed",
  "focusAreas": ["functionality", "security", "performance", "readability"],
  "maxTokens": 4000,
  "maxDiffSize": 100000,
  "model": "claude-3-opus-20240229",
  "temperature": 0.7,
  "outputFormat": "inline",
  "highlightIssues": true,
  "includeSuggestions": true,
  "includeSummary": true,
  "preferCli": true
}
```

## Examples

### Basic Usage

Explain staged changes with default settings:

```bash
node index.js --diff-explain
```

### Specific Commit

Explain the changes in a specific commit:

```bash
node index.js --diff-explain-commit abc1234
```

### Branch Comparison

Explain the differences between the current branch and another branch:

```bash
node index.js --diff-explain-branch main
```

### Custom Focus

Focus the explanation on specific aspects:

```bash
npx ai-coding-assistants-setup diff-explain --staged --focus functionality security
```

### Brief Summary

Get a concise explanation of changes:

```bash
npx ai-coding-assistants-setup diff-explain --staged --verbosity brief --output-format summary-only
```

## How It Works

1. The command captures git diff output based on your specified options
2. It processes the diff to extract file changes, statistics, and structure
3. A structured prompt is sent to Claude AI with the diff and your preferences
4. Claude analyzes the diff and generates explanations, identifies issues, and suggests improvements
5. The response is formatted according to your output preferences
6. Colorized output is displayed in the terminal for easy reading

## Requirements

- Git must be installed and accessible from the command line
- Claude CLI is required
- Node.js v14+ is recommended

## Privacy Considerations

The diff-explain command sends git diff output to Claude. This may include code from your project. Please ensure you're comfortable sharing this code with Anthropic's servers before using this feature.

## Advanced Usage

### Comparing Specific Files

Only include specific files in the explanation:

```bash
npx ai-coding-assistants-setup diff-explain --staged --files src/main.js src/utils.js
```

### Changes Over Time

Explain changes since a specific point in history:

```bash
npx ai-coding-assistants-setup diff-explain --since HEAD~5
```

### Custom Output

Get a summary-only explanation without issue highlighting:

```bash
npx ai-coding-assistants-setup diff-explain --staged --output-format summary-only --no-highlight-issues
```

## Troubleshooting

- **Error: Diff too large**: Reduce the size of the diff by specifying files or a more recent starting point
- **Error: Claude CLI not found**: Install Claude CLI using `npm install -g @anthropic-ai/claude-cli`
- **No output or empty explanation**: Ensure there are actual changes to explain (run `git diff` to verify)
- **Unexpected output format**: Check your configuration file and command line options for conflicts