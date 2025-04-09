const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { debug, info, success, warn, error } = require('./logger');
const { validateRole } = require('./validator');

const role = process.argv[2];
const projectRoot = process.cwd();
const templateRoot = path.join(__dirname, '../templates');

const CONFIG_VERSION = '1.1.0';

// Track files that were copied for potential rollback
const copiedFiles = [];
const backupFiles = new Map();

const ROLES_DIR = 'roles';
const CURSOR_DIR = '.cursor';
const CURSOR_RULES_DIR = path.join(CURSOR_DIR, 'rules');
const GITHUB_DIR = '.github/workflows';

function checkConfigVersion(configPath) {
  try {
    const config = fs.readJsonSync(configPath);
    if (config.version && config.version !== CONFIG_VERSION) {
      warn(`Configuration version mismatch. Template version: ${CONFIG_VERSION}, Existing version: ${config.version}`);
      return false;
    }
    return true;
  } catch (err) {
    debug(`No version found in existing config: ${err.message}`);
    return true;
  }
}

function ensureConfigVersion(configPath) {
  try {
    const config = fs.readJsonSync(configPath);
    config.version = CONFIG_VERSION;
    fs.writeJsonSync(configPath, config, { spaces: 2 });
    debug(`Added version ${CONFIG_VERSION} to config: ${path.relative(projectRoot, configPath)}`);
  } catch (err) {
    error(`Failed to add version to config: ${err.message}`);
  }
}

function backupExistingFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    fs.copySync(filePath, backupPath);
    backupFiles.set(filePath, backupPath);
    warn(`Backed up existing file: ${path.relative(projectRoot, filePath)} → ${path.relative(projectRoot, backupPath)}`);
  }
}

function restoreBackups() {
  backupFiles.forEach((backupPath, originalPath) => {
    try {
      fs.moveSync(backupPath, originalPath, { overwrite: true });
      debug(`Restored backup: ${path.relative(projectRoot, originalPath)}`);
    } catch (err) {
      error(`Failed to restore backup for ${originalPath}: ${err.message}`);
    }
  });
}

function validateEnvironment() {
  debug('Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const requiredVersion = '14.0.0';
  if (nodeVersion < requiredVersion) {
    throw new Error(`Node.js version ${requiredVersion} or higher is required. Current version: ${nodeVersion}`);
  }

  // Git is optional, no need to check for it
  debug('Environment validation completed');
}

function rollback() {
  info('Rolling back changes...');
  
  // Remove newly copied files
  copiedFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.removeSync(file);
        debug(`Removed: ${file}`);
      }
    } catch (err) {
      error(`Failed to remove ${file}: ${err.message}`);
    }
  });

  // Restore backups
  restoreBackups();
}

function validateTemplates() {
  debug('Validating templates...');
  
  // Check if templates directory exists
  if (!fs.existsSync(templateRoot)) {
    throw new Error('Templates directory not found');
  }

  // Check if .cursor directory exists and is a directory
  const cursorDir = path.join(templateRoot, '.cursor');
  if (!fs.existsSync(cursorDir) || !fs.statSync(cursorDir).isDirectory()) {
    throw new Error('Invalid .cursor directory in templates');
  }

  // Check if .cursor/rules directory exists
  const rulesDir = path.join(cursorDir, 'rules');
  if (!fs.existsSync(rulesDir) || !fs.statSync(rulesDir).isDirectory()) {
    throw new Error('Invalid .cursor/rules directory in templates');
  }

  // Check if role template exists
  const roleTemplatePath = path.join(templateRoot, 'roles', `${role}.cursor`);
  if (!fs.existsSync(roleTemplatePath)) {
    throw new Error(`Role template not found: ${roleTemplatePath}`);
  }

  // Check if base config exists
  const baseConfigPath = path.join(cursorDir, 'config.json');
  if (!fs.existsSync(baseConfigPath)) {
    throw new Error('Base configuration not found in templates');
  }

  debug('Template validation completed');
}

function checkExistingConfigurations() {
  const filesToCheck = [
    '.cursor',
    '.husky/pre-commit',
    '.husky/commit-msg',
    '.github/workflows/cursor-ai-review.yml'
  ];

  const existingFiles = filesToCheck.filter(file => {
    const fullPath = path.join(projectRoot, file);
    return fs.existsSync(fullPath);
  });

  if (existingFiles.length > 0) {
    warn('\n⚠️  Existing configurations found:');
    existingFiles.forEach(file => {
      warn(`  - ${file}`);
    });
    warn('\nThese files will be backed up before proceeding.');
  }

  return existingFiles;
}

