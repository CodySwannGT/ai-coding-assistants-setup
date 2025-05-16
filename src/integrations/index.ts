/**
 * Integrations Index
 * 
 * Export all integration modules from a single entry point.
 */

import ClaudeVerification from './claude-verification';
import DiffExplain from './diff-explain';

// Re-export all exports from modules
export * from './claude-verification';
export * from './diff-explain';

// Export as a combined default object
export default {
  ClaudeVerification,
  DiffExplain
};