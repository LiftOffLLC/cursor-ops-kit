const fs = require('fs-extra');
const path = require('path');
const { validateCursorConfig, validateGitHubWorkflow } = require('./validator');
const { error, success, info, warn } = require('./logger');

function auditConfiguration(configPath) {
  try {
    const config = fs.readJsonSync(configPath);
    
    // Version check
    if (!config.version) {
      warn(`Missing version in ${configPath}`);
      return false;
    }

    // Validate configuration structure
    if (!validateCursorConfig(configPath)) {
      return false;
    }

    // Check for sensitive information
    const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i];
    const configStr = JSON.stringify(config);
    for (const pattern of sensitivePatterns) {
      if (pattern.test(configStr)) {
        error(`Found potentially sensitive information in ${configPath}`);
        return false;
      }
    }

    return true;
  } catch (err) {
    error(`Failed to audit ${configPath}: ${err.message}`);
    return false;
  }
}

function audit() {
  const root = process.cwd();
  let passed = true;

  // Required files check
  const requiredFiles = [
    '.cursor',
    '.husky/pre-commit',
    '.husky/commit-msg',
    '.github/workflows/cursor-ai-review.yml'
  ];

  info('\nChecking required files...');
  requiredFiles.forEach(file => {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) {
      error(`Missing required file: ${file}`);
      passed = false;
    }
  });

  // Configuration validation
  info('\nValidating configurations...');
  const configFiles = [
    '.cursor',
    '.cursor-role-frontend',
    '.cursor-role-devops',
    '.cursor-role-infra',
    '.cursor-role-backend'
  ];

  configFiles.forEach(file => {
    const fullPath = path.join(root, file);
    if (fs.existsSync(fullPath)) {
      if (!auditConfiguration(fullPath)) {
        passed = false;
      }
    }
  });

  // GitHub workflow validation
  info('\nValidating GitHub workflow...');
  const workflowPath = path.join(root, '.github/workflows/cursor-ai-review.yml');
  if (fs.existsSync(workflowPath)) {
    if (!validateGitHubWorkflow(workflowPath)) {
      passed = false;
    }
  }

  // Git hooks validation
  info('\nValidating Git hooks...');
  const hookFiles = [
    '.husky/pre-commit',
    '.husky/commit-msg'
  ];

  hookFiles.forEach(hook => {
    const fullPath = path.join(root, hook);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('#!/bin/sh')) {
        error(`Invalid hook file: ${hook}`);
        passed = false;
      }
    }
  });

  if (passed) {
    success('\n✅ Audit passed: All configurations are valid.');
  } else {
    error('\n❌ Audit failed: Please fix the reported issues.');
    process.exit(1);
  }
}

module.exports = { audit };
