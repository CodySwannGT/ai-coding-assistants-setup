# Phase 4: Documentation Generation

## Objective
Generate comprehensive documentation by parsing template files and extracting configuration information, and ensure templates/docs/README.md matches the root README.md.

## Tasks

- [ ] Copy the root README.md to src/templates/docs/README.md
- [ ] Parse .env.example files for environment variables
- [ ] Extract GitHub secrets from workflow files
- [ ] Parse .mcp.json for MCP server configurations
- [ ] Analyze .github/workflows for reusable workflows
- [ ] Update templates/docs/README.md with extracted configuration data
- [ ] Include usage examples for workflows
- [ ] Ensure root README.md and templates/docs/README.md stay in sync

## Technical Specifications

**Information to Extract:**
```javascript
// Environment variables from .env.example
const extractEnvVars = (content) => {
  // Parse KEY=value format
  // Extract comments as descriptions
};

// GitHub secrets from workflows
const extractSecrets = (workflowContent) => {
  // Find secrets. references
  // Parse workflow inputs
};

// MCP servers from .mcp.json
const extractMCPServers = (mcpConfig) => {
  // List all configured servers
  // Extract descriptions from config
};
```

**Implementation Note:**
Per requirements.txt line 21-27, the generated documentation should include:
- List of environment variables and their descriptions
- List of commands and their descriptions
- List of secrets and their descriptions and where they are stored
- List of MCP servers and their descriptions
- List of GitHub actions and their descriptions and how to use them as they are workflow callable

The templates/docs/README.md should be kept in sync with the root README.md, with any dynamic content (from parsing) added to appropriate sections.

## Quality Assurance

- Verify all env vars are captured
- Check that workflow examples are accurate
- Ensure generated documentation is complete
- Test parsing with missing files

## Documentation

- Document the parsing logic
- Explain the generated documentation structure

## Expected Outcomes

- templates/docs/README.md contains the same content as root README.md
- All configuration options documented in the template README
- Clear usage examples for workflows included
- Template README ready to be copied to user projects
- Both READMEs stay synchronized with project changes