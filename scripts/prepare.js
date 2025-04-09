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

    info('Preparing package for distribution...');

    // Ensure required directories exist
    await fs.ensureDir(templatesDir);
    await fs.ensureDir(scriptsDir);
    await fs.ensureDir(cursorDir);
    await fs.ensureDir(rulesDir);
    await fs.ensureDir(path.join(templatesDir, 'roles'));

    info('Created required directories');

    // Validate required files exist
    const requiredFiles = [
      'templates/roles/frontend.cursor',
      'templates/roles/backend.cursor',
      'templates/roles/infra.cursor',
      'templates/roles/devops.cursor'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    info('Validated required files');

    // Copy MDC files from roles to rules directory
    const roles = ['frontend', 'backend', 'infra', 'devops'];
    for (const role of roles) {
      const roleTemplatePath = path.join(templatesDir, 'roles', `${role}.cursor`);
      const roleRulesPath = path.join(rulesDir, `${role}.mdc`);
      
      if (fs.existsSync(roleTemplatePath)) {
        // Read the template content
        const templateContent = fs.readFileSync(roleTemplatePath, 'utf8');
        
        // Ensure the content is in MDC format
        if (!templateContent.includes('---')) {
          // Convert to MDC format if needed
          const mdcContent = `---
description: ${role} development rules
globs: ["**/*.{js,jsx,ts,tsx}"]
alwaysApply: false
---
${templateContent}`;
          fs.writeFileSync(roleRulesPath, mdcContent);
        } else {
          fs.writeFileSync(roleRulesPath, templateContent);
        }
        info(`Copied ${role} rules to: ${path.relative(projectRoot, roleRulesPath)}`);
      }
    }

    // Create or update config.json
    const configPath = path.join(cursorDir, 'config.json');
    const configData = {
      version: '1.1.0',
      rules: {
        enabled: true,
        autoSync: true,
        syncInterval: 300,
        mergeStrategy: 'project-first'
      },
      editor: {
        cursor: true,
        vscode: true
      }
    };
    await fs.writeJson(configPath, configData, { spaces: 2 });
    info('Created/updated config.json');

    info('Package preparation completed successfully');
  } catch (err) {
    error(`Failed to prepare package: ${err.message}`);
    process.exit(1);
  }
}

// Run prepare
prepare(); 