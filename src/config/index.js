/**
 * Config Index
 * 
 * Export all configuration modules from a single entry point.
 */

export * from './paths.js';
export * from './environment.js';

import paths from './paths.js';
import environment from './environment.js';

export default {
  ...paths,
  ...environment
};