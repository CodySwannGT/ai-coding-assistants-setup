# Enterprise Release Workflow Guide

## Overview

The Enterprise Release Workflow provides advanced version management, comprehensive changelog generation, release artifact management, and policy enforcement for production-grade software releases.

## Features

### Phase 1 Implementation (Current)

#### 1. Enhanced Version Management
- **Intelligent Version Conflict Resolution**: Automatically handles version conflicts with retry mechanism
- **Multiple Version Strategies**: Support for semantic, calendar, and custom versioning
- **Pre-release Support**: Built-in support for alpha, beta, and RC versions
- **Version Reservation**: Prevents race conditions in concurrent release scenarios

#### 2. Advanced Changelog Generation
- **Multiple Formats**: Generates changelogs in Markdown, JSON, and XML formats
- **Customizable Templates**: Support for different changelog presets (angular, conventional, etc.)
- **Categorized Changes**: Organizes changes by type (features, fixes, performance, etc.)
- **Rich Metadata**: Includes commit counts, contributors, and statistics

#### 3. Release Notes Generation
- **Template-based**: Customizable release notes templates
- **Automatic Content**: Pulls highlights from changelog and git history
- **Statistics**: Includes commit counts, file changes, additions/deletions
- **Multi-format**: Supports different output formats for various platforms

#### 4. Release Artifact Management
- **Release Bundles**: Creates comprehensive release packages with all artifacts
- **Checksums**: Generates SHA256 and SHA512 checksums for all files
- **Release Manifest**: JSON manifest with complete release metadata
- **Multiple Formats**: Provides both tar.gz and zip archives

#### 5. Version Policy Enforcement
- **Format Validation**: Ensures versions follow the configured strategy
- **Progression Checks**: Validates that versions increase appropriately
- **Branch Policies**: Enforces version rules based on branch (no pre-release on main)
- **Strategy Compliance**: Ensures versions match the selected strategy

## Workflow Inputs

```yaml
inputs:
  environment:
    description: 'Environment to deploy to'
    required: false
    default: 'dev'
    type: string
  
  version_strategy:
    description: 'Version strategy (semantic, calendar, custom)'
    required: false
    default: 'semantic'
    type: string
  
  prerelease_enabled:
    description: 'Enable prerelease versions'
    required: false
    default: false
    type: boolean
  
  changelog_preset:
    description: 'Changelog preset (angular, conventional, atom, etc.)'
    required: false
    default: 'angular'
    type: string
  
  release_notes_template:
    description: 'Path to custom release notes template'
    required: false
    default: ''
    type: string
  
  generate_artifacts:
    description: 'Generate release artifacts bundle'
    required: false
    default: true
    type: boolean
  
  enforce_version_policy:
    description: 'Enforce version policy rules'
    required: false
    default: true
    type: boolean
```

## Usage Examples

### Basic Release Workflow

```yaml
name: Release

on:
  push:
    branches: [main, dev, staging]

jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: ${{ github.ref_name }}
      version_strategy: 'semantic'
    secrets:
      PAT: ${{ secrets.PAT }}
```

### Calendar Versioning

```yaml
jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'production'
      version_strategy: 'calendar'
      enforce_version_policy: true
    secrets:
      PAT: ${{ secrets.PAT }}
```

### Pre-release Versions

```yaml
jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'staging'
      prerelease_enabled: true
      changelog_preset: 'conventional'
    secrets:
      PAT: ${{ secrets.PAT }}
```

### Custom Release Notes Template

```yaml
jobs:
  release:
    uses: ./.github/workflows/release.yml
    with:
      environment: 'production'
      release_notes_template: '.github/release-notes-custom.md'
      generate_artifacts: true
    secrets:
      PAT: ${{ secrets.PAT }}
```

## Version Strategies

### Semantic Versioning
- Format: `MAJOR.MINOR.PATCH`
- Example: `1.2.3`, `2.0.0-beta.1`
- Best for: Libraries, APIs, and packages with clear compatibility rules

### Calendar Versioning
- Format: `YYYY.MM.DD[.N]`
- Example: `2024.01.15`, `2024.01.15.2`
- Best for: Applications with regular release cycles

### Custom Versioning
- Format: Defined by your organization
- Example: `R2024.1`, `v1.2-sprint-15`
- Best for: Organizations with specific versioning requirements

## Changelog Presets

The workflow supports multiple changelog presets:

