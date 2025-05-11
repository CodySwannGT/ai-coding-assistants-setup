/**
 * Logger Utils
 * 
 * Provides formatted logging functions for the CLI.
 */

import chalk from 'chalk';
import winston from 'winston';

// Logger instance
let logger;

/**
 * Initialize the logger
 * @param {Object} options Logger options
 * @param {string} [options.logsPath] Path to logs directory
 * @param {boolean} [options.dryRun=false] Whether running in dry-run mode
 * @param {number} [options.verbose=1] Verbosity level
 * @returns {winston.Logger} Logger instance
 */
export function initLogger(options = {}) {
  const { logsPath, dryRun = false, verbose = 1 } = options;
  
  // Create logger
  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
      })
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
  
  // Add file transport if logs path is provided
  if (logsPath && !dryRun) {
    logger.add(
      new winston.transports.File({
        filename: logsPath,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }
  
  return logger;
}

/**
 * Print a styled header
 * @param {string} text Header text
 * @param {number} [verbose=1] Verbosity level
 */
export function printHeader(text, verbose = 1) {
  if (verbose >= 1) {
    console.log('\n' + chalk.bold.blue('='.repeat(80)));
    console.log(chalk.bold.blue(`  ${text}`));
    console.log(chalk.bold.blue('='.repeat(80)) + '\n');
  }
  
  if (logger) {
    logger.info(`[HEADER] ${text}`);
  }
}

/**
 * Print a success message
 * @param {string} text Success message
 * @param {number} [verbose=1] Verbosity level
 */
export function printSuccess(text, verbose = 1) {
  if (verbose >= 1) {
    console.log(chalk.green('✓ ') + text);
  }
  
  if (logger) {
    logger.info(`[SUCCESS] ${text}`);
  }
}

/**
 * Print an error message
 * @param {string} text Error message
 */
export function printError(text) {
  console.error(chalk.red('✗ ') + text);
  
  if (logger) {
    logger.error(`[ERROR] ${text}`);
  }
}

/**
 * Print a warning message
 * @param {string} text Warning message
 * @param {number} [verbose=1] Verbosity level
 */
export function printWarning(text, verbose = 1) {
  if (verbose >= 1) {
    console.warn(chalk.yellow('⚠ ') + text);
  }
  
  if (logger) {
    logger.warn(`[WARNING] ${text}`);
  }
}

/**
 * Print info message
 * @param {string} text Info message
 * @param {number} [verbose=1] Verbosity level
 */
export function printInfo(text, verbose = 1) {
  if (verbose >= 1) {
    console.log(chalk.blue('ℹ ') + text);
  }
  
  if (logger) {
    logger.info(`[INFO] ${text}`);
  }
}

/**
 * Print debug message (only in debug mode)
 * @param {string} text Debug message
 * @param {number} [verbose=3] Verbosity level
 */
export function printDebug(text, verbose = 3) {
  if (verbose >= 3) {
    console.log(chalk.gray('🔍 ') + text);
  }
  
  if (logger) {
    logger.debug(`[DEBUG] ${text}`);
  }
}

export default {
  initLogger,
  printHeader,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printDebug
};