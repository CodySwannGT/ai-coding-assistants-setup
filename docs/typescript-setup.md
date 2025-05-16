# TypeScript Setup

This document explains how to set up TypeScript in your project using the AI Coding Assistants Setup tool.

## Overview

The TypeScript setup utility provides a streamlined way to configure TypeScript in new or existing projects. It handles the installation of required packages, creation of configuration files, and integration with other tools like ESLint.

## Features

- Automatic detection of project type (React, Node.js, etc.)
- Installation of TypeScript and related packages
- Creation of optimized tsconfig.json
- Integration with ESLint for TypeScript linting
- Addition of npm scripts for TypeScript development
- Sample TypeScript files for quick start
- Updates to .gitignore for TypeScript projects

## Using the TypeScript Setup Command

The tool provides a dedicated command for setting up TypeScript:

```bash
ai-coding-assistants-setup setup-typescript [options]
```

### Options

- `--no-strict`: Disable strict type checking
- `--react`: Set up React/JSX support (auto-detected if possible)
- `--node`: Set up Node.js support (auto-detected if possible)
- `--no-scripts`: Skip adding scripts to package.json
- `--no-eslint`: Skip ESLint integration
- `--no-samples`: Skip creating sample TypeScript files

## Examples

### Basic Setup

```bash
# Set up TypeScript with strict typing
ai-coding-assistants-setup setup-typescript
```

### React Setup

```bash
# Set up TypeScript for React projects
ai-coding-assistants-setup setup-typescript --react
```

### Node.js Setup

```bash
# Set up TypeScript for Node.js projects
ai-coding-assistants-setup setup-typescript --node
```

### Minimal Setup

```bash
# Just install TypeScript without extras
ai-coding-assistants-setup setup-typescript --no-eslint --no-scripts --no-samples
```

## What Gets Set Up

### Packages Installed

- `typescript`: The TypeScript compiler
- `ts-node`: TypeScript execution environment
- `@types/node`: Node.js type definitions (if using Node.js)
- `@types/react`, `@types/react-dom`: React type definitions (if using React)
- `@types/jest`, `ts-jest`: Jest testing type definitions (if Jest is detected)
- `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`: ESLint TypeScript plugins (if ESLint is installed)

### Configuration Files

1. **tsconfig.json**:
   - Configured based on project type (React, Node.js, etc.)
   - Strict typing options (optional)
   - Path mappings for module resolution
   - Source directory configuration

2. **package.json**:
   - Added scripts for building, running, and type checking:
     - `build`: "tsc"
     - `dev`: "ts-node src/index.ts"
     - `start`: "node dist/index.js"
     - `typecheck`: "tsc --noEmit"

3. **ESLint Configuration**:
   - TypeScript ESLint parser and plugin
   - Recommended TypeScript ESLint rules
   - File-specific overrides for TypeScript files

4. **.gitignore**:
   - TypeScript-specific entries added (dist, build, *.tsbuildinfo, etc.)

### Sample Files

For new projects, the following sample files are created:

1. Basic TypeScript project:
   - `src/index.ts`: Basic TypeScript samples with interfaces and classes
   - `src/types/index.ts`: Common type definitions and utility types

2. React TypeScript project:
   - `src/index.tsx`: React entry point with TypeScript
   - `src/App.tsx`: Sample React component with TypeScript props and state

3. Node.js TypeScript project:
   - `src/index.ts`: Node.js application with TypeScript interfaces and config

## TypeScript Configuration Details

The TypeScript configuration is tailored to the project type:

### Base Configuration

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### Strict Mode Additions

When strict mode is enabled (default):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### React Additions

For React projects:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"]
  }
}
```

### Node.js Additions

For Node.js projects:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## ESLint Integration

When integrating with ESLint, the following configuration is added:

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["plugin:@typescript-eslint/recommended"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
  ]
}
```

## Best Practices

1. **Start with strict mode**: It's easier to relax constraints later than to tighten them
2. **Use TypeScript for new files**: Don't convert all files at once in existing projects
3. **Gradually increase type coverage**: Use the `// @ts-check` comment for JavaScript files
4. **Run typecheck regularly**: Use the `npm run typecheck` script to catch type errors
5. **Update dependencies**: Keep TypeScript and type definitions up-to-date