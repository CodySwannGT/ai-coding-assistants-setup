#!/usr/bin/env node --no-warnings

/**
 * AI Coding Assistants Setup Script
 * =================================
 * 
 * This script automates the setup and configuration of AI coding assistants
 * (Claude Code and Roo Code) within VS Code for JavaScript projects.
 * 
 * Features:
 * - Automatic project structure detection
 * - Configuration of Claude Code and Roo Code
 * - MCP server setup and synchronization
 * - Ignore file management
 * - Custom mode configuration for Roo Code
 * - VS Code settings optimization
 * - Secure credential management
 * 
 * @author Cody Swann
 * @license MIT
 */

import main from './src/main.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Check if we're being called to run a hook
if (process.argv.includes('claude-hook-runner')) {
  // Get path to hook-runner.js
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const hookRunnerPath = path.join(__dirname, 'src', 'hooks', 'hook-runner.js');
  
  // Extract hook arguments - everything after "claude-hook-runner"
  const hookIndex = process.argv.indexOf('claude-hook-runner');
  const hookArgs = process.argv.slice(hookIndex + 1);
  
  // Log that we're executing the hook directly
  console.log(`Running hook directly: ${hookArgs.join(' ')}`);
  
  // Execute hook-runner directly with the arguments
  const child = spawn('node', [hookRunnerPath, ...hookArgs], { 
    stdio: 'inherit',
    shell: false
  });
  
  // Handle the exit code properly
  child.on('exit', code => process.exit(code || 0));
} else {
  // Run the normal setup wizard
  main();
}