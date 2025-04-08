# Cursor Ops Kit

A CLI tool to enforce Cursor IDE rules, CI/CD workflows, and configuration across repositories.

## Installation

```bash
# Using npm
npm install -D @liftoffllc/cursor-ops-kit

# Using yarn
yarn add -D @liftoffllc/cursor-ops-kit

# For global installation (recommended)
npm install -g @liftoffllc/cursor-ops-kit
```

## Quick Start

```bash
# Initialize with a specific role
cursor-ops init --role frontend

# Or use interactive mode
cursor-ops init --interactive

# List available rules
cursor-ops rules list

# Sync rules with editor
cursor-ops rules sync
```

## Directory Structure

After installation, the following structure is created:
```
your-project/
├── .cursor/
│   ├── config.json     # Main configuration
│   └── rules/          # Individual rule files
│       ├── index.json  # Rules index
│       ├── codeStyle.json
│       ├── security.json
│       └── ...
└── package.json
```

## Available Roles

- `frontend`: Frontend development configuration
- `backend`: Backend development configuration
- `devops`: DevOps and CI/CD configuration
- `infra`: Infrastructure configuration

## Features

### 1. Rule Management

#### List Rules
```bash
# List all available rules
cursor-ops rules list

# List rules by scope
cursor-ops rules list --scope project
cursor-ops rules list --scope global
```

#### Sync Rules
```bash
# Sync rules with editor settings
cursor-ops rules sync

# Specify merge strategy
cursor-ops rules sync --strategy project-first
cursor-ops rules sync --strategy global-first
```

#### Test Rules
```bash
# Test rules against files
cursor-ops rules test

# Test specific files
cursor-ops rules test --files "src/**/*.js"
```

### 2. Configuration Management

#### Initialize Configuration
```bash
# Basic initialization
cursor-ops init --role <role>

# Dry run mode (preview changes)
cursor-ops init --role <role> --dry-run

# Interactive mode
cursor-ops init --interactive
```

#### Merge Configurations
```bash
# Merge role-specific with base configuration
cursor-ops merge --role <role>

# Preview merge changes without applying
cursor-ops merge --role <role> --dry-run
```

### 3. Backup Management

```bash
# List available backups
cursor-ops backup list

# Restore a specific backup
cursor-ops backup restore --file <backup-file>

# Clean up old backups (default: 30 days)
cursor-ops backup cleanup --days 30
```

### 4. GitHub Workflow Integration

The package includes automated GitHub workflows for code review and validation on pull requests.

#### Automated PR Reviews
```yaml
name: Cursor AI Review
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main, master, develop, qa]
```

#### Features
- Automated code review comments
- Style and convention validation
- Security scanning
- Performance analysis
- Documentation checks
- Branch protection enforcement

#### Configuration
```bash
# Enable workflow in your repository
cursor-ops workflow enable

# Customize review settings
cursor-ops workflow config --set severity=high

# View workflow status
cursor-ops workflow status
```

#### Branch Protection
The workflow enforces protection rules for critical branches:
- Required status checks
- Required reviews
- No direct pushes
- Up-to-date before merging
- Linear history requirement

```bash
# Set up branch protection
cursor-ops protect --branch main

# View protection status
cursor-ops protect status --branch main
```

## Rule Structure

### Individual Rule File (e.g., security.json)
```json
{
  "name": "security",
  "patterns": [
    {
      "pattern": "(password|secret|token|key)\\s*=\\s*['\"][^'\"]+['\"]",
      "message": "Do not hardcode sensitive information"
    }
  ],
  "enabled": true,
  "severity": "error",
  "scope": "global"
}
```

### Rules Index (index.json)
```json
{
  "version": "1.0.0",
  "rules": [
    {
      "name": "security",
      "file": "security.json",
      "enabled": true,
      "severity": "error"
    }
  ]
}
```

## Available Rules

### 1. Code Style Rules
- Indentation (2 spaces)
- Naming conventions (camelCase, PascalCase)
- File structure
- Code formatting

### 2. Security Rules
- Sensitive information detection
- Secure protocol enforcement
- Input validation
- Authentication checks

### 3. Performance Rules
- Optimization patterns
- Resource management
- Async operation handling
- Memory usage

### 4. Documentation Rules
- JSDoc requirements
- README standards
- Code comments
- API documentation

## Best Practices

1. **Rule Management**
   - Keep rules in version control
   - Regularly sync with editor settings
   - Test rules before applying
   - Use appropriate severity levels

2. **Configuration**
   - Use role-specific configurations
   - Keep backups before changes
   - Review merged configurations
   - Regular audits

3. **Integration**
   - Set up in CI/CD pipeline
   - Automate rule updates
   - Monitor rule effectiveness
   - Regular updates

## Troubleshooting

### Common Issues

1. **Rule Sync Issues**
   ```bash
   # Force rule sync
   cursor-ops rules sync --force
   
   # Reset to defaults
   cursor-ops rules reset
   ```

2. **Configuration Conflicts**
   ```bash
   # View differences
   cursor-ops diff --role <role>
   
   # Force project rules
   cursor-ops rules sync --strategy project-first
   ```

3. **Missing Rules**
   - Check `.cursor/rules/` directory
   - Verify rule file format
   - Check index.json
   - Run sync command

4. **Workflow Issues**
   ```bash
   # Check workflow status
   cursor-ops workflow status
   
   # Validate workflow configuration
   cursor-ops workflow validate
   
   # Reset workflow to defaults
   cursor-ops workflow reset
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add or modify rules
4. Update tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue in the repository:
[https://github.com/LiftOffLLC/cursor-ops-kit/issues](https://github.com/LiftOffLLC/cursor-ops-kit/issues)
