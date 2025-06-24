# Project Context and Configuration

## Project Overview

@README.md

## Complete Documentation

@docs/

## Memory System Integration

I'm configured to use a dual memory system - both this CLAUDE.md file and a knowledge graph stored at `.ai/memory.jsonl`. This enables persistent memory across conversations and tools.

### Memory System Guidelines

1. **Initialization Process**

   - At the start of each conversation, silently use `read_graph` to load existing memories
   - Cross-reference information from both this file and the knowledge graph
   - Build a complete mental model combining both sources

2. **Memory Collection Strategy**

   - While conversing, identify important information to preserve:
     - Project architecture and patterns
     - Coding standards and conventions
     - User preferences and working style
     - Problem-solving approaches and solutions
     - Decision rationales and technical context

3. **Memory Storage Protocol**

   - For important information:
     - Update this CLAUDE.md file when using `/memory` commands
     - Simultaneously update the knowledge graph using its MCP tools
     - Structure information properly in both systems

4. **Memory Graph Structure**

   - **Entities**: Create for major components, people, or concepts
     - Main entity types: Project, Component, User, Mode
     - Be specific and consistent in naming
   - **Observations**: Add detailed information to entities
     - Use clear, concise language
     - Include contextual details
   - **Relations**: Connect related entities
     - Always use active voice
     - Create meaningful relationship descriptions

5. **Memory Sync Verification**
   - Periodically check that both memory systems are synchronized
   - Resolve any conflicts by prioritizing the most recent information
   - Maintain consistency between both memory representations

## RooCode Integration

### Modes Configuration

The project uses the following custom modes defined in:

@.roomodes

### Global Rules

These global rules apply across all modes:

@.roo/rules/

### Mode-Specific Context

When working on tasks, I should:

1. Identify the appropriate mode from .roomodes based on the task
2. Apply both:
   - Global rules from .roo/rules/
   - Mode-specific rules from .roo/rules-{mode}/
3. Store mode-specific memories appropriately tagged in the knowledge graph
4. Adapt my capabilities and behavior according to the mode's definition

## Synchronization with RooCode Memory

RooCode is also configured to use the same knowledge graph at `.ai/memory.jsonl`. I should:

1. Maintain consistency with RooCode's memory usage
2. Follow the memory structure defined in .roo/rules/01-ai-coding-assistants-setup-memory.md
3. Use the same entity naming conventions
4. Recognize and utilize memories created by RooCode
5. Create memories that RooCode can access using the defined structure

## Git Commit and PR Requirements

**IMPORTANT**: This project enforces AI-only commits and PRs through git hooks.

### When creating commits:

- Always include the Claude signature in your commit messages
- The commit MUST contain: `Co-Authored-By: Claude <noreply@anthropic.com>`
- This is automatically added when using `/git-commit` command

### When creating Pull Requests:

- Always include the AI signature in the PR body
- The PR body MUST contain: `🤖 Generated with [Claude Code](https://claude.ai/code)`
- Include this signature at the end of your PR description
- The pre-push hook will block pushes if the PR doesn't have AI signatures

### Example PR body format:

```
## Summary
- Brief description of changes

## Changes
- List of specific changes made

## Test plan
- How to test these changes

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Working Instructions

When assisting with this project:

1. First understand the project context from README.md and docs/
2. Identify which RooCode mode is appropriate for the current task
3. Apply both global and mode-specific rules
4. Leverage the dual memory system to provide contextual assistance
5. Continuously update both memory systems with new information
6. Follow the role definition and constraints of the selected mode
7. Always maintain context across conversations through memory synchronization
8. Always use AI signatures in commits and PRs as required by git hooks
