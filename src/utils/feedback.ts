import chalk from 'chalk';

/**
 * Feedback utility for providing consistent, styled console messages
 * with appropriate emoji indicators
 */
export class Feedback {
  /**
   * Log a success message
   * @param message The message to display
   */
  static success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  /**
   * Log a warning message
   * @param message The message to display
   */
  static warning(message: string): void {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }

  /**
   * Log an error message
   * @param message The message to display
   */
  static error(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  /**
   * Log an information message
   * @param message The message to display
   */
  static info(message: string): void {
    console.log(chalk.blue(`🔍 ${message}`));
  }

  /**
   * Log an AI-related message
   * @param message The message to display
   */
  static ai(message: string): void {
    console.log(chalk.magenta(`🤖 ${message}`));
  }

  /**
   * Log a process/workflow message
   * @param message The message to display
   */
  static process(message: string): void {
    console.log(chalk.cyan(`🔄 ${message}`));
  }

  /**
   * Log a tip or suggestion
   * @param message The message to display
   */
  static tip(message: string): void {
    console.log(chalk.green(`💡 ${message}`));
  }

  /**
   * Create a section header
   * @param title The title of the section
   */
  static section(title: string): void {
    console.log('');
    console.log(chalk.bold.underline(`📋 ${title}`));
    console.log('');
  }

  /**
   * Create a subsection header
   * @param title The title of the subsection
   */
  static subsection(title: string): void {
    console.log(chalk.bold(`  📌 ${title}`));
  }

  /**
   * Show a progress indicator with custom emoji
   * @param message The message to display
   * @param emoji The emoji to use (defaults to 🔄)
   */
  static progress(message: string, emoji = '🔄'): void {
    console.log(chalk.cyan(`${emoji} ${message}`));
  }
}

export default Feedback;