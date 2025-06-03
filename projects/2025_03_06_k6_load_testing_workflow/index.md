# K6 Load Testing Workflow Project

## Project Name
K6 Performance Testing as a Callable GitHub Action

## Project Overview
Create a separate, reusable GitHub Actions workflow for k6 load testing that can be called after deployment by customer-specific deploy actions. This provides flexibility for different deployment patterns while following performance testing best practices.

## Project Rules and Conventions
1. **Workflow Design**: Must be a callable workflow (workflow_call)
2. **Independence**: Should not be directly called from release.yml
3. **Flexibility**: Configurable for different environments and test scenarios
4. **Best Practices**: Follow k6 and performance testing best practices
5. **Documentation**: Provide clear integration examples
6. **Security**: Sensitive data (API keys, endpoints) via secrets/inputs only

## Phase Overview

### [Phase 1: Design and Architecture](./phase-1.md)
Design the k6 callable workflow architecture, define inputs/outputs, and plan integration patterns.

### [Phase 2: Basic Workflow Implementation](./phase-2.md)
Implement the core k6 workflow with essential features and configurations.

### [Phase 3: K6 Test Configurations](./phase-3.md)
Add k6 test scripts, configuration templates, and environment-specific settings.

### [Phase 4: Integration Patterns and Examples](./phase-4.md)
Create integration examples showing how customers can use this in their deploy workflows.

### [Phase 5: Testing and Documentation](./phase-5.md)
Test the workflow, create comprehensive documentation, and validate integration patterns.

## Success Criteria
- [ ] Callable k6 workflow that can be integrated after any deployment
- [ ] Configurable for different environments (staging, production)
- [ ] Support for multiple test scenarios (smoke, load, stress, spike)
- [ ] Clear documentation with integration examples
- [ ] Performance baseline tracking and reporting
- [ ] Failure handling with configurable thresholds

## Technical Stack
- GitHub Actions (workflow_call)
- k6 OSS for load testing
- JSON/YAML for configuration
- GitHub Actions artifacts for reports
- Optional: Integration with monitoring tools

## Timeline
Estimated completion: 5 phases over 2-3 days

## Status
🟡 In Progress - Phase 1