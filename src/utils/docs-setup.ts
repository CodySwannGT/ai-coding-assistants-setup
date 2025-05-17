import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';

/**
 * Utility class for setting up documentation files
 */
export class DocsSetup {
  private projectDir: string;

  /**
   * Constructor for DocsSetup
   *
   * @param projectDir Project directory
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Set up documentation files by copying the docs directory to the project
   *
   * @returns Promise resolving to true if setup was successful
   */
  async setupDocs(): Promise<boolean> {
    try {
      Feedback.section('Documentation Setup');

      // Get the package directory and source docs path
      const packageDir = path.dirname(path.dirname(__dirname));
      const sourceDocsDir = path.join(packageDir, 'docs');
      const targetDocsDir = path.join(this.projectDir, 'docs');

      // Check if source docs directory exists
      if (!fs.existsSync(sourceDocsDir)) {
        Feedback.warning(
          'Source docs directory not found. Skipping documentation setup.'
        );
        return false;
      }

      // Check if target docs directory already exists
      if (fs.existsSync(targetDocsDir)) {
        Feedback.info(
          'Docs directory already exists in the project. Checking for missing files...'
        );

        // Copy only missing files to avoid overwriting customized docs
        const sourceFiles = await fs.readdir(sourceDocsDir);
        let copiedCount = 0;

        for (const file of sourceFiles) {
          const sourcePath = path.join(sourceDocsDir, file);
          const targetPath = path.join(targetDocsDir, file);

          // Skip directories and only copy files
          if ((await fs.stat(sourcePath)).isDirectory()) {
            continue;
          }

          // Copy file if it doesn't exist in target
          if (!fs.existsSync(targetPath)) {
            await fs.copyFile(sourcePath, targetPath);
            copiedCount++;
          }
        }

        if (copiedCount > 0) {
          Feedback.success(
            `Copied ${copiedCount} missing documentation files to ${targetDocsDir}`
          );
        } else {
          Feedback.info(
            'All documentation files already exist in the project.'
          );
        }
      } else {
        // Copy the entire docs directory
        await fs.copy(sourceDocsDir, targetDocsDir);
        Feedback.success(`Copied documentation files to ${targetDocsDir}`);
      }

      // Display message about GitHub Actions documentation
      Feedback.info('');
      Feedback.info('📋 Documentation has been set up in your project.');
      Feedback.info(
        '👉 Check docs/github-actions.md for instructions on integrating CI/CD workflows.'
      );

      return true;
    } catch (error) {
      Feedback.error(
        `Documentation setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}

export default DocsSetup;
