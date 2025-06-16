# PRD Instructions

Using $ARGUMENTS as the base for the project, follow these steps to create a new project plan:

- Check to see if you're on a fresh branch (i.e. there are no commits to the branch yet). If not, create a new branch with the name `feature/<PROJECT_NAME>`, where `<PROJECT_NAME>` is a descriptive name for the project.
- Create a new directory in `projects/` called `YYYY_MM_DD_<PROJECT_NAME>` with today's date and a descriptive name for `PROJECT_NAME`.

## IMPORTANT:

- Think really hard about the requirements given to you and make sure you understand them completely. If you don't, ask for clarification.
- Ensure the plan is detailed enough so you can start on it at any point with no prior memory or context of what happened previously.
- Break the requirements down into clear, actionable phases and tasks.
- Create an `index.md` file in the new directory that links to each phase with a brief description of what it covers.
- The `index.md` file should also include the project rules and conventions and project name.
- Create a new directory for each phase in newly created directory, e.g., `YYYY_MM_DD_<PROJECT_NAME>/phase-1`, `YYYY_MM_DD_<PROJECT_NAME>/phase-2`, etc.
- Each `phase-x` directory should contain a file named `index.md` that contains:
  - **Tasks**: Simple list of the tasks to be completed
  - **Objective**: What the phase aims to achieve
  - **Technical Specifications**: Any technical details or requirements
  - **Quality Assurance**: How to verify the phase is complete and meets requirements
  - **Documentation**: Any documentation updates needed
  - **Expected Outcomes**: What success looks like for this phase
- Each `phase-x` directory should also contain a file named `task-x.md` (task-1.md, task-2.md, etc). This file should include the definition of the task as well as the following process requirements:
  **TDD Requirements** (for any implementations):
  1. **Check out new branch**
  2. **Write tests FIRST** based on legacy handler behavior
  3. **After completing this task**, run full quality validation:
     ```bash
     # IMPORTANT Check package.json for the correct pacakge maanager and replace `npm run` as needed (i.e. yarn, bun, etc)
     npm run lint          # Must pass with zero errors
     npm run format        # Must format all files
     npm run typecheck     # Must pass with zero type errors
     npm run build         # Must build successfully
     npm run test:unit         # Must build successfully
     ```
  4. **All checks must pass** before proceeding to the next step
  5. **Review code for adherence to project standards**
  6. **Make any necessary changes based on review and run checks again**
  7. **update the memory MCP with the state of the project**
  8. **mark the task as complete in the `phase-x/index.md` file with a ✅**
  9. **Conventional commit all unstaged and untracked files (in chunks if appropriate)**
  10. **Open pull request into the branch this branch was created from**
  11. **Play completion sound**: `afplay /System/Library/Sounds/Glass.aiff`
- After completing a phase, verify with the human that the phase is done and they are satisfied with the result - if so, mark the phase as complete in `YYYY_MM_DD_<PROJECT_NAME>/index.md`

**NO EXCEPTIONS**: Tests cannot be skipped, disabled, or marked as "not in scope"
