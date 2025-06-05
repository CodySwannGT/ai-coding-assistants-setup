# Phase 4: Documentation Generation

## Objective
Generate comprehensive documentation by parsing template files and extracting configuration information.

## Tasks

- [ ] Parse .env.example files for environment variables
- [ ] Extract GitHub secrets from workflow files
- [ ] Parse .mcp.json for MCP server configurations
- [ ] Analyze .github/workflows for reusable workflows
- [ ] Generate structured README.md in templates/docs/
- [ ] Include usage examples for workflows

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

**README.md Structure:**
```markdown
# AI Coding Assistants Setup - Configuration Reference

## Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| ANTHROPIC_API_KEY | API key for Claude | Yes |

## GitHub Secrets
| Secret | Description | Used In |
|--------|-------------|---------|
| PAT | GitHub Personal Access Token | All workflows |

## MCP Servers
| Server | Description | Configuration |
|--------|-------------|---------------|
| memory | Persistent memory system | .mcp.json |

## GitHub Actions
| Workflow | Description | How to Use |
|----------|-------------|------------|
| quality.yml | Code quality checks | See example below |

### Workflow Usage Examples
...
```

## Quality Assurance

- Verify all env vars are captured
- Check that workflow examples are accurate
- Ensure generated documentation is complete
- Test parsing with missing files

## Documentation

- Document the parsing logic
- Explain the generated documentation structure

## Expected Outcomes

- Comprehensive README in templates/docs/
- All configuration options documented
- Clear usage examples for workflows
- Easy reference for users setting up the project