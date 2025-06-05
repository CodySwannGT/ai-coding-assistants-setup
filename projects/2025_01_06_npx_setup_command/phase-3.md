# Phase 3: Package.json Script Management

## Objective
Add required CI/CD scripts to the target project's package.json without overwriting existing scripts.

## Tasks

- [ ] Detect and read target project's package.json
- [ ] Parse scripts section safely (handle missing package.json)
- [ ] Add only missing scripts with no-op implementations
- [ ] Preserve all existing scripts
- [ ] Write updated package.json with proper formatting
- [ ] Handle different package managers (npm, yarn, bun)

## Technical Specifications

**Required Scripts to Add:**
```javascript
const requiredScripts = {
  "lint": "echo \"lint not configured yet\"",
  "typecheck": "echo \"typecheck not configured yet\"",
  "format:check": "echo \"format:check not configured yet\"",
  "build": "echo \"build not configured yet\"",
  "test": "echo \"test not configured yet\"",
  "test:unit": "echo \"test:unit not configured yet\"",
  "test:integration": "echo \"test:integration not configured yet\"",
  "test:e2e": "echo \"test:e2e not configured yet\""
};
```

**Implementation:**
```javascript
async function updatePackageScripts(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    console.log('No package.json found, skipping script updates');
    return;
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};
  
  // Add only missing scripts
  let added = [];
  for (const [name, command] of Object.entries(requiredScripts)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = command;
      added.push(name);
    }
  }
  
  // Write back with formatting
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
```

## Quality Assurance

- Verify existing scripts are not modified
- Test with missing package.json
- Test with package.json without scripts section
- Ensure proper JSON formatting is maintained

## Documentation

- Document which scripts are added and why
- Explain that these are placeholder scripts

## Expected Outcomes

- Package.json updated with required scripts
- Existing scripts remain untouched
- User informed about what scripts were added
- CI/CD workflows will pass initial checks