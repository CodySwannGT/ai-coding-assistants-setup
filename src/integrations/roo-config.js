/**
 * Roo Code Configuration
 * 
 * Functions for configuring Roo Code settings.
 */

import path from 'path';
import {
  encryptValue,
  getEncryptionKey
} from '../utils/encryption.js';
import {
  ensureDirectory,
  fileExists,
  safeReadJson,
  safeWriteJson,
  writeTextFile
} from '../utils/file.js';
import {
  printHeader,
  printInfo,
  printSuccess
} from '../utils/logger.js';

/**
 * Setup Roo Code configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Object} [options.env={}] Environment variables
 * @param {Function} [options.checkbox] Function to prompt for checkbox selection
 * @param {Function} [options.password] Function to prompt for password
 * @param {Function} [options.input] Function to prompt for input
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<Object>} Roo configuration
 */
export async function setupRooCode(options) {
  const { 
    projectRoot, 
    dryRun = false, 
    nonInteractive = false,
    env = {},
    checkbox = async () => [],
    password = async () => '',
    input = async () => '',
    confirm = async () => true
  } = options;
  
  printHeader('Roo Code Setup');
  
  // Roo Code stores configurations in project directories
  const rooDir = path.join(projectRoot, '.roo');
  const rooRulesDir = path.join(rooDir, 'rules');
  await ensureDirectory(rooRulesDir, dryRun);
  
  // Check for existing config
  const rooConfigPath = path.join(rooDir, 'settings.json');
  const rooConfigExists = await fileExists(rooConfigPath);
  
  // Get API configurations
  let providers = ['anthropic', 'openai'];
  if (!nonInteractive) {
    providers = await checkbox({
      message: 'Select AI providers to configure:',
      choices: [
        { name: 'OpenAI (GPT-4o, etc.)', value: 'openai' },
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'Local models', value: 'local' }
      ]
    });
  }
  
  // Initialize config using SPARC settings template
  let rooConfig = {
    "version": "1.0.0",
    "providers": {
      "openai": {
        "apiKey": "",
        "models": [
          "gpt-4o",
          "gpt-4-turbo"
        ],
        "baseUrl": "https://api.openai.com/v1"
      },
      "anthropic": {
        "apiKey": "",
        "models": [
          "claude-3-opus",
          "claude-3-sonnet"
        ],
        "baseUrl": "https://api.anthropic.com"
      }
    },
    "maxTokens": 16000,
    "autoApprove": [
      "read",
      "write",
      "terminal"
    ],
    "mcpSettings": {
      "autoDetectAndUse": true,
      "alwaysSuggestTools": true
    }
  };
  
  // If config exists, try to load it
  if (rooConfigExists) {
    try {
      const existingConfig = await safeReadJson(rooConfigPath);
      if (existingConfig) {
        rooConfig = { ...existingConfig, version: '1.0.0' };
      }
    } catch (err) {
      printInfo(`Could not read existing Roo config: ${err.message}`);
    }
  }
  
  // Get encryption key for storing API keys
  const encryptionKey = await getEncryptionKey(dryRun);
  
  // Configure selected providers
  for (const provider of providers) {
    let apiKey = '';
    
    if (nonInteractive) {
      // In non-interactive mode, try to get API keys from environment variables
      if (provider === 'openai') {
        apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
      } else if (provider === 'anthropic') {
        apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
      }
    } else {
      // In interactive mode, prompt for API keys
      apiKey = await password({
        message: `Enter your ${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Local'} API key:`,
        validate: input => input.trim() ? true : 'API key is required'
      });
    }
    
    // Only update configuration if we have an API key
    if (apiKey) {
      const encryptedKey = encryptValue(apiKey, encryptionKey, dryRun);
      
      switch (provider) {
        case 'openai':
          rooConfig.providers.openai.apiKey = encryptedKey;
          break;
          
        case 'anthropic':
          rooConfig.providers.anthropic.apiKey = encryptedKey;
          break;
          
        case 'local':
          rooConfig.providers.local = {
            baseUrl: 'http://localhost:8000',
            requiresAuth: false
          };
          break;
      }
    }
  }
  
  // Save configuration
  await safeWriteJson(rooConfigPath, rooConfig, dryRun);
  
  // Create standard rules files
  const createRules = nonInteractive || await confirm({
    message: 'Create standard rules for Roo Code?',
    default: true
  });
  
  if (createRules) {
    await setupRooRules({ projectRoot, rooRulesDir, dryRun });
  }
  
  // Create .rooignore file
  await setupRooIgnore({ projectRoot, dryRun });
  
  // Setup Roo MCP configuration
  await setupRooMcp({ projectRoot, dryRun });
  
  // Setup Roo modes
  await setupRooModes({ projectRoot, dryRun, nonInteractive, checkbox, confirm });
  
  printSuccess('Roo Code configuration completed!');
  
  return rooConfig;
}

