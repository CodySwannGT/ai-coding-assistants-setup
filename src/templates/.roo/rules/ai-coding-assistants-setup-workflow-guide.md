# AI Coding Orchestrator Workflow Using SPARC Methodology

## 1. Initial Request Assessment

When a new coding request is received:

1. **The SPARC Orchestrator (⚡️) takes lead** and performs initial analysis:
   - Reviews project memory (if available)
   - Evaluates the scope and complexity
   - Determines which specialized roles will be needed
   - Sends a brief welcome message using emojis to establish rapport

2. **Clarification Phase**:
   - Ask role (❓) may be engaged for research on technical requirements
   - Request clarifying information from the human if requirements are unclear
   - Research using appropriate tools (browser, MCP interfaces, etc.)

## 2. SPARC Workflow Execution

### Phase 1: Specification (📋 Specification Writer)
- Create detailed functional requirements document
- Document edge cases, constraints, and acceptance criteria
- Ensure no hard-coded environment variables or secrets
- Produce modular pseudocode with TDD anchors
- Document in phase_number_name.md format
- Use `attempt_completion` to finalize and hand off

### Phase 2: Architecture (🏗️ Architect)
- Design scalable, secure, modular architecture based on specifications
- Create architecture diagrams (Mermaid) showing:
  - System components and their relationships
  - Data flows and integration points
  - API boundaries and service responsibilities
- Ensure design follows modular principles (<500 lines per component)
- Use `attempt_completion` to document architecture decisions

### Phase 3: Implementation
- **For new features (🧠 Auto-Coder)**:
  - Implement code based on specifications and architecture
  - Use configuration for environments (no hardcoded values)
  - Break large components into files <500 lines
  - Use `attempt_completion` to signal completion

- **For test-driven tasks (🧪 Tester)**:
  - Write failing tests first based on specifications
  - Implement only enough code to pass tests
  - Refactor after tests pass
  - Ensure all files remain under 500 lines
  - Document test coverage and strategies

- **For database operations (🔐 Supabase Admin)**:
  - Design and implement database schemas
  - Create RLS policies and security rules
  - Set up authentication flows
  - Document database structure and access patterns

- **For integration with external services (♾️ MCP Integration)**:
  - Connect to external APIs through MCP interfaces
  - Handle data transformation and validation
  - Implement secure credential management
  - Document integration points

### Phase 4: Refinement

- **For bug fixes (🪲 Debugger)**:
  - Analyze logs, traces, and stack information
  - Isolate and fix issues while maintaining modularity
  - Document root cause and fix approach
  - Update tests to prevent regression

- **For security improvements (🛡️ Security Reviewer)**:
  - Scan for exposed secrets or environment leaks
  - Identify potential security vulnerabilities
  - Flag oversized files (>500 lines) or poor modular boundaries
  - Recommend and implement security improvements

- **For performance optimization (🧹 Optimizer)**:
  - Refactor code for improved performance
  - Break down large components
  - Move inline configurations to environment files
  - Document optimization strategies

- **For infrastructure setup (🚀 DevOps)**:
  - Provision cloud resources and infrastructure
  - Configure CI/CD pipelines
  - Manage environment variables and secrets
  - Document deployment procedures and rollback plans

### Phase 5: Completion

- **For system integration (🔗 System Integrator)**:
  - Ensure components work together correctly
  - Verify interface compatibility
  - Resolve integration conflicts
  - Document system connections and dependencies

- **For documentation (📚 Documentation Writer)**:
  - Create clear, concise Markdown documentation
  - Include examples and usage instructions
  - Ensure documentation is under 500 lines per file
  - Organize documentation in logical sections

- **For monitoring (📈 Deployment Monitor)**:
  - Set up performance metrics and logging
  - Configure alerting systems
  - Monitor post-deployment behavior
  - Document monitoring approach and thresholds

## 3. Task Delegation and Coordination

Throughout the process:

1. **Task Delegation**:
   - Use `new_task` to assign specific subtasks to appropriate roles
   - Include clear context and requirements in each delegation
   - Ensure each role focuses on their area of expertise

2. **Task Completion**:
   - Each role finalizes their work using `attempt_completion`
   - Include summary of work completed
   - Document any remaining issues or future improvements

3. **Quality Verification**:
   - Verify file sizes remain under 500 lines
   - Confirm no hardcoded secrets or environment variables
   - Check for proper modularity and separation of concerns
   - Run appropriate tests for all implemented features

## 4. Documentation and Knowledge Retention

After completion:

1. **Documentation Finalization**:
   - Update @docs/ folder with comprehensive documentation
   - Include architecture diagrams, code explanations, and usage examples
   - Document configuration requirements and environment setup

2. **Knowledge Update**:
   - Update project memory with new information
   - Record lessons learned and best practices discovered
   - Document patterns and anti-patterns for future reference

3. **Final Delivery**:
   - Present completed work to the human
   - Highlight key features and implementation details
   - Provide instructions for usage and maintenance
   - Suggest future improvements or enhancements
