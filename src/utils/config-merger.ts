/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ConfigMerger - Advanced configuration file merging utility
 *
 * This utility extends the base FileMerger to provide specialized merging
 * for configuration files (JSON, YAML, etc.) with intelligent conflict resolution.
 */

import Ajv from 'ajv';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { createInterface } from 'readline';
import { Feedback } from './feedback';
import { FileMerger, MergeOption } from './file-merger';

/**
 * Configuration file types supported for intelligent merging
 */
export enum ConfigFileType {
  JSON = 'json',
  YAML = 'yaml',
  INI = 'ini',
  ENV = 'env',
  UNKNOWN = 'unknown',
}

/**
 * Conflict resolution strategies
 */
export enum ConflictStrategy {
  USE_SOURCE = 'use-source',
  USE_TARGET = 'use-target',
}

/**
 * Options for configuration merging
 */
export interface ConfigMergeOptions {
  // Whether to run in interactive mode (prompt user for conflict resolution)
  interactive?: boolean;

  // Default conflict strategy when not in interactive mode
  defaultStrategy?: ConflictStrategy;

  // Default merge option for non-config files
  defaultMergeOption?: MergeOption;

  // Whether to enable verbose logging
  verbose?: boolean;
}

// Schema definitions for different config file types
const configSchemas = {
  [ConfigFileType.JSON]: {
    type: 'object',
    additionalProperties: true,
  },
  [ConfigFileType.YAML]: {
    type: 'object',
    additionalProperties: true,
  },
  [ConfigFileType.INI]: {
    type: 'object',
    additionalProperties: true,
  },
  [ConfigFileType.ENV]: {
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  },
};

// Initialize Ajv instance with security-focused options
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictSchema: true,
  strictNumbers: true,
  strictRequired: true,
});

// Compile schemas for each config type
const validators = {
  [ConfigFileType.JSON]: ajv.compile(configSchemas[ConfigFileType.JSON]),
  [ConfigFileType.YAML]: ajv.compile(configSchemas[ConfigFileType.YAML]),
  [ConfigFileType.INI]: ajv.compile(configSchemas[ConfigFileType.INI]),
  [ConfigFileType.ENV]: ajv.compile(configSchemas[ConfigFileType.ENV]),
};

/**
 * Validate and sanitize configuration data
 *
 * @param data Configuration data to validate
 * @param fileType Type of configuration file
 * @returns Sanitized data or null if validation fails
 */