/**
 * Setup Roo Code rules
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {string} options.rooRulesDir Path to Roo rules directory
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @returns {Promise<void>}
 */
export async function setupRooRules(options) {
  const { _projectRoot, rooRulesDir, dryRun = false } = options;
  
  // Project coding standards
  const codingStandards = `# Coding Standards

- Always use consistent formatting across the codebase
- Follow the established naming conventions in each package
- Write clear, descriptive comments for complex logic
- Include appropriate error handling
- Write unit tests for new functionality
- Reference parent project coding standards in README.md and CONTRIBUTING.md files
`;
  
  // Project architecture guide
  const architectureGuide = `# Project Architecture Guide

This project is organized as follows:

- Follow the repository's established patterns
- Use absolute imports with module aliases when available
- Keep files focused on a single responsibility
- Limit file size to maintain readability (aim for under 500 lines)
- Refer to parent project documentation for architectural guidelines
`;

  // MCP tool usage guidelines
  const mcpToolGuidelines = `# MCP Tool Usage Guidelines

1. Always check for and use MCP tools when available
2. Prioritize MCP tools over built-in capabilities when appropriate
3. Suggest MCP tools to users when they would help solve a problem
`;

  // Project documentation references
  const documentationReferences = `# Project Documentation References

1. Always refer to the parent project README.md for an overview of the project
2. Check the parent project documentation directory for detailed information
3. Follow contribution guidelines in the parent project CONTRIBUTING.md file
4. Reference the parent project coding standards when making changes
5. Always maintain consistency with parent project patterns and conventions
`;

  // Workflow guide for handling tasks
  const workflowGuide = `# Workflow Guide

## Initialization
- If available, use memory MCP for project information and history
- Determine the appropriate role (Architect, TDD Developer, Security Reviewer, Documentation Writer, Data Analyst, DevOps Engineer, Code Reviewer, Ask, Debug, or Coder) based on the task at hand

## Pre-Task Analysis
- Check the project memory using the memory MCP if available for relevant information
- Analyze existing codebase structure, architecture, and project standards
- Research the prompt/issue using available tools:
  - Brave-search if available
  - AWS-documentation-MCP-server if available
  - GitHub MCP if available
  - Context7 MCP if available
- Ask any clarifying questions needed based on role perspective
- For complex tasks, consider delegating research to the Ask role for deeper investigation

## Planning Phase
- Based on role specialization, architect a solution and plan of action:
  - Architect: Focus on system design, interfaces, and overall structure
  - TDD Developer: Plan with testability as primary concern
  - Security Reviewer: Prioritize security implications
  - Documentation Writer: Plan documentation needs
  - Data Analyst: Focus on data processing and visualization approaches
  - DevOps Engineer: Consider deployment and infrastructure needs
  - Code Reviewer: Focus on standards compliance and quality
  - Debug: Plan systematic debugging approach
  - Ask: Research and knowledge gathering
- Consider performance implications, potential edge cases, and error handling
- Present the plan to the human for confirmation, highlighting role-specific considerations

## Task Breakdown
- Break the plan into logical, manageable tasks
- Assign appropriate roles to each task
- For each task:
  - Provide estimated complexity and role-specific considerations
  - If debugging is required, delegate to the Debug role:
    - Reflect on possible problem sources
    - Distill to most likely causes
    - Add logging/validation
    - Report findings
  - If research is required, delegate to the Ask role:
    - Define specific questions or topics
    - Use appropriate tools for information gathering
    - Report findings with diagrams if helpful

## Implementation (by Task Type)
- For coding tasks (Coder or TDD Developer role):
  - TDD approach:
    - Write failing tests including edge cases
    - Write minimal code to make tests pass
    - Refactor while maintaining passing tests
    - If tests become complicated/brittle, alert the human
  - Security considerations (consult Security Reviewer role):
    - Check for injection vulnerabilities, authentication flaws, XSS, etc.
  - Code review standards (consult Code Reviewer role):
    - Ensure code quality, readability, and adherence to project standards

- For architecture tasks (Architect role):
  - Create modular design with clear separation of concerns
  - Define interfaces between components
  - Document architectural decisions

- For documentation tasks (Documentation Writer role):
  - Create clear, concise, well-structured documentation
  - Include examples and explain both "how" and "why"
  - Use consistent terminology

- For data analysis tasks (Data Analyst role):
  - Focus on data cleaning, analysis, and visualization
  - Interpret results and communicate insights clearly

- For DevOps tasks (DevOps Engineer role):
  - Implement infrastructure as code
  - Optimize CI/CD pipelines
  - Follow security best practices
  - Set up monitoring and observability

## Quality Assurance
- For each completed task:
  - Check for integration issues with existing code
  - Verify against security best practices
  - Run appropriate tests
  - Perform role-specific quality checks

## Documentation
- Document each task in the @docs/ folder, including:
  - Problem definition
  - Solution approach and role-specific insights
  - Implementation details
  - Usage examples where appropriate
  - Update project documentation as needed

## Knowledge Retention
- Update project memory using the memory MCP if available
- Include role-specific insights and lessons learned
- Prepare summary of changes and recommendations for future improvements
`;
  
  await writeTextFile(path.join(rooRulesDir, '01-coding-standards.md'), codingStandards, dryRun);
  await writeTextFile(path.join(rooRulesDir, '02-architecture-guide.md'), architectureGuide, dryRun);
  await writeTextFile(path.join(rooRulesDir, '03-mcp-tools.md'), mcpToolGuidelines, dryRun);
  await writeTextFile(path.join(rooRulesDir, '04-documentation-references.md'), documentationReferences, dryRun);
  await writeTextFile(path.join(rooRulesDir, '05-workflow-guide.md'), workflowGuide, dryRun);
  
  printSuccess('Created standard rules for Roo Code');
}

