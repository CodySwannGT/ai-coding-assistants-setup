#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function validateWorkflow() {
  log('\n🔍 Validating Enterprise Quality Workflow\n', colors.blue);

  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'quality.yml');
  
  // Check if workflow file exists
  if (!fs.existsSync(workflowPath)) {
    log('❌ Workflow file not found at ' + workflowPath, colors.red);
    process.exit(1);
  }

  // Parse workflow
  let workflow;
  try {
    const content = fs.readFileSync(workflowPath, 'utf8');
    workflow = yaml.load(content);
    log('✅ Workflow file parsed successfully', colors.green);
  } catch (e) {
    log('❌ Failed to parse workflow: ' + e.message, colors.red);
    process.exit(1);
  }

  // Validate structure
  const validations = [
    {
      name: 'Workflow type',
      check: () => workflow.on && workflow.on.workflow_call,
      error: 'Not a reusable workflow'
    },
    {
      name: 'Jobs defined',
      check: () => workflow.jobs && Object.keys(workflow.jobs).length > 0,
      error: 'No jobs defined'
    },
    {
      name: 'Install dependencies job',
      check: () => workflow.jobs.install_dependencies,
      error: 'Missing install_dependencies job'
    },
    {
      name: 'AI scanners are non-blocking',
      check: () => 
        workflow.jobs.code_quality_check?.['continue-on-error'] === true &&
        workflow.jobs.claude_security_scan?.['continue-on-error'] === true,
      error: 'AI scanners are not configured as non-blocking'
    },
    {
      name: 'Compliance framework input',
      check: () => workflow.on.workflow_call.inputs.compliance_framework,
      error: 'Missing compliance_framework input'
    },
    {
      name: 'Security tool inputs',
      check: () => {
        const secrets = workflow.on.workflow_call.secrets;
        return secrets.SONAR_TOKEN && secrets.SNYK_TOKEN && 
               secrets.GITGUARDIAN_API_KEY && secrets.FOSSA_API_KEY;
      },
      error: 'Missing security tool secret inputs'
    },
    {
      name: 'Summary jobs',
      check: () => 
        workflow.jobs.ai_scanners_summary &&
        workflow.jobs.security_tools_summary &&
        workflow.jobs.performance_summary,
      error: 'Missing summary jobs'
    },
    {
      name: 'Compliance validation job',
      check: () => workflow.jobs.compliance_validation,
      error: 'Missing compliance validation job'
    },
    {
      name: 'Audit logger job',
      check: () => workflow.jobs.audit_logger,
      error: 'Missing audit logger job'
    },
    {
      name: 'Performance optimizations',
      check: () => {
        // Check if quality jobs depend on install_dependencies
        const qualityJobs = ['lint', 'typecheck', 'test', 'format', 'build'];
        return qualityJobs.every(job => 
          workflow.jobs[job]?.needs?.includes('install_dependencies')
        );
      },
      error: 'Quality jobs not optimized with shared dependencies'
    }
  ];

  let passed = 0;
  let failed = 0;

  validations.forEach(validation => {
    try {
      if (validation.check()) {
        log(`✅ ${validation.name}`, colors.green);
        passed++;
      } else {
        log(`❌ ${validation.name}: ${validation.error}`, colors.red);
        failed++;
      }
    } catch (e) {
      log(`❌ ${validation.name}: ${e.message}`, colors.red);
      failed++;
    }
  });

  // Validate with GitHub's workflow parser (if gh CLI is available)
  log('\n📋 Validating workflow syntax with GitHub CLI...', colors.blue);
  try {
    execSync('which gh', { stdio: 'ignore' });
    execSync(`gh workflow view "${workflowPath}" --yaml`, { stdio: 'ignore' });
    log('✅ Workflow syntax is valid', colors.green);
    passed++;
  } catch (e) {
    log('⚠️  GitHub CLI not available or workflow syntax invalid', colors.yellow);
  }

  // Summary
  log('\n📊 Validation Summary', colors.blue);
  log(`Total checks: ${passed + failed}`);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);

  // Check for required files
  log('\n📁 Checking required files...', colors.blue);
  const requiredFiles = [
    '.github/workflows/quality.yml',
    'docs/enterprise-quality-workflow.md',
    'docs/quality-workflow-quick-reference.md',
    'docs/compliance-guide.md',
    'SECURITY.md',
    'sonar-project.properties.example'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file}`, colors.green);
    } else {
      log(`❌ ${file} - Missing`, colors.red);
      failed++;
    }
  });

  // Final result
  if (failed === 0) {
    log('\n🎉 All validations passed!', colors.green);
    log('The enterprise quality workflow is properly configured.\n');
  } else {
    log(`\n⚠️  ${failed} validation(s) failed!`, colors.red);
    log('Please fix the issues above before using the workflow.\n');
    process.exit(1);
  }
}

// Check if js-yaml is installed
try {
  require('js-yaml');
} catch (e) {
  log('Installing js-yaml for workflow validation...', colors.yellow);
  execSync('npm install js-yaml', { stdio: 'inherit' });
}

// Run validation
validateWorkflow();