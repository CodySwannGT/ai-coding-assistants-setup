/**
 * Config Index
 *
 * Export all configuration modules from a single entry point.
 */

import Paths from './paths';
import Environment from './environment';
import McpSchema from './mcp-config-schema';

// Re-export all exports from modules
export * from './paths';
export * from './environment';
export * from './mcp-config-schema';

// Export as a combined default object
export default {
  ...Paths,
  ...Environment,
  ...McpSchema
};