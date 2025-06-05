import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { 
  updatePackageScripts, 
  getExistingScripts, 
  hasAllRequiredScripts,
  type ScriptUpdateResult 
} from '../src/utils/package-scripts';

describe('Package Scripts Management', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-scripts-test-'));
  });
  
  afterEach(async () => {
    // Clean up
    await fs.remove(tempDir);
  });
  
  describe('updatePackageScripts', () => {
    it('should handle missing package.json gracefully', async () => {
      const result = await updatePackageScripts(tempDir);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No package.json found');
      expect(result.addedScripts).toHaveLength(0);
      expect(result.skippedScripts).toHaveLength(0);
    });
    
    it('should handle invalid JSON in package.json', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{ invalid json }');
      
      const result = await updatePackageScripts(tempDir);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON in package.json');
    });
    
    it('should create scripts section if missing', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0'
      };
      await fs.writeJson(path.join(tempDir, 'package.json'), pkg);
      
      const result = await updatePackageScripts(tempDir);
      
      expect(result.success).toBe(true);
      expect(result.addedScripts).toHaveLength(8);
      expect(result.skippedScripts).toHaveLength(0);
      
      const updatedPkg = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(updatedPkg.scripts).toBeDefined();
      expect(updatedPkg.scripts.lint).toBe('echo "lint not configured yet"');
    });
    
    it('should add only missing scripts', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          'test': 'jest',
          'build': 'tsc',
          'custom': 'my-custom-script'
        }
      };
      await fs.writeJson(path.join(tempDir, 'package.json'), pkg);
      
      const result = await updatePackageScripts(tempDir);
      
      expect(result.success).toBe(true);
      expect(result.addedScripts).toContain('lint');
      expect(result.addedScripts).toContain('typecheck');
      expect(result.addedScripts).not.toContain('test');
      expect(result.addedScripts).not.toContain('build');
      expect(result.skippedScripts).toContain('test');
      expect(result.skippedScripts).toContain('build');
      
      const updatedPkg = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(updatedPkg.scripts.test).toBe('jest'); // Original preserved
      expect(updatedPkg.scripts.build).toBe('tsc'); // Original preserved
      expect(updatedPkg.scripts.custom).toBe('my-custom-script'); // Custom preserved
      expect(updatedPkg.scripts.lint).toBe('echo "lint not configured yet"'); // Added
    });
    
    it('should not modify package.json if all scripts exist', async () => {
      const pkg = {
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          'lint': 'eslint .',
          'typecheck': 'tsc --noEmit',
          'format:check': 'prettier --check .',
          'build': 'webpack',
          'test': 'jest',
          'test:unit': 'jest unit',
          'test:integration': 'jest integration',
          'test:e2e': 'cypress run'
        }
      };
      await fs.writeJson(path.join(tempDir, 'package.json'), pkg);
      const originalContent = await fs.readFile(path.join(tempDir, 'package.json'), 'utf8');
      
      const result = await updatePackageScripts(tempDir);
      
      expect(result.success).toBe(true);
      expect(result.addedScripts).toHaveLength(0);
      expect(result.skippedScripts).toHaveLength(8);
      
      // Verify file wasn't modified
      const updatedPkg = await fs.readJson(path.join(tempDir, 'package.json'));
      expect(updatedPkg.scripts).toEqual(pkg.scripts);
    });
    
    it('should preserve JSON formatting (2 spaces)', async () => {
      const pkg = { name: 'test', version: '1.0.0' };
      const formatted = JSON.stringify(pkg, null, 2) + '\n';
      await fs.writeFile(path.join(tempDir, 'package.json'), formatted);
      
      await updatePackageScripts(tempDir);
      
      const updated = await fs.readFile(path.join(tempDir, 'package.json'), 'utf8');
      expect(updated).toMatch(/^  "name"/m); // 2 space indent
    });
    
    it('should preserve JSON formatting (4 spaces)', async () => {
      const pkg = { name: 'test', version: '1.0.0' };
      const formatted = JSON.stringify(pkg, null, 4) + '\n';
      await fs.writeFile(path.join(tempDir, 'package.json'), formatted);
      
      await updatePackageScripts(tempDir);
      
      const updated = await fs.readFile(path.join(tempDir, 'package.json'), 'utf8');
      expect(updated).toMatch(/^    "name"/m); // 4 space indent
    });
  });
  
  describe('getExistingScripts', () => {
    it('should return null if package.json does not exist', async () => {
      const scripts = await getExistingScripts(tempDir);
      expect(scripts).toBeNull();
    });
    
    it('should return empty object if no scripts section', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        version: '1.0.0'
      });
      
      const scripts = await getExistingScripts(tempDir);
      expect(scripts).toEqual({});
    });
    
    it('should return existing scripts', async () => {
      const expectedScripts = {
        test: 'jest',
        build: 'tsc'
      };
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: expectedScripts
      });
      
      const scripts = await getExistingScripts(tempDir);
      expect(scripts).toEqual(expectedScripts);
    });
  });
  
  describe('hasAllRequiredScripts', () => {
    it('should return false if package.json does not exist', async () => {
      const result = await hasAllRequiredScripts(tempDir);
      expect(result).toBe(false);
    });
    
    it('should return false if some scripts are missing', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: {
          test: 'jest',
          build: 'tsc'
        }
      });
      
      const result = await hasAllRequiredScripts(tempDir);
      expect(result).toBe(false);
    });
    
    it('should return true if all required scripts exist', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), {
        name: 'test',
        scripts: {
          'lint': 'eslint',
          'typecheck': 'tsc',
          'format:check': 'prettier',
          'build': 'webpack',
          'test': 'jest',
          'test:unit': 'jest unit',
          'test:integration': 'jest int',
          'test:e2e': 'cypress'
        }
      });
      
      const result = await hasAllRequiredScripts(tempDir);
      expect(result).toBe(true);
    });
  });
});