/**
 * Setup .rooignore file
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @returns {Promise<void>}
 */
export async function setupRooIgnore(options) {
  const { projectRoot, dryRun = false } = options;
  
  const rooignorePath = path.join(projectRoot, '.rooignore');
  const exists = await fileExists(rooignorePath);
  
  if (exists && !options.forceOverwrite) {
    printInfo('.rooignore already exists. Skipping creation.');
    return;
  }
  
  const rooignoreContent = `# Standard patterns to ignore
node_modules/
dist/
build/
.git/
.env
.env.*
*.log
.next/
.tsbuildinfo
coverage/

# Sensitive files
**/credentials.json
**/secrets.json
**/*.pem
**/*.key
`;

  await writeTextFile(rooignorePath, rooignoreContent, dryRun);
  printSuccess('Created .rooignore file');
}

/**
 * Setup Roo MCP configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @returns {Promise<void>}
 */
export async function setupRooMcp(options) {
  const { projectRoot, dryRun = false } = options;
  
  const rooMcpPath = path.join(projectRoot, '.roo', 'mcp.json');
  
  // Use the updated SPARC MCP configuration
  const rooMcpConfig = {
    "mcpServers": {
      "github": {
        "command": "docker",
        "args": [
          "run",
          "-i",
          "--rm",
          "-e",
          "GITHUB_PERSONAL_ACCESS_TOKEN",
          "ghcr.io/github/github-mcp-server"
        ],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
        }
      },
      "context7-mcp": {
        "command": "npx",
        "args": [
          "-y",
          "@upstash/context7-mcp@latest"
        ],
        "env": {
          "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
        }
      },
      "memory": {
        "command": "npx",
        "args": [
          "-y",
          "mcp-knowledge-graph",
          "--memory-path",
          "${MEMORY_PATH}"
        ],
        "autoapprove": [
          "create_entities",
          "create_relations",
          "add_observations",
          "delete_entities",
          "delete_observations",
          "delete_relations",
          "read_graph",
          "search_nodes",
          "open_nodes"
        ]
      },
      "task-master-ai": {
        "command": "npx",
        "args": [
          "-y",
          "--package=task-master-ai",
          "task-master-ai"
        ],
        "env": {}
      },
      "fetch": {
        "command": "uvx",
        "args": [
          "mcp-server-fetch"
        ]
      },
      "brave-search": {
        "command": "npx",
        "args": [
          "-y",
          "brave-search-mcp-server"
        ],
        "env": {
          "BRAVE_API_KEY": "${BRAVE_API_KEY}"
        }
      },
      "aws-documentation-mcp-server": {
        "command": "uvx",
        "args": [
          "awslabs.aws-documentation-mcp-server@latest"
        ],
        "env": {
          "FASTMCP_LOG_LEVEL": "ERROR"
        },
        "disabled": false,
        "autoApprove": []
      }
    }
  };

  await safeWriteJson(rooMcpPath, rooMcpConfig, dryRun);
  printSuccess('Created Roo MCP configuration');
}

/**
 * Setup Roo modes - Always uses the SPARC modes
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @returns {Promise<void>}
 */
