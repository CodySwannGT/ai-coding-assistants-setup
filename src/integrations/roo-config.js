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
  
  // Initialize config
  let rooConfig = {
    version: '1.0.0',
    providers: {}
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
  
  // Initialize providers object if it doesn't exist
  rooConfig.providers = rooConfig.providers || {};
  
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
          rooConfig.providers.openai = {
            apiKey: encryptedKey,
            models: ['gpt-4o', 'gpt-4-turbo'],
            baseUrl: 'https://api.openai.com/v1'
          };
          break;
          
        case 'anthropic':
          rooConfig.providers.anthropic = {
            apiKey: encryptedKey,
            models: ['claude-3-opus', 'claude-3-sonnet'],
            baseUrl: 'https://api.anthropic.com'
          };
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
  
  // Configure memory settings
  let maxTokens = '16000';
  if (nonInteractive) {
    maxTokens = env.ROO_MAX_TOKENS || process.env.ROO_MAX_TOKENS || '16000';
  } else {
    maxTokens = await input({
      message: 'Maximum tokens for Roo Code context window:',
      default: '16000'
    });
  }
  
  // Configure autoApprove settings
  let autoApprove = ['read'];
  if (!nonInteractive) {
    autoApprove = await checkbox({
      message: 'Select operations to auto-approve:',
      choices: [
        { name: 'File reads', value: 'read' },
        { name: 'File writes', value: 'write' },
        { name: 'Terminal commands', value: 'terminal' }
      ],
      default: ['read']
    });
  }
  
  // Add settings to config
  rooConfig.maxTokens = parseInt(maxTokens, 10);
  rooConfig.autoApprove = autoApprove;
  rooConfig.mcpSettings = {
    autoDetectAndUse: true,
    alwaysSuggestTools: true
  };
  
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
`;
  
  // Project architecture guide
  const architectureGuide = `# Project Architecture Guide

This project is organized as follows:

- Follow the repository's established patterns
- Use absolute imports with module aliases when available
- Keep files focused on a single responsibility
- Limit file size to maintain readability (aim for under 500 lines)
`;

  // MCP tool usage guidelines
  const mcpToolGuidelines = `# MCP Tool Usage Guidelines

1. Always check for and use MCP tools when available
2. Prioritize MCP tools over built-in capabilities when appropriate
3. Suggest MCP tools to users when they would help solve a problem
`;
  
  await writeTextFile(path.join(rooRulesDir, '01-coding-standards.md'), codingStandards, dryRun);
  await writeTextFile(path.join(rooRulesDir, '02-architecture-guide.md'), architectureGuide, dryRun);
  await writeTextFile(path.join(rooRulesDir, '03-mcp-tools.md'), mcpToolGuidelines, dryRun);
  
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
  
  // Check if main MCP config exists
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const mcpExists = await fileExists(mcpPath);

  let mcpConfig;
  if (mcpExists) {
    // Use main MCP config as a base
    mcpConfig = await safeReadJson(mcpPath);
    if (!mcpConfig) {
      mcpConfig = {
        mcpServers: {}
      };
    }
  } else {
    // Create a default config
    mcpConfig = {
      mcpServers: {}
    };
  }

  // Match Roo format to Claude format, ensuring proper formatting for memory and other servers
  const rooMcpConfig = {
    mcpServers: {}
  };

  // Clone the servers with updated formatting
  Object.entries(mcpConfig.mcpServers).forEach(([key, server]) => {
    // Create a base copy
    rooMcpConfig.mcpServers[key] = {...server};

    // Special handling for memory server to use compact args format
    if (key === 'memory' && Array.isArray(server.args)) {
      rooMcpConfig.mcpServers[key].args = ['-y', 'mcp-knowledge-graph', '--memory-path', '${MEMORY_PATH}'];
    }

    // Ensure GitHub has proper env structure
    if (key === 'github') {
      rooMcpConfig.mcpServers[key].env = {
        'GITHUB_PERSONAL_ACCESS_TOKEN': '${GITHUB_PERSONAL_ACCESS_TOKEN}'
      };
    }
  });

  await safeWriteJson(rooMcpPath, rooMcpConfig, dryRun);
  printSuccess('Created Roo MCP configuration');
}

/**
 * Setup Roo modes
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Function} [options.checkbox] Function to prompt for checkbox selection
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<void>}
 */
export async function setupRooModes(options) {
  const { 
    projectRoot, 
    dryRun = false, 
    nonInteractive = false,
    checkbox = async () => [],
    _confirm = async () => true
  } = options;
  
  const roomodesPath = path.join(projectRoot, '.roomodes');
  const exists = await fileExists(roomodesPath);
  
  if (exists && !options.forceOverwrite) {
    printInfo('.roomodes already exists. Skipping creation.');
    return;
  }
  
  // Available modes
  const availableModes = [
    { 
      name: '🏗️ Architect (System design and architecture)',
      value: 'architect',
      config: {
        slug: 'architect',
        name: '🏗️ Architect',
        roleDefinition: 'You are an expert software architect specializing in designing scalable, maintainable systems. You excel at creating clear architectural diagrams, defining interfaces, and planning project structure.',
        groups: ['read', 'edit', 'command'],
        customInstructions: 'Focus on modular design principles, separation of concerns, and clear documentation of interfaces between components.'
      }
    },
    { 
      name: '🧪 TDD Developer (Test-driven development)',
      value: 'tdd',
      config: {
        slug: 'tdd',
        name: '🧪 TDD Developer',
        roleDefinition: 'You are a test-driven development specialist who follows a strict red-green-refactor workflow. You always write tests before implementation code.',
        groups: [
          'read', 
          ['edit', { 
            fileRegex: '\\.(test|spec)\\.(js|ts|jsx|tsx)$', 
            description: 'Test files only' 
          }]
        ],
        customInstructions: 'Follow the TDD workflow: 1) Write a failing test, 2) Write minimal code to make the test pass, 3) Refactor while keeping tests green. Never write implementation before tests.'
      }
    },
    { 
      name: '🔒 Security Reviewer (Security audits)',
      value: 'security',
      config: {
        slug: 'security',
        name: '🔒 Security Reviewer',
        roleDefinition: 'You are a cybersecurity expert specializing in code review for security vulnerabilities. You analyze code for potential security issues and suggest secure alternatives.',
        groups: ['read'],
        customInstructions: 'Focus on identifying: 1) Injection vulnerabilities, 2) Authentication flaws, 3) Sensitive data exposure, 4) Cross-site scripting (XSS), 5) Insecure dependencies, 6) Hard-coded credentials.'
      }
    },
    { 
      name: '📝 Documentation Writer (Creating documentation)',
      value: 'docs',
      config: {
        slug: 'docs',
        name: '📝 Documentation Writer',
        roleDefinition: 'You are a technical writer who specializes in creating clear, comprehensive documentation for developers and users.',
        groups: [
          'read',
          ['edit', { 
            fileRegex: '\\.(md|txt|mdx)$', 
            description: 'Documentation files only' 
          }]
        ],
        customInstructions: "Create documentation that is: 1) Clear and concise, 2) Well-structured with headings, 3) Includes examples, 4) Explains both 'how' and 'why', 5) Uses consistent terminology."
      }
    },
    { 
      name: '📊 Data Analyst (Data processing and visualization)',
      value: 'data',
      config: {
        slug: 'data',
        name: '📊 Data Analyst',
        roleDefinition: 'You are a data analyst specializing in processing, analyzing, and visualizing data to extract meaningful insights.',
        groups: ['read', 'edit', 'command'],
        customInstructions: 'Focus on: 1) Data cleaning and preparation, 2) Statistical analysis, 3) Data visualization, 4) Interpreting results, 5) Communicating insights clearly.'
      }
    },
    { 
      name: '🚀 DevOps Engineer (Infrastructure and deployment)',
      value: 'devops',
      config: {
        slug: 'devops',
        name: '🚀 DevOps Engineer',
        roleDefinition: 'You are a DevOps engineer specializing in infrastructure, CI/CD pipelines, and deployment automation.',
        groups: ['read', 'edit', 'command'],
        customInstructions: 'Focus on: 1) Infrastructure as code, 2) CI/CD pipeline optimization, 3) Containerization, 4) Security best practices, 5) Monitoring and observability.'
      }
    },
    { 
      name: '🔍 Code Reviewer (Code quality and standards)',
      value: 'reviewer',
      config: {
        slug: 'reviewer',
        name: '🔍 Code Reviewer',
        roleDefinition: 'You are a meticulous code reviewer focused on maintaining high code quality, consistency, and adherence to best practices.',
        groups: ['read'],
        customInstructions: 'Focus on: 1) Code quality and readability, 2) Design patterns and architecture, 3) Performance considerations, 4) Potential bugs or edge cases, 5) Adherence to project standards.'
      }
    }
  ];

  // Select modes to create
  let selectedModes = ['architect', 'tdd', 'security', 'docs'];
  if (!nonInteractive) {
    printHeader('Setting up Roo Code Custom Modes');
    
    selectedModes = await checkbox({
      message: 'Which custom modes would you like to create?',
      choices: availableModes.map(mode => ({
        name: mode.name,
        value: mode.value
      })),
      default: ['architect', 'tdd', 'security', 'docs']
    });
  }
  
  // Create modes configuration
  const modes = {
    customModes: availableModes
      .filter(mode => selectedModes.includes(mode.value))
      .map(mode => mode.config)
  };

  // Check for shared preferences to incorporate
  const sharedPrefsPath = path.join(projectRoot, '.ai-assistants', 'shared-preferences.json');
  if (await fileExists(sharedPrefsPath)) {
    try {
      const sharedPrefs = await safeReadJson(sharedPrefsPath);
      if (sharedPrefs?.codingPreferences?.testFirstDevelopment) {
        // Add or modify coding preferences in the modes configuration
        modes.codingPreferences = {
          ...(modes.codingPreferences || {}),
          testFirstDevelopment: true,
          askAboutTestsWhenCoding: true
        };

        // Ensure TDD mode is part of the selected modes if test-first is enabled
        if (!selectedModes.includes('tdd')) {
          const tddMode = availableModes.find(m => m.value === 'tdd');
          if (tddMode) {
            modes.customModes.push(tddMode.config);
            printInfo('Added TDD mode to support test-first development preference');

            // Also create the TDD mode rules directory
            const tddRulesDir = path.join(projectRoot, '.roo', 'rules-tdd');
            await ensureDirectory(tddRulesDir, dryRun);

            const instructionsContent = `# 🧪 TDD Developer Mode Instructions

Follow the test-driven development workflow:
1. Write a failing test first
2. Write minimal code to make the test pass
3. Refactor while keeping tests green

## Mode-Specific Guidelines

1. Always ask about writing tests first for new features
2. Suggest test cases before implementation
3. Focus on test coverage and meaningful assertions
4. Use appropriate testing frameworks for the project
`;

            await writeTextFile(path.join(tddRulesDir, '01-instructions.md'), instructionsContent, dryRun);
          }
        }
      }
    } catch (err) {
      printInfo(`Could not read shared preferences: ${err.message}`);
    }
  }
  
  await safeWriteJson(roomodesPath, modes, dryRun);
  printSuccess('Created Roo custom modes configuration');
  
  // Create mode-specific rules directories
  for (const modeValue of selectedModes) {
    const mode = availableModes.find(m => m.value === modeValue);
    if (mode) {
      const modeRulesDir = path.join(projectRoot, '.roo', `rules-${mode.value}`);
      await ensureDirectory(modeRulesDir, dryRun);
      
      // Create a basic instruction file for the mode
      const instructionsContent = `# ${mode.config.name} Mode Instructions

${mode.config.customInstructions}

## Mode-Specific Guidelines

1. Follow the role definition as the primary guide for your behavior
2. Adhere to project-wide rules and coding standards
3. Use the specific tools and permissions granted to this mode
`;
      
      await writeTextFile(path.join(modeRulesDir, '01-instructions.md'), instructionsContent, dryRun);
      printSuccess(`Created mode-specific rules for ${mode.config.name}`);
    }
  }
}

export default {
  setupRooCode,
  setupRooRules,
  setupRooIgnore,
  setupRooMcp,
  setupRooModes
};