- **angular**: Angular's commit convention
- **conventional**: Conventional Commits standard
- **atom**: Atom's convention
- **codemirror**: CodeMirror's convention
- **ember**: Ember.js convention
- **eslint**: ESLint's convention
- **express**: Express.js convention
- **jquery**: jQuery's convention

## Release Artifacts

Each release generates a comprehensive artifact bundle containing:

```
release-{version}/
├── artifacts/
│   ├── dist/          # Built application files
│   └── build/         # Additional build outputs
├── metadata/
│   ├── package.json   # Package configuration
│   ├── release-manifest.json  # Release metadata
│   └── lock files     # Dependency lock files
├── docs/
│   ├── CHANGELOG.md   # Full changelog
│   ├── release-{version}.md  # Version-specific notes
│   └── changelog.json # Structured changelog data
└── checksums/
    ├── SHA256SUMS     # SHA256 checksums
    ├── SHA512SUMS     # SHA512 checksums
    └── checksums.json # JSON format checksums
```

## Version Policy Rules

### Branch-based Policies

1. **Production Branches** (main, master, production)
   - Only stable versions allowed
   - No pre-release identifiers
   - Must follow version progression

2. **Staging Branches**
   - Release candidates (RC) preferred
   - Can have stable versions
   - Version format: `X.Y.Z-rc.N`

3. **Development Branches**
   - Beta versions preferred
   - Version format: `X.Y.Z-beta.N`
   - Warnings for stable versions

### Version Progression Rules

1. **Semantic Versioning**
   - Versions must increase according to semver rules
   - Major > Minor > Patch progression
   - Pre-release versions sort before stable

2. **Calendar Versioning**
   - Dates must be current or future
   - Same-day releases get incremental counter
   - Format validation enforced

## Best Practices

### 1. Commit Message Standards
Follow conventional commits for automatic version bumping:
- `feat:` or `feature:` - Minor version bump
- `fix:` - Patch version bump
- `BREAKING CHANGE:` or `!:` - Major version bump

### 2. Release Notes Templates
Create custom templates for your organization:
- Include company branding
- Add specific sections (Security, Migration, etc.)
- Customize installation instructions

### 3. Artifact Management
- Always generate artifacts for production releases
- Verify checksums for critical deployments
- Retain artifacts according to compliance requirements

### 4. File Locations
- Release notes template: `.github/workflows/release-notes-template.md`
- Release notes script: `.github/scripts/generate-release-notes.sh`

### 4. Version Strategy Selection
- Use semantic versioning for libraries and APIs
- Use calendar versioning for user-facing applications
- Ensure all team members understand the chosen strategy

## Troubleshooting

### Version Conflicts
If you encounter version conflicts:
1. The workflow will automatically retry with incremented versions
2. Check for concurrent release processes
3. Ensure proper branch protection rules

### Changelog Issues
If changelog generation fails:
1. Verify commit message format
2. Check the changelog preset configuration
3. Ensure git history is available (fetch-depth: 0)

### Release Artifact Problems
If artifacts are missing:
1. Check the `generate_artifacts` input
2. Verify build outputs exist
3. Check artifact upload limits

## Security Considerations

1. **Token Permissions**: PAT requires repo write access
2. **Artifact Signing**: Consider implementing GPG signing
3. **Checksum Verification**: Always verify checksums for production
4. **Access Control**: Limit who can trigger releases

## Future Enhancements (Phases 2-5)

### Phase 2: Reliability & Error Handling
- Retry mechanisms for all operations
- Transaction-like release process
- Rollback capabilities

### Phase 3: Release Observability
- Structured logging
- Metrics collection
- Release analytics dashboard

### Phase 4: Enterprise Features
- Release signing and attestation
- Approval workflows
- Compliance reporting

### Phase 5: Testing & Documentation
- Release simulation mode
- Automated migration testing
- Comprehensive documentation

## Migration Guide

To migrate from the standard release workflow:

1. **Update Workflow Reference**
   ```yaml
   # Change from:
   uses: ./.github/workflows/release.yml
   
   # To:
   uses: ./.github/workflows/release.yml
   ```

2. **Configure Version Strategy**
   ```yaml
   with:
     version_strategy: 'semantic'  # or 'calendar'
   ```

3. **Enable New Features**
   ```yaml
   with:
     generate_artifacts: true
     enforce_version_policy: true
   ```

4. **Add Custom Templates** (optional)
   - Create `.github/release-notes-template.md`
   - Reference in workflow configuration

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review workflow logs for detailed errors
3. Open an issue with reproduction steps