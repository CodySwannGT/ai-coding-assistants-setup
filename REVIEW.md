# AI Coding Tool – Recommendations for Enhancing VS Code & MCP Integration

## Overview

These recommendations are structured to guide an AI coder (Claude, Roo, etc.) to implement enhancements in the open source project [ai-coding-assistants-setup](https://github.com/CodySwannGT/ai-coding-assistants-setup). They focus on:

* Improving support for AI pair programming within VS Code
* Expanding and enhancing Model Context Protocol (MCP) support
* Strengthening contributor onboarding and open source friendliness

---

## 1. Add or Integrate More AI Tools

### ✅ Recommendation

Include awareness or support for the following coding assistants:

* **GitHub Copilot**: Add detection for existing Copilot installs and provide an option to disable/override it.

### 🔧 Implementation Details

* In VS Code settings config logic, detect or disable extensions (like `github.copilot`) if desired.
* Update README to mention differences between Claude, Roo, and Copilot-like tools.
* Consider including an FAQ section like: *“Should I use this with Copilot?”*

---

## 2. Add More Model Context Protocols (MCPs)

### ✅ Recommendation

Expand the list of MCPs available to Claude and Roo:

| MCP Name                                 | Purpose                                                           |
| ---------------------------------------- | ----------------------------------------------------------------- |
| **StackOverflow Search**                 | AI can query programming Q\&A                                     |
| **Command Shell**                        | AI can run safe read-only shell commands (e.g., `ls`, `npm test`) |
| **Database Query**                       | Query schemas or test DBs for SQL-aware projects                  |
| **Embedding Search (Weaviate / Chroma)** | Index and search large monorepos semantically                     |

### 🔧 Implementation Details

* Define new entries in `.mcp.json` with an MCP ID, description, and env var for secrets.
* Update `.env.example` to include required API keys or paths.
* Update CLI to offer these as optional add-ons during setup.

---

## 3. Improve Contributor Friendliness

### ✅ Recommendation

Improve the structure and documentation for new open source contributors.

#### a. Modularize the CLI Script

* Break `index.js` into smaller modules: `setupVSCode.js`, `setupClaude.js`, `setupRoo.js`, `setupMCPs.js`
* Each module exports a `run()` function
* Main file coordinates them and handles CLI params

#### b. Add Prerequisites to README

* Node >= 18
* Docker (for GitHub MCP)
* VS Code installed
* Anthropic/OpenAI keys

#### c. Enrich CONTRIBUTING.md

* Add "How to test your changes" with `npm test`
* Describe code organization after modularization

#### d. Add CI (GitHub Actions)

* Run lint and test on every PR
* Alert on broken configuration file generation

#### e. Improve Onboarding Clarity

* Add links to Claude and Roo VS Code extensions
* Include screenshots of configured workspace
* Add glossary: Claude, Roo, MCP, Playwright MCP, Context7, etc.

---

## 4. Add Basic Tests

### ✅ Recommendation

Include snapshot or functional tests for config generation:

* `test/config-generation.test.js`: Check `.rooignore`, `.claude/settings.json`, etc.
* Use Jest snapshot testing to verify correctness

### 🔧 Implementation Details

* Create `__tests__/` folder
* Add fixtures: example input project folder, expected output files
* Use `fs-extra` and `jest` to compare generated vs. expected output
* Mock `inquirer` prompts where necessary

---

## 5. Document MCP Servers Clearly

### ✅ Recommendation

Create a section in the README with a **table of all supported MCPs**, describing their purpose and requirements.

Example:

| MCP      | Purpose                    | Requires              |
| -------- | -------------------------- | --------------------- |
| GitHub   | Repo context, issue lookup | Docker, GitHub PAT    |
| Context7 | Semantic code search       | Context7 API Key      |
| Memory   | Long-term memory           | None – uses file path |

---

## 6. Automate Claude Hooks for Commits

### ✅ Recommendation

Add support for commit-time Claude CLI automation using Husky or lint-staged:

* Detect if `package.json` exists or initialize it with `npm init -y`
* Install `husky`, `lint-staged`, and `@anthropic-ai/claude-cli` (if available)
* Create pre-commit hook to run `claude review --staged`
* Block commits if Claude reports critical issues

### 🔧 Implementation Details

* During setup, add `husky install` and configure `.husky/pre-commit`
* Add `lint-staged` configuration in `package.json`:

```json
"lint-staged": {
  "*.js": ["claude review --staged"]
}
```

* Optional: allow user to customize Claude’s review mode (strict/blocking vs advisory)

### 🧠 Other AI CLI Hook Ideas

| Hook                 | Purpose                                  | Claude Command                               |
| -------------------- | ---------------------------------------- | -------------------------------------------- |
| `prepare-commit-msg` | Auto-generate commit messages from diffs | `claude summarize --staged --commit-message` |
| `commit-msg`         | Validate commit message structure        | `claude validate-commit-msg "$1"`            |
| `pre-push`           | Perform full audit before push           | `claude audit --full`                        |
| `post-merge`         | Summarize merged changes                 | `claude summarize --diff origin/main`        |
| `post-checkout`      | Load context for current branch          | `claude fetch-context --branch "$1"`         |
| `post-rewrite`       | Summarize rebase result                  | `claude explain-rebase --interactive`        |
| `pre-rebase`         | Predict rebase conflicts                 | `claude predict-rebase-issues`               |

---

## 7. Optional Development Best Practices (User-Selectable)

### 🟡 Optional: Enforce Branching Strategy

* Enforce rule: "Every new task must begin on a new branch"
* Detect work on `main` or `master` and warn user
* Claude can suggest a branch name (e.g., `feature/login-endpoint`) based on task description or context
* Offer this as an option during CLI setup or update prompts

### 🟡 Optional: Enforce Writing Tests Before or With Code

* Prompt the user if new files are added without matching test files
* Claude can suggest test cases using Playwright, Jest, or other relevant tools
* Offer this as an optional enforcement mechanism during setup or updates

---

## 8. Optional Features

### ✅ Future Enhancements

* **AI-enhanced Git Diff**: Add `claude diff-explain` CLI for annotated `git diff`
* **Auto-run Playwright tests** after AI-generated code
* **Claude/Roo commands to reformat project-wide settings**
* **AI onboarding script** to explain how to use tools after install

---

## Summary for AI Coder

You are being asked to:

* Support more AI assistants and clarify any conflicts
* Add MCPs that extend tool capability (search, test, shell, etc.)
* Refactor code into modules and improve docs for contributors
* Write tests to validate your own output
* Add commit hooks to use Claude for review and feedback
* Include support for annotated diffs via `claude diff-explain`
* Enforce branching strategy and test-first development practices
* Help other AI coders understand what tools they have access to and how to use them

The goal is to make this repo the gold standard for collaborative, team-wide AI coding environments in VS Code.

---

