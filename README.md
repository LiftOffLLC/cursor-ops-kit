# Cursor Ops Kit

A CLI tool to enforce Cursor IDE rules, CI/CD configurations, and git hooks across repositories.

## Installation

```bash
npx github:liftoffllc/cursor-ops-kit init --role <role>
```

## Available Roles

- `frontend`: Frontend development configuration
- `devops`: DevOps and infrastructure configuration
- `infra`: Infrastructure and cloud configuration
- `backend`: Backend development configuration

## Usage

### Initialize Configuration

```bash
# Initialize with a specific role
npx github:liftoffllc/cursor-ops-kit init --role devops

# Or using the short flag
npx github:liftoffllc/cursor-ops-kit init -r frontend
```

### Audit Configuration

```bash
# Check if all required configurations are in place
npx github:liftoffllc/cursor-ops-kit audit
```

### Merge Configurations

```bash
# Merge base .cursor with role-specific overrides
npx github:liftoffllc/cursor-ops-kit merge
```

## What Gets Installed

- `.cursor`: Base Cursor IDE configuration
- `.cursor-role-<role>`: Role-specific Cursor IDE configuration
- `.husky`: Git hooks for pre-commit and commit-msg
- `.github/workflows`: CI/CD workflows for AI code review

## Development

### Prerequisites

- Node.js >= 14.0.0

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make your changes
4. Test locally:
   ```bash
   node bin/cli.js init --role devops
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT © LiftOff

---
Developed by LiftOff Engineering 🚀
