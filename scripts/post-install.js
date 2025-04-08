const fs = require('fs-extra');
const path = require('path');
const { info, warn, error } = require('../lib/logger');
const { syncRules } = require('../lib/rules');

async function postInstall() {
  try {
    const projectRoot = process.cwd();
    const templateRoot = path.join(__dirname, '../templates');
    const cursorDir = path.join(projectRoot, '.cursor');
    const rulesDir = path.join(cursorDir, 'rules');

    // Skip if not in a project (global install)
    if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
      return;
    }

    info('Setting up Cursor rules...');

    // Ensure .cursor directory exists
    await fs.ensureDir(cursorDir);
    await fs.ensureDir(rulesDir);

    // Copy rules from template
    const templateRulesDir = path.join(templateRoot, '.cursor', 'rules');
    if (fs.existsSync(templateRulesDir)) {
      await fs.copy(templateRulesDir, rulesDir);
      info('Copied rules to project');
    } else {
      error('Template rules directory not found');
      return;
    }

    // Copy base cursor config if it doesn't exist
    const baseCursorConfig = path.join(templateRoot, '.cursor', 'config.json');
    const projectCursorConfig = path.join(cursorDir, 'config.json');
    
    if (!fs.existsSync(projectCursorConfig) && fs.existsSync(baseCursorConfig)) {
      await fs.copy(baseCursorConfig, projectCursorConfig);
      info('Copied base Cursor configuration');
    }

    // Sync rules with editor settings
    await syncRules(projectRoot, {
      mergeStrategy: 'project-first',
      editors: ['cursor', 'vscode']
    });

    info('Cursor rules setup completed successfully');
  } catch (err) {
    error(`Failed to setup Cursor rules: ${err.message}`);
    // Don't exit with error to not break npm install
    warn('Please run "cursor-ops rules sync" manually to complete setup');
  }
}

// Run post-install
postInstall(); 