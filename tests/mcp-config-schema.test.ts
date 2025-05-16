import { 
  validateMcpConfig, 
  getDefaultStackOverflowMcpConfig, 
  getDefaultBraveSearchMcpConfig, 
  getDefaultCommandShellMcpConfig,
  getSchemaDefinition
} from '../src/config/mcp-config-schema';
import configSchemaJson from '../src/config/config-schema.json';

// Mock dependencies
jest.mock('../src/utils/feedback');

describe('MCP Config Schema', () => {
  describe('validateMcpConfig', () => {
    it('should validate a valid MCP config', () => {
      const validConfig = {
        mcpServers: {
          stackoverflow: {
            command: 'npx',
            args: ['-y', 'stackoverflow-mcp-server'],
            env: {
              MAX_SEARCH_RESULTS: '5'
            }
          }
        }
      };
      
      const result = validateMcpConfig(validConfig);
      
      expect(result).toBe(true);
    });
    
    it('should reject an invalid MCP config', () => {
      const invalidConfig = {
        mcpServers: {
          invalid: {
            // Missing required 'command' and 'args'
            env: {
              SOME_VAR: 'value'
            }
          }
        }
      };
      
      const result = validateMcpConfig(invalidConfig);
      
      expect(result).toBe(false);
    });
    
    it('should validate a config with multiple MCP servers', () => {
      const multiServerConfig = {
        mcpServers: {
          stackoverflow: getDefaultStackOverflowMcpConfig(),
          braveSearch: getDefaultBraveSearchMcpConfig(),
          commandShell: getDefaultCommandShellMcpConfig()
        }
      };
      
      const result = validateMcpConfig(multiServerConfig);
      
      expect(result).toBe(true);
    });
  });
  
  describe('getDefaultStackOverflowMcpConfig', () => {
    it('should return a valid StackOverflow MCP config', () => {
      const config = getDefaultStackOverflowMcpConfig();
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('stackoverflow-mcp-server');
      expect(config.env).toHaveProperty('MAX_SEARCH_RESULTS');
      expect(config.env).toHaveProperty('SEARCH_TIMEOUT_MS');
    });
    
    it('should conform to the schema', () => {
      const config = getDefaultStackOverflowMcpConfig();
      const wrapper = {
        mcpServers: {
          stackoverflow: config
        }
      };
      
      const result = validateMcpConfig(wrapper);
      
      expect(result).toBe(true);
    });
  });
  
  describe('getDefaultBraveSearchMcpConfig', () => {
    it('should return a valid Brave Search MCP config', () => {
      const config = getDefaultBraveSearchMcpConfig();
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('brave-search-mcp-server');
      expect(config.env).toHaveProperty('BRAVE_API_KEY');
    });
    
    it('should have the proper environment template variable', () => {
      const config = getDefaultBraveSearchMcpConfig();
      
      expect(config.env.BRAVE_API_KEY).toBe('${BRAVE_API_KEY}');
    });
  });
  
  describe('getDefaultCommandShellMcpConfig', () => {
    it('should return a valid Command Shell MCP config', () => {
      const config = getDefaultCommandShellMcpConfig();
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('command-shell-mcp-server');
      expect(config.env).toHaveProperty('BLOCKED_COMMANDS');
      expect(config.env).toHaveProperty('COMMAND_TIMEOUT_MS');
    });
    
    it('should have security-conscious default settings', () => {
      const config = getDefaultCommandShellMcpConfig();
      
      expect(config.env?.BLOCKED_COMMANDS).toContain('rm');
      expect(config.env?.BLOCKED_COMMANDS).toContain('sudo');
      expect(config.env?.ENABLE_ENVIRONMENT_VARIABLES).toBe('false');
    });
  });
  
  describe('getSchemaDefinition', () => {
    it('should return the requested schema definition', () => {
      const schema = getSchemaDefinition('mcpServer');
      
      expect(schema).toEqual(configSchemaJson.definitions.mcpServer);
    });
    
    it('should return undefined for unknown schema', () => {
      const schema = getSchemaDefinition('nonExistentSchema');
      
      expect(schema).toBeUndefined();
    });
  });
});