import fs from 'fs-extra';
import path from 'path';
import { getEnvValue, loadEnvironmentVars, saveEnvironmentVars } from '../src/config/environment';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../src/utils/feedback');

describe('Environment', () => {
  const mockProjectRoot = '/test/project';
  const mockEnvPath = path.join(mockProjectRoot, '.env');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('loadEnvironmentVars', () => {
    it('should return empty object if .env file does not exist', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);
      
      const result = await loadEnvironmentVars(mockProjectRoot);
      
      expect(result).toEqual({});
      expect(fs.pathExists).toHaveBeenCalledWith(mockEnvPath);
    });
    
    it('should parse environment variables from .env file', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(
        'API_KEY=test-key\n' +
        'DEBUG=true\n' +
        '# This is a comment\n' +
        '\n' +
        'PORT=3000'
      );
      
      const result = await loadEnvironmentVars(mockProjectRoot);
      
      expect(result).toEqual({
        API_KEY: 'test-key',
        DEBUG: 'true',
        PORT: '3000'
      });
      expect(fs.readFile).toHaveBeenCalledWith(mockEnvPath, 'utf8');
    });
    
    it('should handle read errors gracefully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));
      
      const result = await loadEnvironmentVars(mockProjectRoot);
      
      expect(result).toEqual({});
    });
  });
  
  describe('saveEnvironmentVars', () => {
    it('should write environment variables to .env file', async () => {
      const env = {
        API_KEY: 'test-key',
        DEBUG: 'true',
        PORT: '3000'
      };
      
      await saveEnvironmentVars(mockProjectRoot, env);
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockEnvPath,
        expect.stringContaining('API_KEY=test-key'),
        'utf8'
      );
    });
    
    it('should not write if dryRun is true', async () => {
      const env = {
        API_KEY: 'test-key'
      };
      
      await saveEnvironmentVars(mockProjectRoot, env, true);
      
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
    
   
  });
  
  describe('getEnvValue', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      process.env = { ...originalEnv, TEST_ENV: 'process-value' };
    });
    
    afterEach(() => {
      process.env = originalEnv;
    });
    
    it('should return value from loaded env if present', () => {
      const env = {
        TEST_KEY: 'env-value'
      };
      
      const result = getEnvValue('TEST_KEY', env);
      
      expect(result).toBe('env-value');
    });
    
    it('should return value from process.env if not in loaded env', () => {
      const env = {};
      
      const result = getEnvValue('TEST_ENV', env);
      
      expect(result).toBe('process-value');
    });
    
    it('should return default value if not in loaded env or process.env', () => {
      const env = {};
      
      const result = getEnvValue('MISSING_KEY', env, 'default-value');
      
      expect(result).toBe('default-value');
    });
    
    it('should return empty string as default if not provided', () => {
      const env = {};
      
      const result = getEnvValue('MISSING_KEY', env);
      
      expect(result).toBe('');
    });
  });
});