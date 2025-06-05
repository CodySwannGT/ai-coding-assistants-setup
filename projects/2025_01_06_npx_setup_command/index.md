# NPX Setup Command Project

**Project Name**: ai-coding-assistants-setup NPX Command  
**Created**: January 6, 2025  
**Description**: Create an npx-callable package that sets up AI coding assistant configurations in any project by copying templates and updating package.json scripts.

## Project Rules and Conventions

- Keep the implementation simple and focused on file operations
- Use minimal dependencies for fast npx execution
- Support Node.js 18+ (LTS version)
- Handle user interactions gracefully with clear prompts
- Preserve existing user configurations when possible
- No complex testing needed - this is a straightforward file copying utility
- Update the existing README.md to include the npx command as the primary setup method

## Project Phases

- [ ] [Phase 1: Project Setup & CLI Structure](phase-1.md) - Initialize npx command and basic structure
- [ ] [Phase 2: Template Copying Implementation](phase-2.md) - Core file copying logic with conflict handling
- [ ] [Phase 3: Package.json Script Management](phase-3.md) - Add missing scripts without overwriting
- [ ] [Phase 4: Documentation Generation](phase-4.md) - Sync README and parse template configurations
- [ ] [Phase 5: Testing & Publishing](phase-5.md) - Manual testing and npm publishing

## Quick Start

```bash
# After implementation
npx ai-coding-assistants-setup

# For development
npm link
ai-coding-assistants-setup
```

## Success Criteria

- Can be run with `npx ai-coding-assistants-setup`
- Copies all templates while preserving directory structure
- Handles file conflicts with user prompts
- Updates package.json scripts without breaking existing ones
- Generates comprehensive documentation from templates
- Works across npm, yarn, and bun projects