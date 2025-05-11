/**
 * MCP Configuration
 * 
 * Functions for setting up Model Context Protocol (MCP) servers.
 */

import path from 'path';
import { 
  fileExists, 
  safeReadJson, 
  safeWriteJson 
} from '../utils/file.js';
import { 
  printHeader, 
  printInfo, 
  printWarning, 
  printSuccess 
} from '../utils/logger.js';
import { 
  saveEnvironmentVars, 
  getEnvValue 
} from '../config/environment.js';
import { detectGitHubRepository } from './git.js';

/**
 * Setup or update MCP configuration
 * @param {Object} options Configuration options
 * @param {string} options.projectRoot Path to project root
 * @param {boolean} [options.dryRun=false] Whether to run in dry-run mode
 * @param {boolean} [options.nonInteractive=false] Whether to run in non-interactive mode
 * @param {Object} [options.env={}] Environment variables
 * @param {Function} [options.checkbox] Function to prompt for checkbox selection
 * @param {Function} [options.password] Function to prompt for password
 * @param {Function} [options.input] Function to prompt for input
 * @param {Function} [options.confirm] Function to confirm user choices
 * @returns {Promise<{config: Object, env: Object}>} MCP config and environment variables
 */
export async function setupMcpConfig(options) {
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
  
  printHeader('Configuring MCP servers');
  
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const exists = await fileExists(mcpPath);
  
  let mcpConfig = {};
  if (exists) {
    mcpConfig = await safeReadJson(mcpPath) || {};
  }
  
  // Default servers
  const defaultServers = ['github', 'context7', 'memory', 'taskmaster-ai', 'stackoverflow', 'command-shell'];
  
  // Available servers
  const availableServers = [
    { name: 'github (Repository awareness)', value: 'github' },
    { name: 'context7 (Code understanding)', value: 'context7' },
    { name: 'memory (Knowledge persistence)', value: 'memory' },
    { name: 'taskmaster-ai (Task management)', value: 'taskmaster-ai' },
    { name: 'stackoverflow (Knowledge search)', value: 'stackoverflow' },
    { name: 'command-shell (Shell command execution)', value: 'command-shell' },
    { name: 'jira (Task integration)', value: 'jira' },
    { name: 'playwright (Testing automation)', value: 'playwright' },
    { name: 'fetch (API communication)', value: 'fetch' },
    { name: 'browser (Web content retrieval)', value: 'browser' }
  ];
  
  // Select servers
  let selectedServers = defaultServers;
  if (!nonInteractive) {
    selectedServers = await checkbox({
      message: 'Select MCP servers to configure:',
      choices: availableServers,
      default: defaultServers
    });
  }
  
  // Get repository info if github is selected
  let github = {};
  if (selectedServers.includes('github')) {
    const repoInfo = await detectGitHubRepository(projectRoot);
    
    if (repoInfo.usesGithub) {
      github = {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: repoInfo.branch
      };
    } else {
      printWarning('Could not detect GitHub repository information. Using defaults.');
      
      if (!nonInteractive) {
        const owner = await input({
          message: 'Enter GitHub repository owner/organization:',
          default: 'owner'
        });
        
        const repo = await input({
          message: 'Enter GitHub repository name:',
          default: 'repo'
        });
        
        github = {
          owner,
          repo,
          branch: 'main'
        };
      } else {
        github = {
          owner: 'owner',
          repo: 'repo',
          branch: 'main'
        };
      }
    }
  }
  
  // Build server configurations with proper MCP format
  const serverConfigs = {};

  // Save personal config values for .env or local override
  const personalConfig = { env: { ...env }, mcpServers: {} };

  // Configure github
  if (selectedServers.includes('github')) {
    // Shared config with placeholder
    serverConfigs.github = {
      command: 'docker',
      args: [
        'run',
        '-i',
        '--rm',
        '-e',
        'GITHUB_PERSONAL_ACCESS_TOKEN',
        'ghcr.io/github/github-mcp-server'
      ],
      env: {}
    };

    // Ask for personal GitHub token if in interactive mode
    if (!nonInteractive) {
      const githubToken = await password({
        message: 'Enter your GitHub Personal Access Token:',
        validate: input => input.trim() ? true : 'Token is required for GitHub MCP server'
      });

      if (githubToken) {
        personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN = githubToken;
      }
    } else {
      // In non-interactive mode, try to get from environment
      const token = getEnvValue('GITHUB_PERSONAL_ACCESS_TOKEN', env);
      if (token) {
        personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN = token;
      }
    }
  }

  // Configure context7
  if (selectedServers.includes('context7')) {
    // Shared config with placeholder
    serverConfigs['context7-mcp'] = {
      command: 'npx',
      args: [
        '-y',
        '@upstash/context7-mcp@latest'
      ],
      env: {}
    };

    // Ask for Context7 API key
    if (!nonInteractive) {
      const context7Key = await password({
        message: 'Enter your Context7 API key:',
        validate: input => input.trim() ? true : 'API key is required for Context7'
      });

      if (context7Key) {
        personalConfig.env.CONTEXT7_API_KEY = context7Key;
      }
    } else {
      const key = getEnvValue('CONTEXT7_API_KEY', env);
      if (key) {
        personalConfig.env.CONTEXT7_API_KEY = key;
      }
    }

    // Add the environment variable to the server config
    serverConfigs['context7-mcp'].env = {
      CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}'
    };
  }

  // Configure memory
  if (selectedServers.includes('memory')) {
    // Default memory path
    const defaultMemoryPath = path.join(path.resolve(projectRoot, '..'), 'db/memory.jsonl');

    // Shared config with placeholder
    serverConfigs.memory = {
      command: 'npx',
      args: [
        '-y',
        'mcp-knowledge-graph',
        '--memory-path',
        '${MEMORY_PATH}'
      ],
      autoapprove: [
        'create_entities',
        'create_relations',
        'add_observations',
        'delete_entities',
        'delete_observations',
        'delete_relations',
        'read_graph',
        'search_nodes',
        'open_nodes'
      ]
    };

    // Ask for custom memory path
    if (!nonInteractive) {
      const memoryPath = await input({
        message: 'Enter path for memory storage:',
        default: defaultMemoryPath
      });

      if (memoryPath) {
        personalConfig.env.MEMORY_PATH = memoryPath;
      }
    } else {
      personalConfig.env.MEMORY_PATH = getEnvValue('MEMORY_PATH', env, defaultMemoryPath);
    }
  }

  // Configure taskmaster-ai
  if (selectedServers.includes('taskmaster-ai')) {
    // Shared config without sensitive info
    serverConfigs['task-master-ai'] = {
      command: 'npx',
      args: [
        '-y',
        '--package=task-master-ai',
        'task-master-ai'
      ],
      env: {}
    };

    // Use Anthropic API key from earlier prompt or environment
    const apiKey = getEnvValue('ANTHROPIC_API_KEY', env);
    if (apiKey) {
      personalConfig.env.ANTHROPIC_API_KEY = apiKey;
      
      // Create personal env config for taskmaster
      personalConfig.mcpServers['task-master-ai'] = {
        env: {
          ANTHROPIC_API_KEY: apiKey
        }
      };
    }
  }

  // Configure fetch
  if (selectedServers.includes('fetch')) {
    serverConfigs.fetch = {
      command: 'uvx',
      args: ['mcp-server-fetch']
    };
  }

  // Configure StackOverflow MCP
  if (selectedServers.includes('stackoverflow')) {
    // Add NPM package via npx
    serverConfigs.stackoverflow = {
      command: 'npx',
      args: [
        '-y',
        'stackoverflow-mcp-server'
      ],
      env: {}
    };

    // Ask for StackExchange API key (optional)
    if (!nonInteractive) {
      const stackApiKey = await password({
        message: 'Enter your StackExchange API key (optional, press Enter to skip):',
      });

      if (stackApiKey && stackApiKey.trim()) {
        personalConfig.env.STACKEXCHANGE_API_KEY = stackApiKey.trim();

        // Add environment variable to server config
        serverConfigs.stackoverflow.env = {
          STACKEXCHANGE_API_KEY: '${STACKEXCHANGE_API_KEY}'
        };
      }
    } else {
      // In non-interactive mode, try to get from environment
      const apiKey = getEnvValue('STACKEXCHANGE_API_KEY', env);
      if (apiKey) {
        personalConfig.env.STACKEXCHANGE_API_KEY = apiKey;

        // Add environment variable to server config
        serverConfigs.stackoverflow.env = {
          STACKEXCHANGE_API_KEY: '${STACKEXCHANGE_API_KEY}'
        };
      }
    }
  }

  // Configure Command Shell MCP
  if (selectedServers.includes('command-shell')) {
    // Add NPM package via npx
    serverConfigs['command-shell'] = {
      command: 'npx',
      args: [
        '-y',
        'command-shell-mcp-server'
      ],
      env: {}
    };

    // Configure security settings
    if (!nonInteractive) {
      printWarning('⚠️  SECURITY WARNING: The Command Shell MCP allows AI assistants to execute shell commands.');
      printWarning('⚠️  Only enable this MCP if you trust the AI assistant and understand the security implications.');

      const enableMCP = await confirm({
        message: 'Are you sure you want to enable the Command Shell MCP?',
        default: false
      });

      if (!enableMCP) {
        delete serverConfigs['command-shell'];
        const index = selectedServers.indexOf('command-shell');
        if (index !== -1) {
          selectedServers.splice(index, 1);
        }
        printInfo('Command Shell MCP has been disabled.');
      } else {
        // Get allowed commands
        const allowedCommandsInput = await input({
          message: 'Enter allowed shell commands (comma-separated, empty for all non-blocked commands):',
          default: ''
        });

        const allowedCommands = allowedCommandsInput.split(',')
          .map(cmd => cmd.trim())
          .filter(Boolean);

        // Get blocked commands
        const blockedCommandsInput = await input({
          message: 'Enter blocked shell commands (comma-separated):',
          default: 'rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown'
        });

        const blockedCommands = blockedCommandsInput.split(',')
          .map(cmd => cmd.trim())
          .filter(Boolean);

        // Get command timeout
        const timeout = await input({
          message: 'Enter command execution timeout (in milliseconds):',
          default: '5000'
        });

        // Save to personal config for local override
        personalConfig.commandShellConfig = {
          allowedCommands,
          blockedCommands,
          timeoutMs: parseInt(timeout, 10)
        };

        // Add environment variables to server config
        serverConfigs['command-shell'].env = {
          ALLOWED_COMMANDS: allowedCommands.length > 0 ? allowedCommands.join(',') : '',
          BLOCKED_COMMANDS: blockedCommands.join(','),
          COMMAND_TIMEOUT_MS: timeout
        };
      }
    } else {
      // In non-interactive mode, use defaults or environment variables
      const allowedCommands = getEnvValue('ALLOWED_COMMANDS', env, '').split(',').filter(Boolean);
      const blockedCommands = getEnvValue('BLOCKED_COMMANDS', env, 'rm,sudo,chmod,chown,dd,mkfs,mount,umount,reboot,shutdown').split(',').filter(Boolean);
      const timeout = getEnvValue('COMMAND_TIMEOUT_MS', env, '5000');

      // Add environment variables to server config
      serverConfigs['command-shell'].env = {
        ALLOWED_COMMANDS: allowedCommands.join(','),
        BLOCKED_COMMANDS: blockedCommands.join(','),
        COMMAND_TIMEOUT_MS: timeout
      };

      // Save to personal config for local override
      personalConfig.commandShellConfig = {
        allowedCommands,
        blockedCommands,
        timeoutMs: parseInt(timeout, 10)
      };
    }
  }

  // Set MCP configuration directly
  mcpConfig.mcpServers = { ...serverConfigs };

  await safeWriteJson(mcpPath, mcpConfig, dryRun);
  printSuccess('MCP servers configured.');
  
  // Create local override file
  const createLocalOverride = nonInteractive ? false : await confirm({
    message: 'Create local MCP override file (for personal configurations)?',
    default: true
  });

  if (createLocalOverride) {
    const mcpLocalPath = path.join(projectRoot, '.mcp.json.local');
    const mcpLocalExists = await fileExists(mcpLocalPath);

    if (!mcpLocalExists || options.forceOverwrite) {
      // Clone the main MCP config structure for local override
      const localConfig = {
        mcpServers: JSON.parse(JSON.stringify(mcpConfig.mcpServers)) // Deep clone
      };

      // For GitHub server, add personal token to env
      if (selectedServers.includes('github') && personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        if (!localConfig.mcpServers.github) {
          localConfig.mcpServers.github = {
            command: 'docker',
            args: [
              'run',
              '-i',
              '--rm',
              '-e',
              'GITHUB_PERSONAL_ACCESS_TOKEN',
              'ghcr.io/github/github-mcp-server'
            ],
            env: {}
          };
        }
        localConfig.mcpServers.github.env = localConfig.mcpServers.github.env || {};
        localConfig.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN = personalConfig.env.GITHUB_PERSONAL_ACCESS_TOKEN;
      }

      // For Context7, set the API key directly in env
      if (selectedServers.includes('context7') && personalConfig.env.CONTEXT7_API_KEY) {
        if (localConfig.mcpServers['context7-mcp']) {
          localConfig.mcpServers['context7-mcp'].env = localConfig.mcpServers['context7-mcp'].env || {};
          localConfig.mcpServers['context7-mcp'].env.CONTEXT7_API_KEY = personalConfig.env.CONTEXT7_API_KEY;
        }
      }

      // For Memory MCP, update the path
      if (selectedServers.includes('memory') && personalConfig.env.MEMORY_PATH) {
        if (localConfig.mcpServers.memory) {
          const args = localConfig.mcpServers.memory.args;
          const pathIndex = args.indexOf('--memory-path');
          if (pathIndex >= 0 && pathIndex < args.length - 1) {
            args[pathIndex + 1] = personalConfig.env.MEMORY_PATH;
          }
        }
      }

      // For Task-Master-AI, set the Anthropic API key
      if (selectedServers.includes('taskmaster-ai') && personalConfig.env.ANTHROPIC_API_KEY) {
        if (!localConfig.mcpServers['task-master-ai']) {
          localConfig.mcpServers['task-master-ai'] = {
            command: 'npx',
            args: [
              '-y',
              '--package=task-master-ai',
              'task-master-ai'
            ],
            env: {}
          };
        }
        localConfig.mcpServers['task-master-ai'].env = localConfig.mcpServers['task-master-ai'].env || {};
        localConfig.mcpServers['task-master-ai'].env.ANTHROPIC_API_KEY = personalConfig.env.ANTHROPIC_API_KEY;
      }

      // For StackOverflow MCP, set the StackExchange API key
      if (selectedServers.includes('stackoverflow') && personalConfig.env.STACKEXCHANGE_API_KEY) {
        if (!localConfig.mcpServers['stackoverflow']) {
          localConfig.mcpServers['stackoverflow'] = {
            command: 'npx',
            args: [
              '-y',
              'stackoverflow-mcp-server'
            ],
            env: {}
          };
        }
        localConfig.mcpServers['stackoverflow'].env = localConfig.mcpServers['stackoverflow'].env || {};
        localConfig.mcpServers['stackoverflow'].env.STACKEXCHANGE_API_KEY = personalConfig.env.STACKEXCHANGE_API_KEY;
      }

      // For Command Shell MCP, set the configuration
      if (selectedServers.includes('command-shell') && personalConfig.commandShellConfig) {
        if (!localConfig.mcpServers['command-shell']) {
          localConfig.mcpServers['command-shell'] = {
            command: 'npx',
            args: [
              '-y',
              'command-shell-mcp-server'
            ],
            env: {}
          };
        }

        const { allowedCommands, blockedCommands, timeoutMs } = personalConfig.commandShellConfig;

        localConfig.mcpServers['command-shell'].env = localConfig.mcpServers['command-shell'].env || {};
        localConfig.mcpServers['command-shell'].env.ALLOWED_COMMANDS = allowedCommands.length > 0 ? allowedCommands.join(',') : '';
        localConfig.mcpServers['command-shell'].env.BLOCKED_COMMANDS = blockedCommands.join(',');
        localConfig.mcpServers['command-shell'].env.COMMAND_TIMEOUT_MS = timeoutMs.toString();
      }

      // Save .env file with environment variables
      if (!dryRun && Object.keys(personalConfig.env).length > 0) {
        await saveEnvironmentVars(projectRoot, personalConfig.env, dryRun);
        printSuccess('Created .env file with personal configuration.');
      }

      await safeWriteJson(mcpLocalPath, localConfig, dryRun);
      printSuccess('Created local MCP override file with personal configuration.');
    } else {
      printInfo('Local MCP override file already exists. Skipping creation.');
    }
  }
  
  return {
    config: mcpConfig,
    env: personalConfig.env,
    selectedServers
  };
}

export default {
  setupMcpConfig
};