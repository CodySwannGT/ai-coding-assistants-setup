import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline';
import { Feedback } from './feedback';

/**
 * Environment variable keys that should be prompted for during setup
 */
export const ENV_KEYS = [
  'GITHUB_PERSONAL_ACCESS_TOKEN',
  'CONTEXT7_API_KEY',
  'BRAVE_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY', // Optional
];

/**
 * Utility class for setting up environment variables
 */
class EnvSetup {
  private projectDir: string;
  private envValues: Record<string, string> = {};

  /**
   * Constructor for EnvSetup
   * 
   * @param projectDir Project directory
   */
  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Set up environment variables
   * 
   * @param interactive Whether to run in interactive mode
   * @returns Promise resolving to true if setup was successful
   */
  async setupEnv(interactive: boolean = true): Promise<boolean> {
    try {
      Feedback.section('Environment Variables Setup');
      
      // Prompt for environment variables if in interactive mode
      if (interactive) {
        await this.promptForEnvValues();
      }
      
      // Create or update .env file
      await this.createEnvFile();
      
      // Add .env to .gitignore
      await this.addToGitignore();
      
      // Copy .env.example to project
      await this.copyEnvExample();
      
      Feedback.success('Environment variables setup completed successfully!');
      return true;
    } catch (error) {
      Feedback.error(`Environment variables setup failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Prompt the user for environment variable values
   */
  private async promptForEnvValues(): Promise<void> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    Feedback.info('Please enter your API keys (leave blank to skip):');
    
    for (const key of ENV_KEYS) {
      const isOptional = key === 'OPENAI_API_KEY';
      const value = await this.promptForValue(rl, key, isOptional);
      
      if (value) {
        this.envValues[key] = value;
      }
    }
    
    rl.close();
  }

  /**
   * Prompt for a single environment variable value
   * 
   * @param rl Readline interface
   * @param key Environment variable key
   * @param isOptional Whether the variable is optional
   * @returns Promise resolving to the entered value
   */
  private promptForValue(rl: ReturnType<typeof createInterface>, key: string, isOptional: boolean = false): Promise<string> {
    const optionalText = isOptional ? ' (optional)' : '';
    
    return new Promise((resolve) => {
      rl.question(`Enter ${key}${optionalText}: `, (answer: string) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Create or update the .env file
   */
  private async createEnvFile(): Promise<void> {
    const envPath = path.join(this.projectDir, '.env');
    
    // Check if .env already exists
    let existingContent = '';
    if (fs.existsSync(envPath)) {
      existingContent = await fs.readFile(envPath, 'utf8');
    }
    
    // Parse existing content
    const existingValues: Record<string, string> = {};
    if (existingContent) {
      const lines = existingContent.split('\n');
      for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          existingValues[match[1].trim()] = match[2].trim();
        }
      }
    }
    
    // Merge existing values with new values
    const mergedValues = { ...existingValues, ...this.envValues };
    
    // Only write if we have values to write
    if (Object.keys(mergedValues).length > 0) {
      let content = '';
      for (const [key, value] of Object.entries(mergedValues)) {
        content += `${key}=${value}\n`;
      }
      
      await fs.writeFile(envPath, content);
      Feedback.success(`Updated .env file at ${envPath}`);
    } else {
      Feedback.info('No environment variables to write. Skipping .env file creation.');
    }
  }

  /**
   * Add .env to .gitignore
   */
  private async addToGitignore(): Promise<void> {
    const gitignorePath = path.join(this.projectDir, '.gitignore');
    
    // Create .gitignore if it doesn't exist
    if (!fs.existsSync(gitignorePath)) {
      await fs.writeFile(gitignorePath, '.env\n');
      Feedback.success('Created .gitignore file with .env entry');
      return;
    }
    
    // Read existing .gitignore
    const content = await fs.readFile(gitignorePath, 'utf8');
    const lines = content.split('\n');
    
    // Check if .env is already in .gitignore
    if (lines.some(line => line.trim() === '.env')) {
      Feedback.info('.env already in .gitignore');
      return;
    }
    
    // Add .env to .gitignore
    await fs.writeFile(gitignorePath, content + '\n.env\n');
    Feedback.success('Added .env to .gitignore');
  }

  /**
   * Copy .env.example to project
   */
  private async copyEnvExample(): Promise<void> {
    // Get the package directory
    const packageDir = path.dirname(path.dirname(__dirname));
    const sourceEnvExample = path.join(packageDir, 'src', 'templates', '.env.example');
    const targetEnvExample = path.join(this.projectDir, '.env.example');
    
    // Check if source exists
    if (!fs.existsSync(sourceEnvExample)) {
      Feedback.warning('.env.example template not found. Skipping.');
      return;
    }
    
    // Copy the file
    await fs.copyFile(sourceEnvExample, targetEnvExample);
    Feedback.success('Copied .env.example to project');
  }
}

export { EnvSetup };
