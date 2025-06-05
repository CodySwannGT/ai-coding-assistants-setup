import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface WorkflowInput {
  description: string;
  required: boolean;
  default?: string | number | boolean;
  type: string;
}

interface WorkflowSecret {
  description: string;
  required: boolean;
}

interface WorkflowStep {
  name?: string;
  id?: string;
  uses?: string;
  if?: string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  if?: string;
  needs?: string | string[];
  steps: WorkflowStep[];
  outputs?: Record<string, string>;
  'timeout-minutes'?: number;
  'continue-on-error'?: boolean;
  environment?: {
    name: string;
  };
}

interface WorkflowContent {
  name: string;
  on: {
    workflow_call: {
      inputs: Record<string, WorkflowInput>;
      secrets: Record<string, WorkflowSecret>;
    };
  };
  jobs: Record<string, WorkflowJob>;
}

describe('Quality Workflow Tests', () => {
  let workflowContent: WorkflowContent;

  beforeEach(() => {
    // Load the workflow file
    const workflowPath = path.join(
      process.cwd(),
      'src',
      'templates',
      '.github',
      'workflows',
      'quality.yml'
    );
    const fileContent = fs.readFileSync(workflowPath, 'utf8');
    workflowContent = yaml.load(fileContent) as WorkflowContent;
  });

  describe('Workflow Structure', () => {
    it('should have the correct workflow name', () => {
      expect(workflowContent.name).toBe('🔍 Quality Checks');
    });

    it('should be a reusable workflow', () => {
      expect(workflowContent.on).toHaveProperty('workflow_call');
    });

    it('should have all required input parameters', () => {
      const inputs = workflowContent.on.workflow_call.inputs;
      const requiredInputs = [
        'node_version',
        'package_manager',
        'skip_lint',
        'skip_typecheck',
        'skip_test',
        'skip_format',
        'skip_build',
        'skip_security',
        'skip_jobs',
        'working_directory',
        'compliance_framework',
        'require_approval',
        'audit_retention_days',
        'generate_evidence_package',
        'approval_environment',
      ];

      requiredInputs.forEach(input => {
        expect(inputs).toHaveProperty(input);
      });
    });

    it('should have all required secrets', () => {
      const secrets = workflowContent.on.workflow_call.secrets;
      const requiredSecrets = [
        'PAT',
        'ANTHROPIC_API_KEY',
        'SONAR_TOKEN',
        'SNYK_TOKEN',
        'GITGUARDIAN_API_KEY',
        'FOSSA_API_KEY',
      ];

      requiredSecrets.forEach(secret => {
        expect(secrets).toHaveProperty(secret);
        expect(secrets[secret].required).toBe(false); // All secrets should be optional
      });
    });
  });

  describe('Job Configuration', () => {
    it('should have all required jobs', () => {
      const jobs = workflowContent.jobs;
      const requiredJobs = [
        'install_dependencies',
        'lint',
        'typecheck',
        'test',
        'format',
        'build',
        'npm_security_scan',
        'sonarcloud',
        'snyk',
        'secret_scanning',
        'license_compliance',
        'code_quality_check',
        'claude_security_scan',
        'ai_scanners_summary',
        'security_tools_summary',
        'compliance_validation',
        'audit_logger',
        'approval_gate',
        'performance_summary',
      ];

      requiredJobs.forEach(job => {
        expect(jobs).toHaveProperty(job);
      });
    });

    it('should have dependency installation as first job', () => {
      const jobs = workflowContent.jobs;
      expect(jobs.install_dependencies).toBeDefined();
      expect(jobs.install_dependencies.outputs).toHaveProperty('cache-key');
      expect(jobs.install_dependencies.outputs).toHaveProperty('cache-hit');
    });

    it.skip('should have all quality jobs depend on install_dependencies', () => {
      const qualityJobs = [
        'lint',
        'typecheck',
        'test',
        'test_unit',
        'test_integration',
        'format',
        'build',
      ];
      qualityJobs.forEach(job => {
        if (workflowContent.jobs[job]) {
          expect(workflowContent.jobs[job].needs).toContain(
            'install_dependencies'
          );
        }
      });
    });

    it('should have AI scanners with continue-on-error', () => {
      expect(workflowContent.jobs.code_quality_check['continue-on-error']).toBe(
        true
      );
      expect(
        workflowContent.jobs.claude_security_scan['continue-on-error']
      ).toBe(true);
    });

    it('should have proper timeout settings for performance', () => {
      expect(workflowContent.jobs.lint['timeout-minutes']).toBeLessThanOrEqual(
        5
      );
      expect(
        workflowContent.jobs.typecheck['timeout-minutes']
      ).toBeLessThanOrEqual(5);
      expect(
        workflowContent.jobs.format['timeout-minutes']
      ).toBeLessThanOrEqual(3);
    });
  });

  describe('Compliance Features', () => {
    it('should have compliance validation job with correct condition', () => {
      const complianceJob = workflowContent.jobs.compliance_validation;
      expect(complianceJob.if).toContain(
        "inputs.compliance_framework != 'none'"
      );
    });

    it('should have audit logger job that always runs', () => {
      const auditJob = workflowContent.jobs.audit_logger;
      expect(auditJob.if).toBe('always()');
    });

    it('should have approval gate with correct conditions', () => {
      const approvalJob = workflowContent.jobs.approval_gate;
      expect(approvalJob.if).toContain('inputs.require_approval == true');
      expect(approvalJob.if).toContain("inputs.compliance_framework != 'none'");
      expect(approvalJob.environment?.name).toBe(
        '${{ inputs.approval_environment }}'
      );
    });

    it('should support all compliance frameworks', () => {
      const defaultFramework =
        workflowContent.on.workflow_call.inputs.compliance_framework.default;
      expect(defaultFramework).toBe('none');

      const description =
        workflowContent.on.workflow_call.inputs.compliance_framework
          .description;
      expect(description).toContain('soc2');
      expect(description).toContain('iso27001');
      expect(description).toContain('hipaa');
      expect(description).toContain('pci-dss');
    });
  });

  describe('Security Tool Integration', () => {
    it.skip('should have token checks for each security tool', () => {
      const securityJobs = [
        'sonarcloud',
        'snyk',
        'secret_scanning',
        'license_compliance',
      ];

      securityJobs.forEach(jobName => {
        const job = workflowContent.jobs[jobName];
        const steps = job.steps;

        // Should have a token check step
        const tokenCheckStep = steps.find(
          (step: WorkflowStep) =>
            step.name &&
            step.name.toLowerCase().includes('check') &&
            (step.name.toLowerCase().includes('token') ||
              step.name.toLowerCase().includes('api key'))
        );
        expect(tokenCheckStep).toBeDefined();
        expect(tokenCheckStep?.id).toBe('check_token');
      });
    });

    it.skip('should skip security tool steps when token not present', () => {
      const job = workflowContent.jobs.snyk;
      const scanStep = job.steps.find(
        (step: WorkflowStep) => step.name && step.name.includes('Run Snyk')
      );
      expect(scanStep?.if).toBe("steps.check_token.outputs.skip != 'true'");
    });
  });

  describe('Performance Optimizations', () => {
    it.skip('should use artifact upload/download for dependencies', () => {
      const installJob = workflowContent.jobs.install_dependencies;
      const uploadStep = installJob.steps.find(
        (step: WorkflowStep) =>
          step.uses && step.uses.includes('upload-artifact')
      );
      expect(uploadStep).toBeDefined();
      expect(uploadStep?.with?.name).toContain('node-modules');

      const lintJob = workflowContent.jobs.lint;
      const downloadStep = lintJob.steps.find(
        (step: WorkflowStep) =>
          step.uses && step.uses.includes('download-artifact')
      );
      expect(downloadStep).toBeDefined();
    });

    it('should have proper cache configuration', () => {
      const installJob = workflowContent.jobs.install_dependencies;
      const cacheStep = installJob.steps.find(
        (step: WorkflowStep) => step.uses && step.uses.includes('actions/cache')
      );
      expect(cacheStep).toBeDefined();
      expect(cacheStep?.with?.path).toContain('node_modules');
      expect(cacheStep?.with?.path).toContain('.npm');
    });
  });

  describe('Summary Jobs', () => {
    it('should have AI scanners summary job', () => {
      const summaryJob = workflowContent.jobs.ai_scanners_summary;
      expect(summaryJob.if).toContain('always()');
      expect(summaryJob.needs).toContain('code_quality_check');
      expect(summaryJob.needs).toContain('claude_security_scan');
    });

    it('should have security tools summary job', () => {
      const summaryJob = workflowContent.jobs.security_tools_summary;
      expect(summaryJob.if).toContain('always()');
      expect(summaryJob.needs).toContain('sonarcloud');
      expect(summaryJob.needs).toContain('snyk');
      expect(summaryJob.needs).toContain('secret_scanning');
      expect(summaryJob.needs).toContain('license_compliance');
    });

    it('should have performance summary job', () => {
      const summaryJob = workflowContent.jobs.performance_summary;
      expect(summaryJob.if).toBe('always()');
      expect(summaryJob.needs).toContain('install_dependencies');
    });
  });
});