function validateAndSanitizeConfig(data: any, fileType: ConfigFileType): any {
  // Skip validation for unknown file types
  if (fileType === ConfigFileType.UNKNOWN || !validators[fileType]) {
    return data;
  }

  // Validate against schema
  const validate = validators[fileType];
  const valid = validate(data);

  if (!valid) {
    Feedback.warning(
      `Config validation failed: ${JSON.stringify(validate.errors)}`
    );
    // Continue with sanitization despite validation errors
  }

  // Sanitize based on file type
  switch (fileType) {
    case ConfigFileType.JSON:
    case ConfigFileType.YAML:
      // For object-based configs, ensure we have a valid object
      return typeof data === 'object' && data !== null ? data : {};

    case ConfigFileType.ENV: {
      // For ENV files, ensure all values are strings
      if (typeof data !== 'object' || data === null) return {};

      const sanitized: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        // Convert all values to strings and sanitize
        sanitized[key] = String(value)
          .replace(/[^\w\s.,\-:;@#$%^&*()[\]{}+=|\\/<>?!]/g, '') // Remove potentially dangerous characters
          .trim();
      }
      return sanitized;
    }

    case ConfigFileType.INI: {
      // For INI files, ensure sections are objects and values are sanitized
      if (typeof data !== 'object' || data === null) return {};

      const sanitizedIni: Record<string, any> = {};
      for (const [section, sectionData] of Object.entries(data)) {
        if (typeof sectionData === 'object' && sectionData !== null) {
          sanitizedIni[section] = {};
          for (const [key, value] of Object.entries(sectionData)) {
            // Sanitize section values
            sanitizedIni[section][key] = String(value)
              .replace(/[^\w\s.,\-:;@#$%^&*()[\]{}+=|\\/<>?!]/g, '')
              .trim();
          }
        } else if (typeof sectionData !== 'object') {
          // Handle top-level key-value pairs
          sanitizedIni[section] = String(sectionData)
            .replace(/[^\w\s.,\-:;@#$%^&*()[\]{}+=|\\/<>?!]/g, '')
            .trim();
        }
      }
      return sanitizedIni;
    }

    default:
      return data;
  }
}

/**
 * ConfigMerger utility for merging configuration files
 */
export class ConfigMerger {
  /**
   * Detect the type of configuration file based on extension
   *
   * @param filePath Path to the configuration file
   * @returns ConfigFileType
   */
  static detectFileType(filePath: string): ConfigFileType {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.json':
        return ConfigFileType.JSON;
      case '.yml':
      case '.yaml':
        return ConfigFileType.YAML;
      case '.ini':
      case '.conf':
        return ConfigFileType.INI;
      case '.env':
        return ConfigFileType.ENV;
      default:
        // Check for config files without standard extensions
        // eslint-disable-next-line no-case-declarations
        const basename = path.basename(filePath).toLowerCase();
        if (basename.includes('json')) return ConfigFileType.JSON;
        if (basename.includes('yaml') || basename.includes('yml'))
          return ConfigFileType.YAML;
        if (basename.includes('.env')) return ConfigFileType.ENV;
        if (basename.endsWith('rc')) {
          // Try to detect JSON format for rc files
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            JSON.parse(content);
            return ConfigFileType.JSON;
          } catch {
            // Not JSON
          }
        }
        return ConfigFileType.UNKNOWN;
    }
  }

  /**
   * Parse a configuration file based on its type
   *
   * @param filePath Path to the configuration file
   * @param fileType Type of the configuration file
   * @returns Parsed configuration or null if parsing failed
   */
  static parseConfigFile(filePath: string, fileType: ConfigFileType): any {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let parsedConfig: any;

      switch (fileType) {
        case ConfigFileType.JSON:
          // Parse JSON with try-catch for better error handling
          try {
            parsedConfig = JSON.parse(content);
            // Validate and sanitize the parsed JSON
            return validateAndSanitizeConfig(parsedConfig, fileType);
          } catch (jsonError) {
            Feedback.error(
              `Invalid JSON in ${filePath}: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
            );
            return null;
          }

        case ConfigFileType.YAML:
          // Using safeLoad instead of load for security (prevents custom YAML tag execution)
          parsedConfig = yaml.load(content, { schema: yaml.SAFE_SCHEMA });
          return validateAndSanitizeConfig(parsedConfig, fileType);

        case ConfigFileType.INI:
          parsedConfig = this.parseIniFile(content);
          return validateAndSanitizeConfig(parsedConfig, fileType);

        case ConfigFileType.ENV:
          parsedConfig = this.parseEnvFile(content);
          return validateAndSanitizeConfig(parsedConfig, fileType);

        default:
          return null;
      }
    } catch (error) {
      Feedback.error(
        `Failed to parse config file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Parse an INI file into an object
   *
   * @param content INI file content
   * @returns Parsed INI as object
   */
  private static parseIniFile(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    let currentSection = '';

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (
        trimmedLine.startsWith('#') ||
        trimmedLine.startsWith(';') ||
        trimmedLine === ''
      ) {
        continue;
      }

      // Section header
      const sectionMatch = trimmedLine.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        result[currentSection] = result[currentSection] || {};
        continue;
      }

      // Key-value pair
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();

        if (currentSection === '') {
          result[key] = value;
        } else {
          result[currentSection][key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Parse an .env file into an object
   *
   * @param content .env file content
   * @returns Parsed .env as object
   */
  private static parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith('#') || trimmedLine === '') {
        continue;
      }

      // Key-value pair
      const keyValueMatch = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        // Remove quotes if present
        let value = keyValueMatch[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Stringify configuration object based on file type
   *
   * @param config Configuration object
   * @param fileType Type of the configuration file
   * @returns Stringified configuration
   */
  static stringifyConfig(config: any, fileType: ConfigFileType): string {
    try {
      switch (fileType) {
        case ConfigFileType.JSON:
          return JSON.stringify(config, null, 2);

        case ConfigFileType.YAML:
          return yaml.dump(config);

        case ConfigFileType.INI:
          return this.stringifyIniFile(config);

        case ConfigFileType.ENV:
          return this.stringifyEnvFile(config);

        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to stringify config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stringify an object into INI format
   *
   * @param config Configuration object
   * @returns INI format string
   */
  private static stringifyIniFile(config: Record<string, any>): string {
    let result = '';

    // Add non-section key-value pairs first
    for (const [key, value] of Object.entries(config)) {
      if (typeof value !== 'object') {
        result += `${key}=${value}\n`;
      }
    }

    // Add sections
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null) {
        result += `\n[${key}]\n`;

        for (const [subKey, subValue] of Object.entries(value)) {
          result += `${subKey}=${subValue}\n`;
        }
      }
    }

    return result;
  }

  /**
   * Stringify an object into .env format
   *
   * @param config Configuration object
   * @returns .env format string
   */
  private static stringifyEnvFile(config: Record<string, string>): string {
    let result = '';

    for (const [key, value] of Object.entries(config)) {
      // Add quotes if the value contains spaces
      const formattedValue = value.includes(' ') ? `"${value}"` : value;
      result += `${key}=${formattedValue}\n`;
    }

    return result;
  }

  /**
   * Deep merge two objects with prototype pollution protection
   *
   * @param target Target object
   * @param source Source object
   * @returns Merged object
   */
  static deepMerge(target: any, source: any): any {
    // If source is not an object or is null, return source
    if (source === null || typeof source !== 'object') {
      return source;
    }

    // If target is not an object or is null, initialize as empty object or array
    if (target === null || typeof target !== 'object') {
      return Array.isArray(source) ? [...source] : { ...source };
    }

    // Handle arrays
    if (Array.isArray(source)) {
      if (!Array.isArray(target)) {
        return [...source];
      }

      // Merge arrays by concatenating and removing duplicates
      const merged = [...target];
      for (const item of source) {
        if (!merged.some(x => JSON.stringify(x) === JSON.stringify(item))) {
          merged.push(item);
        }
      }

      return merged;
    }

    // Handle objects
    const result = { ...target };

    // List of dangerous properties that could lead to prototype pollution
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];

    for (const key of Object.keys(source)) {
      // Skip dangerous properties to prevent prototype pollution
      if (dangerousProps.includes(key)) {
        Feedback.warning(`Skipping potentially dangerous property: ${key}`);
        continue;
      }

      // Recursively merge nested objects/arrays
      result[key] = this.deepMerge(target[key], source[key]);
    }

    return result;
  }

  /**
   * Prompt the user for conflict resolution strategy
   *
   * @param filePath Path to the file with conflict
   * @returns Selected conflict resolution strategy
   */
  private static async promptForStrategy(
    filePath: string
  ): Promise<ConflictStrategy> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise<ConflictStrategy>(resolve => {
      Feedback.warning(`Configuration conflict in file: ${filePath}`);
      rl.question(
        '❓ How would you like to resolve this conflict?\n' +
          '  [s] Use source file values (overwrite target)\n' +
          '  [t] Keep target file values (skip source)\n' +
          'Choose an option [s/t]: ',
        answer => {
          rl.close();

          switch (answer.toLowerCase()) {
            case 's':
              resolve(ConflictStrategy.USE_SOURCE);
              break;
            case 't':
              resolve(ConflictStrategy.USE_TARGET);
              break;
            case 'm':
            default:
              resolve(ConflictStrategy.USE_TARGET);
              break;
          }
        }
      );
    });
  }

  /**
   * Merge a configuration file
   *
   * @param sourcePath Source file path
   * @param targetPath Target file path
   * @param options Merge options
   * @returns Promise resolving to true if merge was successful
   */
  static async mergeConfigFile(
    sourcePath: string,
    targetPath: string,
    options: ConfigMergeOptions = {}
  ): Promise<boolean> {
    const {
      interactive = true,
      defaultStrategy = ConflictStrategy.USE_TARGET,
      defaultMergeOption = MergeOption.SKIP,
      verbose = false,
    } = options;

    try {
      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        Feedback.error(`Source file does not exist: ${sourcePath}`);
        return false;
      }

      // If target file doesn't exist, just copy it
      if (!fs.existsSync(targetPath)) {
        try {
          // Ensure target directory exists
          fs.mkdirpSync(path.dirname(targetPath));
          // Copy the file
          await fs.copyFile(sourcePath, targetPath);
          Feedback.success(`Created new configuration file: ${targetPath}`);
          return true;
        } catch (error) {
          Feedback.error(
            `Failed to copy configuration file to ${targetPath}: ${error instanceof Error ? error.message : String(error)}`
          );
          return false;
        }
      }

      // Detect file type
      const fileType = this.detectFileType(sourcePath);

      // If file type is unknown, use the regular FileMerger
      if (fileType === ConfigFileType.UNKNOWN) {
        if (verbose) {
          Feedback.info(
            `File type unknown, using standard file merger for: ${path.basename(sourcePath)}`
          );
        }
        return FileMerger.mergeFile(
          sourcePath,
          targetPath,
          defaultMergeOption,
          interactive
        );
      }

      // Parse source and target files
      const sourceConfig = this.parseConfigFile(sourcePath, fileType);
      const targetConfig = this.parseConfigFile(targetPath, fileType);

      // If either parse failed, use standard FileMerger
      if (sourceConfig === null || targetConfig === null) {
        if (verbose) {
          Feedback.info(
            `Failed to parse config files, using standard file merger for: ${path.basename(sourcePath)}`
          );
        }
        return FileMerger.mergeFile(
          sourcePath,
          targetPath,
          defaultMergeOption,
          interactive
        );
      }

      // Determine conflict resolution strategy
      let strategy = defaultStrategy;

      if (interactive) {
        strategy = await this.promptForStrategy(targetPath);
      }

      // Apply the selected strategy
      let resultConfig: any;

      switch (strategy) {
        case ConflictStrategy.USE_SOURCE:
          resultConfig = sourceConfig;
          Feedback.info(
            `Using source config for: ${path.basename(targetPath)}`
          );
          break;

        case ConflictStrategy.USE_TARGET:
          resultConfig = targetConfig;
          Feedback.info(
            `Keeping target config for: ${path.basename(targetPath)}`
          );
          break;
      }

      // Write the result atomically to prevent corrupted files
      const resultString = this.stringifyConfig(resultConfig, fileType);
      
      // Create a temporary file in the same directory
      const tempFile = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      try {
        // Write to temporary file first
        await fs.writeFile(tempFile, resultString);
        
        // Verify the file was written correctly
        const writtenContent = await fs.readFile(tempFile, 'utf8');
        if (writtenContent !== resultString) {
          throw new Error('File verification failed - content mismatch');
        }
        
        // Rename temp file to target (atomic operation on most file systems)
        await fs.rename(tempFile, targetPath);
        
        Feedback.success(
          `Successfully merged configuration file: ${path.basename(targetPath)}`
        );
        return true;
      } catch (error) {
        // Clean up temp file if something went wrong
        try {
          if (await fs.pathExists(tempFile)) {
            await fs.remove(tempFile);
          }
        } catch (cleanupError) {
          Feedback.warning(`Failed to clean up temporary file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
        
        throw error; // Rethrow the original error
      }
    } catch (error) {
      Feedback.error(
        `Error merging configuration file ${path.basename(sourcePath)}: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Merge multiple configuration files
   *
   * @param files Map of source to target file paths
   * @param options Configuration merge options
   * @returns Promise resolving to number of successfully merged files
   */
  static async mergeConfigFiles(
    files: Map<string, string>,
    options: ConfigMergeOptions = {}
  ): Promise<number> {
    const {
      interactive = true,
      defaultStrategy = ConflictStrategy.USE_TARGET,
      defaultMergeOption = MergeOption.SKIP,
      verbose = false,
    } = options;

    let successCount = 0;

    Feedback.section('Merging Configuration Files');

    for (const [sourcePath, targetPath] of files.entries()) {
      // Determine if this is a configuration file we should handle
      const fileType = this.detectFileType(sourcePath);
      let success: boolean;

      if (fileType !== ConfigFileType.UNKNOWN) {
        // Use specialized config merger for known config file types
        success = await this.mergeConfigFile(sourcePath, targetPath, {
          interactive,
          defaultStrategy,
          defaultMergeOption,
          verbose,
        });
      } else {
        // Use standard file merger for unknown file types
        success = await FileMerger.mergeFile(
          sourcePath,
          targetPath,
          defaultMergeOption,
          interactive
        );
      }

      if (success) {
        successCount++;
      }
    }

    Feedback.info(`Completed merging ${successCount} of ${files.size} files`);
    return successCount;
  }
}

export default ConfigMerger;
