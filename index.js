#!/usr/bin/env node

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

// Run the main function
main();