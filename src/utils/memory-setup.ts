import fs from 'fs-extra';
import path from 'path';
import { Feedback } from './feedback';

/**
 * Utility class for setting up AI memory file
 */
export class MemorySetup {
  private projectDir: string;

  /**
   * Constructor for MemorySetup
   *
   * @param projectDir Project directory
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Set up AI memory file
   *
   * @returns Promise resolving to true if setup was successful
   */
  async setupMemory(): Promise<boolean> {
    try {
      Feedback.section('AI Memory Setup');

      // Create .ai directory and memory.jsonl file
      const aiDir = path.join(this.projectDir, '.ai');
      const memoryPath = path.join(aiDir, 'memory.jsonl');

      // Create directory if it doesn't exist
      await fs.ensureDir(aiDir);

      // Check if memory file already exists
      if (fs.existsSync(memoryPath)) {
        Feedback.info(`AI memory file already exists at ${memoryPath}`);
        return true;
      }

      // Try to use the template file if it exists
      const packageDir = path.dirname(path.dirname(__dirname));
      const templatePath = path.join(
        packageDir,
        'src',
        'templates',
        '.ai',
        'memory.jsonl'
      );

      if (fs.existsSync(templatePath)) {
        // Copy the template file
        await fs.copyFile(templatePath, memoryPath);
        Feedback.success(
          `Created AI memory file from template at ${memoryPath}`
        );
      } else {
        // Create a new memory file with initial entry
        const projectName = path.basename(this.projectDir);
        const initialEntry = {
          type: 'entity',
          name: `Project:${projectName}`,
          entityType: 'Project',
          observations: [
            `Project ${projectName} initialized with AI coding assistants`,
          ],
        };

        await fs.writeFile(memoryPath, JSON.stringify(initialEntry) + '\n');
        Feedback.success(`Created AI memory file at ${memoryPath}`);
      }

      return true;
    } catch (error) {
      Feedback.error(
        `AI memory setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }
}
