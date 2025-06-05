import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline';
import { Feedback } from './feedback.js';

/**
 * Options for file merging
 */
export enum MergeOption {
  OVERWRITE = 'overwrite',
  KEEP_BOTH = 'keep-both',
  SKIP = 'skip',
}

/**
 * File merger utility to handle merging files from this package into a parent project
 */
export class FileMerger {
  /**
   * Merge a file from the source directory to the target directory
   *
   * @param sourcePath Source file path
   * @param targetPath Target file path
   * @param defaultOption Default option if not in interactive mode
   * @param interactive Whether to prompt the user for confirmation
   * @returns Promise resolving to true if the file was merged successfully
   */
  static async mergeFile(
    sourcePath: string,
    targetPath: string,
    defaultOption: MergeOption = MergeOption.SKIP,
    interactive: boolean = true
  ): Promise<boolean> {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      Feedback.error(`Source file does not exist: ${sourcePath}`);
      return false;
    }

    // If target file doesn't exist, just copy it
    if (!fs.existsSync(targetPath)) {
      try {
        // Ensure target directory exists
        fs.mkdirpSync(path.dirname(targetPath));
        // Copy the file
        await fs.copyFile(sourcePath, targetPath);
        Feedback.success(`Created new file: ${targetPath}`);
        return true;
      } catch (error) {
        Feedback.error(`Failed to copy file to ${targetPath}: ${error}`);
        return false;
      }
    }

    // Target file exists, prompt user for action if in interactive mode
    let option = defaultOption;
    if (interactive) {
      option = await this.promptUser(targetPath);
    }

    try {
      switch (option) {
        case MergeOption.OVERWRITE:
          await fs.copyFile(sourcePath, targetPath);
          Feedback.success(`Overwrote existing file: ${targetPath}`);
          return true;

        case MergeOption.KEEP_BOTH:
          // eslint-disable-next-line no-case-declarations
          const backupPath = this.generateBackupPath(targetPath);
          await fs.copyFile(sourcePath, backupPath);
          Feedback.info(`Kept existing file. New file saved to: ${backupPath}`);
          return true;

        case MergeOption.SKIP:
          Feedback.info(`Skipped file: ${targetPath}`);
          return true;

        default:
          Feedback.warning(`Unknown option: ${option}. Skipping file.`);
          return false;
      }
    } catch (error) {
      Feedback.error(`Error merging file ${targetPath}: ${error}`);
      return false;
    }
  }

  /**
   * Prompt the user for what to do with an existing file
   *
   * @param targetPath Target file path
   * @returns Promise resolving to the selected merge option
   */
  private static async promptUser(targetPath: string): Promise<MergeOption> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise<MergeOption>(resolve => {
      Feedback.warning(`File already exists: ${targetPath}`);
      rl.question(
        '❓ What would you like to do?\n' +
          '  [o] Overwrite existing file\n' +
          '  [k] Keep both (saves new file with .new extension)\n' +
          '  [s] Skip this file\n' +
          'Choose an option [o/k/s]: ',
        answer => {
          rl.close();

          switch (answer.toLowerCase()) {
            case 'o':
              resolve(MergeOption.OVERWRITE);
              break;
            case 'k':
              resolve(MergeOption.KEEP_BOTH);
              break;
            case 's':
            default:
              resolve(MergeOption.SKIP);
              break;
          }
        }
      );
    });
  }

  /**
   * Generate a backup path for a file
   *
   * @param filePath Original file path
   * @returns Backup file path with .new extension
   */
  private static generateBackupPath(filePath: string): string {
    return `${filePath}.new`;
  }

  /**
   * Merge multiple files from source directory to target directory
   *
   * @param files Map of source files to target files
   * @param defaultOption Default option if not in interactive mode
   * @param interactive Whether to prompt the user for confirmation
   * @returns Promise resolving to number of successfully merged files
   */
  static async mergeFiles(
    files: Map<string, string>,
    defaultOption: MergeOption = MergeOption.SKIP,
    interactive: boolean = true
  ): Promise<number> {
    let successCount = 0;

    Feedback.section('Merging Files');

    for (const [sourcePath, targetPath] of files.entries()) {
      const success = await this.mergeFile(
        sourcePath,
        targetPath,
        defaultOption,
        interactive
      );

      if (success) {
        successCount++;
      }
    }

    Feedback.info(`Completed merging ${successCount} of ${files.size} files`);
    return successCount;
  }
}

export default FileMerger;