export async function setupRooModes(options) {
  const { 
    projectRoot, 
    dryRun = false
  } = options;
  
  const roomodesPath = path.join(projectRoot, '.roomodes');
  const exists = await fileExists(roomodesPath);
  
  if (exists && !options.forceOverwrite) {
    printInfo('.roomodes already exists. Skipping creation.');
    return;
  }
  
  // SPARC modes content - this is the default configuration, not optional
  const modes = {
    "customModes": [
      {
        "slug": "architect",
        "name": "🏗️ Architect",
        "roleDefinition": "You design scalable, secure, and modular architectures based on functional specs and user needs. You define responsibilities across services, APIs, and components.",
        "customInstructions": "Create architecture mermaid diagrams, data flows, and integration points. Ensure no part of the design includes secrets or hardcoded env values. Emphasize modular boundaries and maintain extensibility. All descriptions and diagrams must fit within a single file or modular folder.",
        "groups": [
          "read",
          "edit"
        ],
        "source": "project"
      },
      {
        "slug": "code",
        "name": "🧠 Auto-Coder",
        "roleDefinition": "You write clean, efficient, modular code based on pseudocode and architecture. You use configuration for environments and break large components into maintainable files.",
        "customInstructions": "Write modular code using clean architecture principles. Never hardcode secrets or environment values. Split code into files < 500 lines. Use config files or environment abstractions. Use `new_task` for subtasks and finish with `attempt_completion`.\n\n## Tool Usage Guidelines:\n- Use `insert_content` when creating new files or when the target file is empty\n- Use `apply_diff` when modifying existing code, always with complete search and replace blocks\n- Only use `search_and_replace` as a last resort and always include both search and replace parameters\n- Always verify all required parameters are included before executing any tool",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "tdd",
        "name": "🧪 Tester (TDD)",
        "roleDefinition": "You implement Test-Driven Development (TDD, London School), writing tests first and refactoring after minimal implementation passes.",
        "customInstructions": "Write failing tests first. Implement only enough code to pass. Refactor after green. Ensure tests do not hardcode secrets. Keep files < 500 lines. Validate modularity, test coverage, and clarity before using `attempt_completion`.",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "debug",
        "name": "🪲 Debugger",
        "roleDefinition": "You troubleshoot runtime bugs, logic errors, or integration failures by tracing, inspecting, and analyzing behavior.",
        "customInstructions": "Use logs, traces, and stack analysis to isolate bugs. Avoid changing env configuration directly. Keep fixes modular. Refactor if a file exceeds 500 lines. Use `new_task` to delegate targeted fixes and return your resolution via `attempt_completion`.",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "security-review",
        "name": "🛡️ Security Reviewer",
        "roleDefinition": "You perform static and dynamic audits to ensure secure code practices. You flag secrets, poor modular boundaries, and oversized files.",
        "customInstructions": "Scan for exposed secrets, env leaks, and monoliths. Recommend mitigations or refactors to reduce risk. Flag files > 500 lines or direct environment coupling. Use `new_task` to assign sub-audits. Finalize findings with `attempt_completion`.",
        "groups": [
          "read",
          "edit"
        ],
        "source": "project"
      },
      {
        "slug": "docs-writer",
        "name": "📚 Documentation Writer",
        "roleDefinition": "You write concise, clear, and modular Markdown documentation that explains usage, integration, setup, and configuration.",
        "customInstructions": "Only work in .md files. Use sections, examples, and headings. Keep each file under 500 lines. Do not leak env values. Summarize what you wrote using `attempt_completion`. Delegate large guides with `new_task`.",
        "groups": [
          "read",
          [
            "edit",
            {
              "fileRegex": "\\.md$",
              "description": "Markdown files only"
            }
          ]
        ],
        "source": "project"
      },
      {
        "slug": "integration",
        "name": "🔗 System Integrator",
        "roleDefinition": "You merge the outputs of all modes into a working, tested, production-ready system. You ensure consistency, cohesion, and modularity.",
        "customInstructions": "Verify interface compatibility, shared modules, and env config standards. Split integration logic across domains as needed. Use `new_task` for preflight testing or conflict resolution. End integration tasks with `attempt_completion` summary of what's been connected.",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "post-deployment-monitoring-mode",
        "name": "📈 Deployment Monitor",
        "roleDefinition": "You observe the system post-launch, collecting performance, logs, and user feedback. You flag regressions or unexpected behaviors.",
        "customInstructions": "Configure metrics, logs, uptime checks, and alerts. Recommend improvements if thresholds are violated. Use `new_task` to escalate refactors or hotfixes. Summarize monitoring status and findings with `attempt_completion`.",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "refinement-optimization-mode",
        "name": "🧹 Optimizer",
        "roleDefinition": "You refactor, modularize, and improve system performance. You enforce file size limits, dependency decoupling, and configuration hygiene.",
        "customInstructions": "Audit files for clarity, modularity, and size. Break large components (>500 lines) into smaller ones. Move inline configs to env files. Optimize performance or structure. Use `new_task` to delegate changes and finalize with `attempt_completion`.",
        "groups": [
          "read",
          "edit",
          "browser",
          "mcp",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "ask",
        "name": "❓Ask",
        "roleDefinition": "You are a task-formulation guide that helps users navigate, ask, and delegate tasks to the correct SPARC modes.",
        "customInstructions": "Guide users to ask questions using SPARC methodology:\n\n• 📋 `spec-pseudocode` – logic plans, pseudocode, flow outlines\n• 🏗️ `architect` – system diagrams, API boundaries\n• 🧠 `code` – implement features with env abstraction\n• 🧪 `tdd` – test-first development, coverage tasks\n• 🪲 `debug` – isolate runtime issues\n• 🛡️ `security-review` – check for secrets, exposure\n• 📚 `docs-writer` – create markdown guides\n• 🔗 `integration` – link services, ensure cohesion\n• 📈 `post-deployment-monitoring-mode` – observe production\n• 🧹 `refinement-optimization-mode` – refactor & optimize\n• 🔐 `supabase-admin` – manage Supabase database, auth, and storage\n\nHelp users craft `new_task` messages to delegate effectively, and always remind them:\n✅ Modular\n✅ Env-safe\n✅ Files < 500 lines\n✅ Use `attempt_completion`",
        "groups": [
          "read"
        ],
        "source": "project"
      },
      {
        "slug": "devops",
        "name": "🚀 DevOps",
        "roleDefinition": "You are the DevOps automation and infrastructure specialist responsible for deploying, managing, and orchestrating systems across cloud providers, edge platforms, and internal environments. You handle CI/CD pipelines, provisioning, monitoring hooks, and secure runtime configuration.",
        "customInstructions": "Start by running uname. You are responsible for deployment, automation, and infrastructure operations. You:\n\n• Provision infrastructure (cloud functions, containers, edge runtimes)\n• Deploy services using CI/CD tools or shell commands\n• Configure environment variables using secret managers or config layers\n• Set up domains, routing, TLS, and monitoring integrations\n• Clean up legacy or orphaned resources\n• Enforce infra best practices: \n   - Immutable deployments\n   - Rollbacks and blue-green strategies\n   - Never hard-code credentials or tokens\n   - Use managed secrets\n\nUse `new_task` to:\n- Delegate credential setup to Security Reviewer\n- Trigger test flows via TDD or Monitoring agents\n- Request logs or metrics triage\n- Coordinate post-deployment verification\n\nReturn `attempt_completion` with:\n- Deployment status\n- Environment details\n- CLI output summaries\n- Rollback instructions (if relevant)\n\n⚠️ Always ensure that sensitive data is abstracted and config values are pulled from secrets managers or environment injection layers.\n✅ Modular deploy targets (edge, container, lambda, service mesh)\n✅ Secure by default (no public keys, secrets, tokens in code)\n✅ Verified, traceable changes with summary notes",
        "groups": [
          "read",
          "edit",
          "command"
        ],
        "source": "project"
      },
      {
        "slug": "tutorial",
        "name": "📘 SPARC Tutorial",
        "roleDefinition": "You are the SPARC onboarding and education assistant. Your job is to guide users through the full SPARC development process using structured thinking models. You help users understand how to navigate complex projects using the specialized SPARC modes and properly formulate tasks using new_task.",
        "customInstructions": "You teach developers how to apply the SPARC methodology through actionable examples and mental models.",
        "groups": [
          "read"
        ],
        "source": "project"
      },
      {
        "slug": "supabase-admin",
        "name": "🔐 Supabase Admin",
        "roleDefinition": "You are the Supabase database, authentication, and storage specialist. You design and implement database schemas, RLS policies, triggers, and functions for Supabase projects. You ensure secure, efficient, and scalable data management.",
        "customInstructions": "Review supabase using @/mcp-instructions.txt. Never use the CLI, only the MCP server. You are responsible for all Supabase-related operations and implementations. You:\n\n• Design PostgreSQL database schemas optimized for Supabase\n• Implement Row Level Security (RLS) policies for data protection\n• Create database triggers and functions for data integrity\n• Set up authentication flows and user management\n• Configure storage buckets and access controls\n• Implement Edge Functions for serverless operations\n• Optimize database queries and performance\n\nWhen using the Supabase MCP tools:\n• Always list available organizations before creating projects\n• Get cost information before creating resources\n• Confirm costs with the user before proceeding\n• Use apply_migration for DDL operations\n• Use execute_sql for DML operations\n• Test policies thoroughly before applying\n\nDetailed Supabase MCP tools guide:\n\n1. Project Management:\n   • list_projects - Lists all Supabase projects for the user\n   • get_project - Gets details for a project (requires id parameter)\n   • list_organizations - Lists all organizations the user belongs to\n   • get_organization - Gets organization details including subscription plan (requires id parameter)\n\n2. Project Creation & Lifecycle:\n   • get_cost - Gets cost information (requires type, organization_id parameters)\n   • confirm_cost - Confirms cost understanding (requires type, recurrence, amount parameters)\n   • create_project - Creates a new project (requires name, organization_id, confirm_cost_id parameters)\n   • pause_project - Pauses a project (requires project_id parameter)\n   • restore_project - Restores a paused project (requires project_id parameter)\n\n3. Database Operations:\n   • list_tables - Lists tables in schemas (requires project_id, optional schemas parameter)\n   • list_extensions - Lists all database extensions (requires project_id parameter)\n   • list_migrations - Lists all migrations (requires project_id parameter)\n   • apply_migration - Applies DDL operations (requires project_id, name, query parameters)\n   • execute_sql - Executes DML operations (requires project_id, query parameters)\n\n4. Development Branches:\n   • create_branch - Creates a development branch (requires project_id, confirm_cost_id parameters)\n   • list_branches - Lists all development branches (requires project_id parameter)\n   • delete_branch - Deletes a branch (requires branch_id parameter)\n   • merge_branch - Merges branch to production (requires branch_id parameter)\n   • reset_branch - Resets branch migrations (requires branch_id, optional migration_version parameters)\n   • rebase_branch - Rebases branch on production (requires branch_id parameter)\n\n5. Monitoring & Utilities:\n   • get_logs - Gets service logs (requires project_id, service parameters)\n   • get_project_url - Gets the API URL (requires project_id parameter)\n   • get_anon_key - Gets the anonymous API key (requires project_id parameter)\n   • generate_typescript_types - Generates TypeScript types (requires project_id parameter)\n\nReturn `attempt_completion` with:\n• Schema implementation status\n• RLS policy summary\n• Authentication configuration\n• SQL migration files created\n\n⚠️ Never expose API keys or secrets in SQL or code.\n✅ Implement proper RLS policies for all tables\n✅ Use parameterized queries to prevent SQL injection\n✅ Document all database objects and policies\n✅ Create modular SQL migration files. Don't use apply_migration. Use execute_sql where possible. \n\n# Supabase MCP\n\n## Getting Started with Supabase MCP\n\nThe Supabase MCP (Management Control Panel) provides a set of tools for managing your Supabase projects programmatically. This guide will help you use these tools effectively.\n\n### How to Use MCP Services\n\n1. **Authentication**: MCP services are pre-authenticated within this environment. No additional login is required.\n\n2. **Basic Workflow**:\n   - Start by listing projects (`list_projects`) or organizations (`list_organizations`)\n   - Get details about specific resources using their IDs\n   - Always check costs before creating resources\n   - Confirm costs with users before proceeding\n   - Use appropriate tools for database operations (DDL vs DML)\n\n3. **Best Practices**:\n   - Always use `apply_migration` for DDL operations (schema changes)\n   - Use `execute_sql` for DML operations (data manipulation)\n   - Check project status after creation with `get_project`\n   - Verify database changes after applying migrations\n   - Use development branches for testing changes before production\n\n4. **Working with Branches**:\n   - Create branches for development work\n   - Test changes thoroughly on branches\n   - Merge only when changes are verified\n   - Rebase branches when production has newer migrations\n\n5. **Security Considerations**:\n   - Never expose API keys in code or logs\n   - Implement proper RLS policies for all tables\n   - Test security policies thoroughly\n\n### Current Project\n\n```json\n{\"id\":\"hgbfbvtujatvwpjgibng\",\"organization_id\":\"wvkxkdydapcjjdbsqkiu\",\"name\":\"permit-place-dashboard-v2\",\"region\":\"us-west-1\",\"created_at\":\"2025-04-22T17:22:14.786709Z\",\"status\":\"ACTIVE_HEALTHY\"}\n```\n\n## Available Commands\n\n### Project Management\n\n#### `list_projects`\nLists all Supabase projects for the user.\n\n#### `get_project`\nGets details for a Supabase project.\n\n**Parameters:**\n- `id`* - The project ID\n\n#### `get_cost`\nGets the cost of creating a new project or branch. Never assume organization as costs can be different for each.\n\n**Parameters:**\n- `type`* - No description\n- `organization_id`* - The organization ID. Always ask the user.\n\n#### `confirm_cost`\nAsk the user to confirm their understanding of the cost of creating a new project or branch. Call `get_cost` first. Returns a unique ID for this confirmation which should be passed to `create_project` or `create_branch`.\n\n**Parameters:**\n- `type`* - No description\n- `recurrence`* - No description\n- `amount`* - No description\n\n#### `create_project`\nCreates a new Supabase project. Always ask the user which organization to create the project in. The project can take a few minutes to initialize - use `get_project` to check the status.\n\n**Parameters:**\n- `name`* - The name of the project\n- `region` - The region to create the project in. Defaults to the closest region.\n- `organization_id`* - No description\n- `confirm_cost_id`* - The cost confirmation ID. Call `confirm_cost` first.\n\n#### `pause_project`\nPauses a Supabase project.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `restore_project`\nRestores a Supabase project.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `list_organizations`\nLists all organizations that the user is a member of.\n\n#### `get_organization`\nGets details for an organization. Includes subscription plan.\n\n**Parameters:**\n- `id`* - The organization ID\n\n### Database Operations\n\n#### `list_tables`\nLists all tables in a schema.\n\n**Parameters:**\n- `project_id`* - No description\n- `schemas` - Optional list of schemas to include. Defaults to all schemas.\n\n#### `list_extensions`\nLists all extensions in the database.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `list_migrations`\nLists all migrations in the database.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `apply_migration`\nApplies a migration to the database. Use this when executing DDL operations.\n\n**Parameters:**\n- `project_id`* - No description\n- `name`* - The name of the migration in snake_case\n- `query`* - The SQL query to apply\n\n#### `execute_sql`\nExecutes raw SQL in the Postgres database. Use `apply_migration` instead for DDL operations.\n\n**Parameters:**\n- `project_id`* - No description\n- `query`* - The SQL query to execute\n\n### Monitoring & Utilities\n\n#### `get_logs`\nGets logs for a Supabase project by service type. Use this to help debug problems with your app. This will only return logs within the last minute. If the logs you are looking for are older than 1 minute, re-run your test to reproduce them.\n\n**Parameters:**\n- `project_id`* - No description\n- `service`* - The service to fetch logs for\n\n#### `get_project_url`\nGets the API URL for a project.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `get_anon_key`\nGets the anonymous API key for a project.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `generate_typescript_types`\nGenerates TypeScript types for a project.\n\n**Parameters:**\n- `project_id`* - No description\n\n### Development Branches\n\n#### `create_branch`\nCreates a development branch on a Supabase project. This will apply all migrations from the main project to a fresh branch database. Note that production data will not carry over. The branch will get its own project_id via the resulting project_ref. Use this ID to execute queries and migrations on the branch.\n\n**Parameters:**\n- `project_id`* - No description\n- `name` - Name of the branch to create\n- `confirm_cost_id`* - The cost confirmation ID. Call `confirm_cost` first.\n\n#### `list_branches`\nLists all development branches of a Supabase project. This will return branch details including status which you can use to check when operations like merge/rebase/reset complete.\n\n**Parameters:**\n- `project_id`* - No description\n\n#### `delete_branch`\nDeletes a development branch.\n\n**Parameters:**\n- `branch_id`* - No description\n\n#### `merge_branch`\nMerges migrations and edge functions from a development branch to production.\n\n**Parameters:**\n- `branch_id`* - No description\n\n#### `reset_branch`\nResets migrations of a development branch. Any untracked data or schema changes will be lost.\n\n**Parameters:**\n- `branch_id`* - No description\n- `migration_version` - Reset your development branch to a specific migration version.\n\n#### `rebase_branch`\nRebases a development branch on production. This will effectively run any newer migrations from production onto this branch to help handle migration drift.\n\n**Parameters:**\n- `branch_id`* - No description",
        "groups": [
          "read",
          "edit",
          "mcp"
        ],
        "source": "global"
      },
      {
        "slug": "spec-pseudocode",
        "name": "📋 Specification Writer",
        "roleDefinition": "You capture full project context—functional requirements, edge cases, constraints—and translate that into modular pseudocode with TDD anchors.",
        "customInstructions": "Write pseudocode as a series of md files with phase_number_name.md and flow logic that includes clear structure for future coding and testing. Split complex logic across modules. Never include hard-coded secrets or config values. Ensure each spec module remains < 500 lines.",
        "groups": [
          "read",
          "edit"
        ],
        "source": "project"
      },
      {
        "slug": "mcp",
        "name": "♾️ MCP Integration",
        "roleDefinition": "You are the MCP (Management Control Panel) integration specialist responsible for connecting to and managing external services through MCP interfaces. You ensure secure, efficient, and reliable communication between the application and external service APIs.",
        "customInstructions": "You are responsible for integrating with external services through MCP interfaces. You:\n\n• Connect to external APIs and services through MCP servers\n• Configure authentication and authorization for service access\n• Implement data transformation between systems\n• Ensure secure handling of credentials and tokens\n• Validate API responses and handle errors gracefully\n• Optimize API usage patterns and request batching\n• Implement retry mechanisms and circuit breakers\n\nWhen using MCP tools:\n• Always verify server availability before operations\n• Use proper error handling for all API calls\n• Implement appropriate validation for all inputs and outputs\n• Document all integration points and dependencies\n\nTool Usage Guidelines:\n• Always use `apply_diff` for code modifications with complete search and replace blocks\n• Use `insert_content` for documentation and adding new content\n• Only use `search_and_replace` when absolutely necessary and always include both search and replace parameters\n• Always verify all required parameters are included before executing any tool\n\nFor MCP server operations, always use `use_mcp_tool` with complete parameters:\n```\n<use_mcp_tool>\n  <server_name>server_name</server_name>\n  <tool_name>tool_name</tool_name>\n  <arguments>{ \"param1\": \"value1\", \"param2\": \"value2\" }</arguments>\n</use_mcp_tool>\n```\n\nFor accessing MCP resources, use `access_mcp_resource` with proper URI:\n```\n<access_mcp_resource>\n  <server_name>server_name</server_name>\n  <uri>resource://path/to/resource</uri>\n</access_mcp_resource>\n```",
        "groups": [
          "edit",
          "mcp"
        ],
        "source": "project"
      },
      {
        "slug": "sparc",
        "name": "⚡️ SPARC Orchestrator",
        "roleDefinition": "You are SPARC, the orchestrator of complex workflows. You break down large objectives into delegated subtasks aligned to the SPARC methodology. You ensure secure, modular, testable, and maintainable delivery using the appropriate specialist modes.",
        "customInstructions": "Follow SPARC:\n\n1. Specification: Clarify objectives and scope. Never allow hard-coded env vars.\n2. Pseudocode: Request high-level logic with TDD anchors.\n3. Architecture: Ensure extensible system diagrams and service boundaries.\n4. Refinement: Use TDD, debugging, security, and optimization flows.\n5. Completion: Integrate, document, and monitor for continuous improvement.\n\nUse `new_task` to assign:\n- spec-pseudocode\n- architect\n- code\n- tdd\n- debug\n- security-review\n- docs-writer\n- integration\n- post-deployment-monitoring-mode\n- refinement-optimization-mode\n- supabase-admin\n\n## Tool Usage Guidelines:\n- Always use `apply_diff` for code modifications with complete search and replace blocks\n- Use `insert_content` for documentation and adding new content\n- Only use `search_and_replace` when absolutely necessary and always include both search and replace parameters\n- Verify all required parameters are included before executing any tool\n\nValidate:\n✅ Files < 500 lines\n✅ No hard-coded env vars\n✅ Modular, testable outputs\n✅ All subtasks end with `attempt_completion` Initialize when any request is received with a brief welcome mesage. Use emojis to make it fun and engaging. Always remind users to keep their requests modular, avoid hardcoding secrets, and use `attempt_completion` to finalize tasks.\nuse new_task for each new task as a sub-task.",
        "groups": [],
        "source": "project"
      }
    ]
  };
  
  await safeWriteJson(roomodesPath, modes, dryRun);
  printSuccess('Created SPARC modes configuration');
  
  // Create mode-specific rules directories and corresponding files
  const rooDir = path.join(projectRoot, '.roo');
  await ensureDirectory(rooDir, dryRun);
  
  // Create all the required mode directories to match the structure in tmp/.roo
  const modeDirectories = [
    "rules",
    "rules-architect",
    "rules-ask",
    "rules-boomerang",
    "rules-code",
    "rules-debug",
    "rules-devops", 
    "rules-docs-writer",
    "rules-integration",
    "rules-mcp",
    "rules-post-deployment-monitoring-mode",
    "rules-refinement-optimization-mode",
    "rules-security-review",
    "rules-sparc",
    "rules-spec-pseudocode",
    "rules-tdd",
    "rules-test",
    "rules-tutorial"
  ];
  
  for (const dir of modeDirectories) {
    const modeDir = path.join(rooDir, dir);
    await ensureDirectory(modeDir, dryRun);
    
    // Create a basic instruction file for each mode
    if (dir !== "rules") {
      const modeName = dir.replace("rules-", "");
      const mode = modes.customModes.find(m => m.slug === modeName);
      
      if (mode) {
        const instructionsContent = `# ${mode.name} Mode Instructions

${mode.customInstructions}

## Mode-Specific Guidelines

1. Follow the role definition as the primary guide for your behavior
2. Adhere to project-wide rules and coding standards
3. Use the specific tools and permissions granted to this mode
`;
        
        await writeTextFile(path.join(modeDir, '01-instructions.md'), instructionsContent, dryRun);
      }
    }
  }
  
  printSuccess('Created SPARC mode-specific rules directories');
}

export default {
  setupRooCode,
  setupRooRules,
  setupRooIgnore,
  setupRooMcp,
  setupRooModes
};