# PRD Instructions

Using $ARGUMENTS as the base for the project, follow these steps to create a new project plan:

- Check to see if you're on a fresh branch (i.e. there are no commits to the branch yet). If not, create a new branch with the name `feature/<PROJECT_NAME>`, where `<PROJECT_NAME>` is a descriptive name for the project.
- Create a new directory in `projects/` called `YYYY_MM_DD_<PROJECT_NAME>` with today's date and a descriptive name for `PROJECT_NAME`.

## IMPORTANT:

- Think really hard about the requirements given to you and make sure you understand them completely. If you don't, ask for clarification.
- Ensure the plan is detailed enough so you can start on it at any point with no prior memory or context of what happened previously.
- Break the requirements down into clear, actionable phases and tasks.
- Create a new file for each phase in newly created directory, e.g., `YYYY_MM_DD_<PROJECT_NAME>/phase-1.md`, `phase-2.md`, etc.
- Create an `index.md` file in the new directory that links to each phase with a brief description of what it covers.
- The `index.md` file should also include the project rules and conventions and project name.
- Each `phase-x.md` file should contain:
  - **Objective**: What the phase aims to achieve
  - **Tasks**: Specific tasks to complete in this phase
  - **Technical Specifications**: Any technical details or requirements
  - **Quality Assurance**: How to verify the phase is complete and meets requirements
  - **Tasks**: Specific steps to complete the phase
  - **Documentation**: Any documentation updates needed
  - **Expected Outcomes**: What success looks like for this phase
- After each task, update the memory MCP with the state of the project.
- After each task, mark the task as complete in the `phase-x.md` file with a ✅.
- After completing a phase, verify with the human that the phase is done and they are satisfied with the result.
- If they are, clear the .ai/memory.jsonl file and move the task to `/projects/done` and the commit changes with a conventional commit message like `feat: complete phase 1 of <PROJECT_NAME>`. Also mark the phase as complete in the `index.md` file.

## Quality Assurance Requirement

**MANDATORY**: After EVERY task completion, the following quality checks MUST pass before moving on:
**IMPORTANT**: Check package.json for the correct pacakge maanager and replace `npm run` as needed.

### 1. Code Quality Checks

```bash
# Run ALL quality checks - NO EXCEPTIONS
npm run lint          # Must pass with zero errors
npm run format        # Must format all files
npm run typecheck     # Must pass with zero type errors
npm run build         # Must build successfully
```

### 2. Test Execution

```bash
# Run ALL tests - Cannot skip or say "out of scope"
npm run test:unit     # All unit tests must pass
npm run test:integration  # All integration tests must pass
npm run test:snapshot    # All snapshot tests must pass
npm run test:e2e      # E2E tests must pass (if applicable)
```

### 4. Failure Protocol

If ANY test fails:

1. STOP immediately - do not proceed to next task
2. Fix the failing test/code
3. Re-run ALL quality checks
4. Only proceed when everything passes

**NO EXCEPTIONS**: Tests cannot be skipped, disabled, or marked as "not in scope"
