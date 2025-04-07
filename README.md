# Cursor Ops Kit

A CLI tool to enforce Cursor IDE rules, CI/CD workflows, and configuration across repositories.

## Installation

```bash
# Using npm
npm install -D @liftoffllc/cursor-ops-kit

# Using yarn
yarn add -D @liftoffllc/cursor-ops-kit
```

## Quick Start

```bash
# Initialize with a specific role
npx cursor-ops init --role frontend

# Or use interactive mode
npx cursor-ops init --interactive
```

## Available Roles

- `frontend`: Frontend development configuration
- `backend`: Backend development configuration
- `devops`: DevOps and CI/CD configuration
- `infra`: Infrastructure configuration

## Features

### 1. Configuration Management

#### Initialize Configuration
```bash
# Basic initialization
npx cursor-ops init --role <role>

# Dry run mode (preview changes)
npx cursor-ops init --role <role> --dry-run

# Interactive mode
npx cursor-ops init --interactive
```

#### Merge Configurations
```bash
# Merge role-specific with base configuration
npx cursor-ops merge --role <role>
```

#### Compare Configurations
```bash
# Show differences between configurations
npx cursor-ops diff --role <role>
```

### 2. Backup Management

```bash
# List available backups
npx cursor-ops backup list

# Restore a specific backup
npx cursor-ops backup restore --file <backup-file>

# Clean up old backups
npx cursor-ops backup cleanup --days 30
```

### 3. Validation & Auditing

```bash
# Audit current configuration
npx cursor-ops audit

# Check version and updates
npx cursor-ops version
```

## Configuration Structure

### Base Configuration (.cursor)
```json
{
  "version": "1.0.0",
  "rules": [
    {
      "name": "enforceNaming",
      "type": "naming",
      "pattern": "^[a-z][a-zA-Z0-9]*$",
      "enabled": true,
      "severity": "error"
    }
  ]
}
```

### Role-Specific Configuration (.cursor-role-{role})
Additional rules and overrides for specific roles.

## Features by Module

### Core Modules

1. **Initialization (init.js)**
   - Environment validation
   - Template copying
   - Configuration setup
   - Role-specific customization

2. **Validation (validator.js)**
   - Role validation
   - Configuration structure verification
   - GitHub workflow validation
   - Security checks

3. **Logging (logger.js)**
   - Colored output
   - Multiple log levels (debug, info, warn, error)
   - Configurable log level

4. **Backup (backup.js)**
   - Automatic backup creation
   - Backup rotation (keeps last 5)
   - Restore functionality
   - Cleanup of old backups

### Advanced Features

5. **Merge (merge.js)**
   - Configuration merging
   - Workflow file merging
   - Conflict resolution
   - Precedence handling

6. **Interactive Setup (interactive.js)**
   - Guided configuration
   - Role selection
   - Custom settings

7. **Audit (audit.js)**
   - Configuration validation
   - Rule verification
   - Issue reporting

8. **Migration (migrate.js)**
   - Version upgrades
   - Format updates
   - Backward compatibility

## Best Practices

1. Always use `--dry-run` first to preview changes
2. Keep backups before major changes
3. Review merged configurations before applying
4. Use role-specific configurations for team consistency

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   - Check rule format
   - Verify required fields
   - Use audit command for detailed report

2. **Merge Conflicts**
   - Review both configurations
   - Use diff command to identify issues
   - Consider manual merge for complex cases

3. **Backup Issues**
   - Ensure write permissions
   - Check available disk space
   - Use cleanup command for space management

## Contributing

For bugs, feature requests, or contributions, please create an issue or submit a pull request.

## License
Developed by LiftOff LLC Engineering 🚀
