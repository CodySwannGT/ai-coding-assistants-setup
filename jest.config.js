// jest.config.js
export default {
  // Use ESM for Jest
  type: 'module',
  // Use Node.js environment for running tests
  testEnvironment: 'node',
  // Look for test files with these patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  // Transform ES modules
  transform: {},
  // Use experimental VM modules (needed for ESM support)
  experimentalVmModule: true,
  // Don't watch node_modules
  watchPathIgnorePatterns: [
    '/node_modules/'
  ],
  // Create coverage reports
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/hooks/**'
  ],
  // Configure coverage reporting
  coverageReporters: ['text', 'lcov'],
  // Mock files and modules
  moduleNameMapper: {
    // Add any module mocks here if needed
  }
};