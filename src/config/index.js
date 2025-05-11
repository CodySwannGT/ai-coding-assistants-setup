/**
 * Config Index
 *
 * Export all configuration modules from a single entry point.
 */

export * from './paths.js';
export * from './environment.js';
export * from './mcp-config-schema.js';

import paths from './paths.js';
import environment from './environment.js';
import mcpConfigSchema from './mcp-config-schema.js';

export default {
  ...paths,
  ...environment,
  ...mcpConfigSchema
};