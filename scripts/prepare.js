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

    // Clean up existing rules directory
    if (fs.existsSync(rulesDir)) {
      await fs.remove(rulesDir);
      info('Cleaned up existing rules directory');
    }

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
      'templates/roles/backend.cursor'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    info('Validated required files');

    // Create default rules
    const defaultRules = [
      {
        name: 'codeStyle',
        patterns: [
          { pattern: '^\\s{2}[^\\s]', message: 'Use 2 spaces for indentation' },
          { pattern: '^[a-z][a-zA-Z0-9]*$', message: 'Use camelCase for variable and function names' },
          { pattern: '\\b[A-Z][A-Z0-9_]+\\b', message: 'Use UPPER_CASE for constants' },
          { pattern: '\\b[A-Z][a-zA-Z0-9]*\\b', message: 'Use PascalCase for class names' },
          { pattern: '\\s+$', message: 'Remove trailing whitespace' },
          { pattern: '\\t', message: 'Use spaces instead of tabs' }
        ]
      },
      {
        name: 'errorHandling',
        patterns: [
          { pattern: 'try\\s*{[^}]*}\\s*catch\\s*\\([^)]*\\)\\s*{[^}]*}(?!\\s*finally)', message: 'Consider adding a finally block for cleanup' },
          { pattern: '\\.catch\\s*\\([^)]*\\)\\s*{', message: 'Handle promise rejections properly' },
          { pattern: 'throw\\s+(?!new\\s+Error)', message: 'Throw Error objects instead of literals' },
          { pattern: 'catch\\s*\\(\\s*error\\s*\\)', message: 'Use more specific error types when possible' },
          { pattern: 'Promise\\.all\\((?![^)]*\\.map)', message: 'Consider using Promise.allSettled for better error handling' }
        ]
      },
      {
        name: 'security',
        patterns: [
          { pattern: '(password|secret|token|key)\\s*=\\s*[\'"][^\'"]+"\'', message: 'Do not hardcode sensitive information' },
          { pattern: 'eval\\s*\\(', message: 'Avoid using eval() for security reasons' },
          { pattern: '\\.innerHTML\\s*=', message: 'Use safer alternatives to innerHTML' },
          { pattern: '\\bdebugger\\b', message: 'Remove debugger statements' },
          { pattern: '\\b(http|ws)://', message: 'Use HTTPS/WSS for secure connections' }
        ]
      }
    ];

    // Create individual rule files
    for (const rule of defaultRules) {
      const ruleFile = path.join(rulesDir, `${rule.name}.json`);
      const ruleWithMeta = {
        ...rule,
        enabled: true,
        severity: rule.name === 'security' ? 'error' : 'warn',
        scope: 'global'
      };
      await fs.writeJson(ruleFile, ruleWithMeta, { spaces: 2 });
      info(`Created rule file: ${path.relative(projectRoot, ruleFile)}`);
    }

    // Create rules index
    const rulesIndex = {
      version: '1.1.0',
      rules: defaultRules.map(rule => ({
        name: rule.name,
        file: `${rule.name}.json`,
        enabled: true,
        severity: rule.name === 'security' ? 'error' : 'warn'
      }))
    };
    await fs.writeJson(path.join(rulesDir, 'index.json'), rulesIndex, { spaces: 2 });
    info('Created rules index file');

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