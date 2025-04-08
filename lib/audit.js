const fs = require('fs-extra');
const path = require('path');
const { validateCursorConfig, validateGitHubWorkflow } = require('./validator');
const { error, success, info, warn, debug } = require('./logger');

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

    // Check for workflow rules references
    if (Array.isArray(config.rules)) {
      const workflowRules = config.rules.filter(rule => rule.type === 'workflow' && rule.reference);
      
      if (workflowRules.length > 0) {
        info(`Found ${workflowRules.length} workflow rules with references`);
        
        for (const rule of workflowRules) {
          const referenceFile = rule.reference.split('#')[0];
          const referencePath = path.join(path.dirname(configPath), referenceFile);
          
          if (!fs.existsSync(referencePath)) {
            error(`Missing reference file for rule "${rule.name}": ${referenceFile}`);
            return false;
          } else {
            debug(`Verified reference file for rule "${rule.name}": ${referenceFile}`);
          }
        }
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

  // MDC files validation
  info('\nValidating MDC files...');
  const cursorPath = path.join(root, '.cursor');
  if (fs.existsSync(cursorPath)) {
    try {
      const config = fs.readJsonSync(cursorPath);
      if (Array.isArray(config.rules)) {
        const mdcReferences = new Set();
        
        config.rules.forEach(rule => {
          if (rule.reference) {
            const file = rule.reference.split('#')[0];
            mdcReferences.add(file);
          }
        });
        
        if (mdcReferences.size > 0) {
          for (const file of mdcReferences) {
            const mdcPath = path.join(root, file);
            if (!fs.existsSync(mdcPath)) {
              error(`Missing referenced MDC file: ${file}`);
              passed = false;
            } else {
              debug(`Verified MDC file: ${file}`);
            }
          }
        }
      }
    } catch (err) {
      error(`Failed to check MDC references: ${err.message}`);
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
