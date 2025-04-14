const fs = require('fs-extra');
const path = require('path');
const { info, error } = require('../lib/logger');

async function prepare() {
  try {
    const projectRoot = process.cwd();
    const templatesDir = path.join(projectRoot, 'templates');
    const scriptsDir = path.join(projectRoot, 'scripts');
    const cursorDir = path.join(templatesDir, '.cursor');
    const rulesDir = path.join(cursorDir, 'rules');

    info('Verifying package structure...');

    // Verify required directories exist
    const requiredDirs = [
      templatesDir,
      scriptsDir,
      cursorDir,
      rulesDir,
      path.join(templatesDir, 'roles')
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required directory missing: ${path.relative(projectRoot, dir)}`);
      }
    }

    info('Verified required directories');

    // Verify required files exist
    const requiredFiles = [
      'templates/roles/frontend.cursor',
      'templates/roles/backend.cursor',
      'templates/roles/infra.cursor',
      'templates/roles/devops.cursor',
      'templates/.cursor/rules/frontend.mdc',
      'templates/.cursor/rules/backend.mdc',
      'templates/.cursor/rules/infra.mdc',
      'templates/.cursor/rules/devops.mdc',
      'templates/.cursor/config.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    info('Verified required files');
    info('Package verification completed successfully');
  } catch (err) {
    error(`Failed to verify package: ${err.message}`);
    process.exit(1);
  }
}

// Run prepare
prepare();
