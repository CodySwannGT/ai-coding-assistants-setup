# Project Context and Configuration

## Project Overview
@README.md

## Complete Documentation
@docs/

IMPORTANT: Prefer small files and functions to reduce token and context usage.

## Project Standards
Prefer immutable data structures, functional programming patterns, and TypeScript for type safety.
Follow best practices for clean, modular and maintainable code while also keeping the solutions simple and efficient.

See @package.json for dependencies, scripts and package manager.


Follow lint rules found in one of the following files:
- @eslint.config.js (flat config - new format)
- @.eslintrc.js
- @.eslintrc.cjs
- @.eslintrc.yaml
- @.eslintrc.yml
- @.eslintrc.json
- @.eslintrc
- @package.json (eslintConfig field)

Follow formatting rules found in one of the following files:
- @prettier.config.js
- @.prettierrc.js
- @.prettierrc.cjs
- @.prettierrc.yaml
- @.prettierrc.yml
- @.prettierrc.json
- @.prettierrc
- @package.json (prettier field)

Follow TypeScript rules found in one of the following files:
- @tsconfig.json
- @tsconfig.cjs.json
- @tsconfig.mjs.json

Follow commit message conventions found in:
- @.commitlintrc.js
- @.commitlintrc.cjs
- @.commitlintrc.yaml
- @.commitlintrc.yml
- @.commitlintrc.json
- @.commitlintrc
- @package.json (commitlint field)
- @commitlint.config.js

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

When working on tasks:

1. Identify the appropriate mode from .roomodes based on the task
2. Apply both:
   - Global rules from @.roo/rules/
   - Mode-specific rules from @.roo/rules-{mode}/
3. Store mode-specific memories appropriately tagged in the knowledge graph
4. Adapt my capabilities and behavior according to the mode's definition

## Synchronization with RooCode Memory

RooCode is also configured to use the same knowledge graph at `.ai/memory.jsonl`. I should:

1. Maintain consistency with RooCode's memory usage
2. Follow the memory structure defined in .roo/rules/01-ai-coding-assistants-setup-memory.md
3. Use the same entity naming conventions
4. Recognize and utilize memories created by RooCode
5. Create memories that RooCode can access using the defined structure

## Working Instructions

When assisting with this project:

1. First understand the project context from README.md and docs/
2. Identify which RooCode mode is appropriate for the current task
3. Apply both global and mode-specific rules
4. Leverage the dual memory system to provide contextual assistance
5. Continuously update both memory systems with new information
6. Follow the role definition and constraints of the selected mode
7. Always maintain context across conversations through memory synchronization