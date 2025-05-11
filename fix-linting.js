#!/usr/bin/env node

import fs from 'fs';
import _path from 'path';
import { execSync } from 'child_process';

// Get a list of files with linting errors
const getFilesWithErrors = () => {
  try {
    const output = execSync('npx eslint . --quiet -f json', { encoding: 'utf8' });
    return JSON.parse(output).map(result => ({
      filePath: result.filePath,
      errors: result.messages.map(msg => ({
        ruleId: msg.ruleId,
        line: msg.line,
        column: msg.column,
        message: msg.message
      }))
    }));
  } catch (error) {
    // When ESLint finds errors, it exits with code 1, so we need to parse its stdout
    const output = error.stdout;
    if (output) {
      return JSON.parse(output).map(result => ({
        filePath: result.filePath,
        errors: result.messages.map(msg => ({
          ruleId: msg.ruleId,
          line: msg.line,
          column: msg.column,
          message: msg.message
        }))
      }));
    }
    console.error('Error getting files with linting errors:', error.message);
    return [];
  }
};

// Fix unused variables by prefixing them with _
const fixUnusedVariables = (filePath, errors) => {
  // Only handle 'no-unused-vars' errors
  const unusedVarsErrors = errors.filter(err => err.ruleId === 'no-unused-vars');
  if (unusedVarsErrors.length === 0) return;

  console.log(`Fixing unused variables in ${filePath}`);
  
  let fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  
  // Extract variable names from error messages
  const unusedVars = unusedVarsErrors.map(err => {
    const match = err.message.match(/'([^']+)' is defined but never used/);
    if (match) {
      return {
        name: match[1],
        line: err.line - 1, // 0-based index
        column: err.column - 1, // 0-based index
        type: 'defined'
      };
    }
    
    const argMatch = err.message.match(/'([^']+)' is defined but never used. Allowed unused args must match/);
    if (argMatch) {
      return {
        name: argMatch[1],
        line: err.line - 1,
        column: err.column - 1,
        type: 'arg'
      };
    }
    
    const assignMatch = err.message.match(/'([^']+)' is assigned a value but never used/);
    if (assignMatch) {
      return {
        name: assignMatch[1],
        line: err.line - 1,
        column: err.column - 1,
        type: 'assigned'
      };
    }
    
    return null;
  }).filter(Boolean);

  // Fix each unused variable
  for (const { name, line, _column, type } of unusedVars) {
    const lineContent = lines[line];
    let fixed = false;
    
    // Import statements need to be handled differently
    if (lineContent.includes('import ')) {
      // For imports, we need to check if it's a named import or default import
      if (lineContent.includes(`import ${name} from`)) {
        // Default import
        lines[line] = lineContent.replace(`import ${name} from`, `import _${name} from`);
        fixed = true;
      } else if (lineContent.includes(`import { ${name}`)) {
        // Named import
        lines[line] = lineContent.replace(`import { ${name}`, `import { ${name} as _${name}`);
        fixed = true;
      } else if (lineContent.match(new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}`))) {
        // Part of a destructured import
        lines[line] = lineContent.replace(new RegExp(`(\\{[^}]*)\\b${name}\\b([^}]*\\})`), `$1_${name}$2`);
        fixed = true;
      }
    } 
    // Parameters in function declarations
    else if (type === 'arg' && (lineContent.includes('function') || lineContent.includes('=>'))) {
      lines[line] = lineContent.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
      fixed = true;
    }
    // Method parameters
    else if (type === 'arg' && (lineContent.includes('(') && lineContent.includes(')'))) {
      lines[line] = lineContent.replace(new RegExp(`\\b${name}\\b`), `_${name}`);
      fixed = true;
    }
    // Variable declarations or destructuring
    else if (type === 'defined' || type === 'assigned') {
      // Variable declaration (const, let, var)
      if (lineContent.match(new RegExp(`(const|let|var)\\s+\\b${name}\\b`))) {
        lines[line] = lineContent.replace(new RegExp(`(const|let|var)\\s+\\b${name}\\b`), `$1 _${name}`);
        fixed = true;
      }
      // Destructured assignments
      else if (lineContent.match(new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}`))) {
        lines[line] = lineContent.replace(new RegExp(`(\\{[^}]*)\\b${name}\\b([^}]*\\})`), `$1_${name}$2`);
        fixed = true;
      }
      // Class fields
      else if (lineContent.match(new RegExp(`this\\.${name}\\s*=`))) {
        lines[line] = lineContent.replace(new RegExp(`this\\.${name}\\b`), `this._${name}`);
        fixed = true;
      }
    }
    
    if (!fixed) {
      console.log(`  Couldn't automatically fix '${name}' (${type}) on line ${line + 1}: ${lineContent}`);
    }
  }
  
  // Write the fixed content back to the file
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
};

// Main function
const main = () => {
  const filesWithErrors = getFilesWithErrors();
  console.log(`Found ${filesWithErrors.length} files with linting errors`);
  
  for (const { filePath, errors } of filesWithErrors) {
    fixUnusedVariables(filePath, errors);
  }
  
  console.log('Done fixing linting errors');
};

main();