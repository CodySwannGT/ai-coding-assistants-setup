import configExports, {
  // Paths exports
  getClaudeConfigPath,
  getVSCodeUserConfigPath,
  getProjectPaths,
  // Environment exports
  loadEnvironmentVars,
  saveEnvironmentVars,
  getEnvValue,
  // MCP Schema exports
  validateMcpConfig,
  getDefaultStackOverflowMcpConfig,
} from '../src/config';

describe('Config Index', () => {
  it('should export all path utilities', () => {
    expect(configExports).toHaveProperty('getClaudeConfigPath');
    expect(configExports).toHaveProperty('getVSCodeUserConfigPath');
    expect(configExports).toHaveProperty('getVSCodeExtensionsPath');
    expect(configExports).toHaveProperty('getProjectPaths');
    expect(configExports).toHaveProperty('isWindows');
    expect(configExports).toHaveProperty('isMac');
    expect(configExports).toHaveProperty('isLinux');
  });

  it('should export all environment utilities', () => {
    expect(configExports).toHaveProperty('loadEnvironmentVars');
    expect(configExports).toHaveProperty('saveEnvironmentVars');
    expect(configExports).toHaveProperty('getEnvValue');
  });

  it('should export all MCP schema utilities', () => {
    expect(configExports).toHaveProperty('validateMcpConfig');
    expect(configExports).toHaveProperty('getDefaultStackOverflowMcpConfig');
    expect(configExports).toHaveProperty('getDefaultBraveSearchMcpConfig');
    expect(configExports).toHaveProperty('getDefaultCommandShellMcpConfig');
    expect(configExports).toHaveProperty('getSchemaDefinition');
  });

  it('should export named exports for individual imports', () => {
    expect(getClaudeConfigPath).toBeDefined();
    expect(getVSCodeUserConfigPath).toBeDefined();
    expect(getProjectPaths).toBeDefined();
    expect(loadEnvironmentVars).toBeDefined();
    expect(saveEnvironmentVars).toBeDefined();
    expect(getEnvValue).toBeDefined();
    expect(validateMcpConfig).toBeDefined();
    expect(getDefaultStackOverflowMcpConfig).toBeDefined();
  });
});
