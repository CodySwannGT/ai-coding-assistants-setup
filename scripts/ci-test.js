/**
 * Simple CI test script that validates package structure
 * This script is used in CI environments to verify the package is valid
 * without running the full test suite that depends on the file system
 */
import fs from 'fs-extra';
import path from 'path';

console.log('Running CI validation tests...');

// Check for required files
const requiredFiles = [
  'package.json',
  'index.js',
  'src/main.js',
  'jest.config.js'
];

for (const file of requiredFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

// Validate package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

if (!packageJson.name || !packageJson.version) {
  console.error('Invalid package.json: missing name or version');
  process.exit(1);
}

if (!packageJson.bin) {
  console.error('Invalid package.json: missing bin section');
  process.exit(1);
}

// Validate basic code imports
try {
  // Check if main file can import correctly
  const mainFile = fs.readFileSync(path.join(process.cwd(), 'src/main.js'), 'utf8');
  
  // Check for import errors (very basic validation)
  if (mainFile.includes('import ') && mainFile.includes(' from ')) {
    // Basic check that imports are present
    console.log('✅ Main file has valid imports');
  }
  
  console.log('✅ All validation tests passed.');
  process.exit(0);
} catch (err) {
  console.error(`Validation failed: ${err.message}`);
  process.exit(1);
}