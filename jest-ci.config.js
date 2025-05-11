// jest-ci.config.js
/** @type {import('jest').Config} */
export default {
  // Use Node.js environment for running tests
  testEnvironment: 'node',
  // Look for test files with these patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  // Setup files to run before tests
  setupFilesAfterEnv: ['./tests/jest-setup.js'],
  // Transform ES modules - experimental
  transform: {},
  // Required for ESM - maps imports without extension to .js files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Don't watch node_modules
  watchPathIgnorePatterns: [
    '/node_modules/'
  ],
  // Create coverage reports
  collectCoverage: false,
  // Disable test coverage for CI to focus on passing tests
  testTimeout: 30000, // Increase timeout for CI environment
  // Skip tests that require actual filesystem access
  testPathIgnorePatterns: []
};