function copyAll() {
  try {
    // Validate environment first
    validateEnvironment();
    
    // Validate role
    validateRole(role);

    // Check for existing configurations
    const existingFiles = checkExistingConfigurations();

    // Check version compatibility for existing files
    if (existingFiles.includes('.cursor')) {
      const cursorPath = path.join(projectRoot, '.cursor');
      if (!checkConfigVersion(cursorPath)) {
        warn('Version mismatch detected. Consider using the merge command instead.');
        if (!process.env.FORCE_INIT) {
          error('Aborting due to version mismatch. Set FORCE_INIT=1 to override.');
          process.exit(1);
        }
      }
    }

    // Validate templates
    validateTemplates();

    // Ensure all required directories exist
    ensureDirectories();

    // Define files to copy
    const filesToCopy = [
      { src: path.join(templateRoot, '.cursor', 'config.json'), dest: path.join(projectRoot, '.cursor', 'config.json') },
      { src: path.join(templateRoot, '.github'), dest: path.join(projectRoot, '.github') }
    ];

    // Backup existing files first
    filesToCopy.forEach(({ dest }) => {
      backupExistingFile(dest);
    });

    // Copy base files and track them
    filesToCopy.forEach(({ src, dest }) => {
      try {
        fs.copySync(src, dest);
        copiedFiles.push(dest);
        debug(`Copied: ${path.relative(projectRoot, dest)}`);
      } catch (err) {
        throw new Error(`Failed to copy ${src} to ${dest}: ${err.message}`);
      }
    });

    // Create role-specific .mdc file
    const roleRulesTemplatePath = path.join(templateRoot, '.cursor', 'rules', `${role}.mdc`);
    const roleRulesPath = path.join(projectRoot, CURSOR_RULES_DIR, `${role}.mdc`);
    try {
      // Read the template content
      const templateContent = fs.readFileSync(roleRulesTemplatePath, 'utf8');
      
      // Write the MDC file
      fs.writeFileSync(roleRulesPath, templateContent);
      copiedFiles.push(roleRulesPath);
      debug(`Created role rules: ${path.relative(projectRoot, roleRulesPath)}`);
    } catch (err) {
      throw new Error(`Failed to create role rules: ${err.message}`);
    }

    // Ensure version is set in new configurations
    ensureConfigVersion(path.join(projectRoot, '.cursor', 'config.json'));

    // Validate copied files
    const requiredFiles = ['.cursor/config.json', path.join(CURSOR_RULES_DIR, `${role}.mdc`)];
    
    requiredFiles.forEach(file => {
      const fullPath = path.join(projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required file not found after copy: ${file}`);
      }
    });

    success('Initialization completed successfully!');
    info('\nConfiguration files installed:');
    info('  - .cursor/config.json (base configuration)');
    info(`  - .cursor/rules/${role}.mdc (role-specific rules)`);
    info('  - .github (CI/CD workflows)');
    
    if (backupFiles.size > 0) {
      info('\n⚠️  Backups created for existing files:');
      backupFiles.forEach((backupPath, originalPath) => {
        info(`  - ${path.relative(projectRoot, originalPath)} → ${path.relative(projectRoot, backupPath)}`);
      });
    }
    
    info('\nNext steps:');
    info('  1. Review the installed configuration files');
    info('  2. Compare with backups if any were created');
    info('  3. Initialize git if you want to use git-related features');

  } catch (err) {
    error(`Error during initialization: ${err.message}`);
    rollback();
    process.exit(1);
  }
}

function ensureDirectories() {
  [ROLES_DIR, CURSOR_DIR, CURSOR_RULES_DIR, GITHUB_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      debug(`Created directory: ${dir}`);
    }
  });
}

function setupGitHubWorkflow() {
  const workflowContent = `name: Cursor Config Management

on:
  push:
    branches: [ main, master ]
    paths:
      - '.cursor/**'
      - 'roles/**'
  pull_request:
    branches: [ main, master ]
    paths:
      - '.cursor/**'
      - 'roles/**'

jobs:
  config:
    name: Manage Cursor Config
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Install Cursor Ops
        run: npm install -g @liftoffllc/cursor-ops
        
      - name: Audit configuration
        run: cursor-ops audit
        
      - name: Backup current config
        if: github.event_name == 'push'
        run: |
          mkdir -p .cursor-backups
          timestamp=$(date +%s)
          cp .cursor/config.json .cursor-backups/config-$timestamp.json
          
      - name: Merge configurations
        if: github.event_name == 'push'
        run: |
          # Get changed roles from git diff
          roles=$(git diff --name-only HEAD~1 HEAD -- roles/ | cut -d'/' -f2 | sort -u)
          for role in $roles; do
            cursor-ops merge --role $role
          done
          
      - name: Create backup
        if: github.event_name == 'push'
        run: cursor-ops backup list
        
      - name: Cleanup old backups
        if: github.event_name == 'push'
        run: cursor-ops backup cleanup --days 30`;

  fs.writeFileSync(path.join(GITHUB_DIR, 'cursor-config.yml'), workflowContent);
  info('Created GitHub Actions workflow');
}

function setupGitIgnore() {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const gitignoreContent = `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Environment variables
.env
.env.*
!.env.example

# IDE and Editor files
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
debug.log
*.log

# Build and Distribution
dist/
build/
out/
.next/
.nuxt/
.cache/
.parcel-cache/
.turbo/
.vercel/

# Test coverage
coverage/
.nyc_output/

# Cursor specific backups and temporary files
.cursor-backups/
*.cursor-backup
*.pre-migration-*
.cursor.merged
.cursor-role-*.merged

# Operating System
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Misc
*.pid
*.seed
*.pid.lock
.lock-wscript
.node_repl_history
.npm
.eslintcache
.stylelintcache
.env.local
.env.development.local
.env.test.local
.env.production.local`;

  try {
    if (fs.existsSync(gitignorePath)) {
      // If .gitignore exists, append our patterns if they're not already there
      const existingContent = fs.readFileSync(gitignorePath, 'utf8');
      const newPatterns = gitignoreContent.split('\n').filter(pattern => 
        pattern && !existingContent.includes(pattern)
      );
      
      if (newPatterns.length > 0) {
        fs.appendFileSync(gitignorePath, '\n' + newPatterns.join('\n'));
        info('Updated existing .gitignore with Cursor patterns');
      }
    } else {
      // Create new .gitignore
      fs.writeFileSync(gitignorePath, gitignoreContent);
      info('Created .gitignore file');
    }
    return true;
  } catch (err) {
    error(`Failed to setup .gitignore: ${err.message}`);
    return false;
  }
}

function setupPackageJson() {
  const packageJsonPath = 'package.json';
  if (!fs.existsSync(packageJsonPath)) {
    const packageJson = {
      name: 'cursor-config',
      version: '1.1.0',
      description: 'Cursor configuration management',
      scripts: {
        'cursor:init': 'cursor-ops init',
        'cursor:merge': 'cursor-ops merge',
        'cursor:audit': 'cursor-ops audit',
        'cursor:backup': 'cursor-ops backup list'
      },
      devDependencies: {
        '@liftoffllc/cursor-ops': 'latest'
      }
    };
    fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
    info('Created package.json');
  }
}

function initializeConfig(role) {
  try {
    validateRole(role);
    ensureDirectories();
    setupGitHubWorkflow();
    setupGitIgnore();
    setupPackageJson();

    // Copy role-specific configuration
    const roleConfigPath = path.join(ROLES_DIR, role, 'config.json');
    if (fs.existsSync(roleConfigPath)) {
      const config = fs.readJsonSync(roleConfigPath);
      fs.writeJsonSync(path.join(CURSOR_DIR, 'config.json'), config, { spaces: 2 });
      success(`Initialized Cursor configuration for role: ${role}`);
    } else {
      throw new Error(`Role configuration not found: ${role}`);
    }

    // Initialize git if not already initialized
    if (!fs.existsSync('.git')) {
      execSync('git init', { stdio: 'inherit' });
      info('Initialized git repository');
    }

    // Create initial commit
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "Initialize Cursor configuration"', { stdio: 'inherit' });
    success('Created initial commit');

  } catch (err) {
    error(`Initialization failed: ${err.message}`);
    throw err;
  }
}

// Run the initialization
copyAll();

module.exports = {
  initializeConfig
};
