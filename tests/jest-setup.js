// Configure Jest for ES Modules
import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';

// Make jest available globally for tests
global.jest = jest;

// Setup global temp directory for tests
beforeAll(async () => {
  // Create temp directory for tests
  const tempDir = path.join(process.cwd(), 'tmp');
  await fs.ensureDir(tempDir);
});

// Clean up after all tests
afterAll(async () => {
  // Clean up temp directory
  const tempDir = path.join(process.cwd(), 'tmp');
  try {
    await fs.remove(tempDir);
  } catch (err) {
    console.warn(`Failed to clean up temp directory: ${err.message}`);
  }
});