describe('Workflow Behavior Tests', () => {
  describe('Skip Conditions', () => {
    it('should validate skip conditions for all jobs', () => {
      const workflowPath = path.join(
        process.cwd(),
        'src',
        'templates',
        '.github',
        'workflows',
        'quality.yml'
      );
      const fileContent = fs.readFileSync(workflowPath, 'utf8');
      const workflowContent = yaml.load(fileContent) as WorkflowContent;

      const skipPatterns = {
        lint: "!inputs.skip_lint && !contains(inputs.skip_jobs, 'lint')",
        typecheck:
          "!inputs.skip_typecheck && !contains(inputs.skip_jobs, 'typecheck')",
        test: "!inputs.skip_test && !contains(inputs.skip_jobs, 'test')",
        format: "!inputs.skip_format && !contains(inputs.skip_jobs, 'format')",
        build: "!inputs.skip_build && !contains(inputs.skip_jobs, 'build')",
        npm_security_scan:
          "!inputs.skip_security && !contains(inputs.skip_jobs, 'npm_security_scan')",
      };

      Object.entries(skipPatterns).forEach(([job, expectedCondition]) => {
        const jobConfig = workflowContent.jobs[job];
        expect(jobConfig.if).toContain(expectedCondition);
      });
    });
  });

  describe('Compliance Validation', () => {
    it('should validate framework-specific controls', () => {
      // This is more of an integration test that would run in CI
      // Here we just verify the structure exists
      const workflowPath = path.join(
        process.cwd(),
        'src',
        'templates',
        '.github',
        'workflows',
        'quality.yml'
      );
      const fileContent = fs.readFileSync(workflowPath, 'utf8');

      // Check for framework-specific validation steps
      expect(fileContent).toContain('SOC 2 Control Validation');
      expect(fileContent).toContain('ISO 27001 Control Validation');
      expect(fileContent).toContain('HIPAA Control Validation');
      expect(fileContent).toContain('PCI-DSS Control Validation');
    });
  });
});
