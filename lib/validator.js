const fs = require('fs-extra');
const { error, debug } = require('./logger');

const AVAILABLE_ROLES = ['frontend', 'devops', 'infra', 'backend'];

function validateRole(role) {
  if (!role) {
    throw new Error('Role is required. Available roles: frontend, backend, devops');
  }
  
  if (!AVAILABLE_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}. Available roles: ${AVAILABLE_ROLES.join(', ')}`);
  }
  
  debug(`Validated role: ${role}`);
  return true;
}

function validateCursorConfig(configPath) {
  try {
    const config = fs.readJsonSync(configPath);
    
    // Validate required fields
    const requiredFields = ['version', 'rules'];
    requiredFields.forEach(field => {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    });

    // Validate rules structure
    if (!Array.isArray(config.rules)) {
      throw new Error('Rules must be an array');
    }

    // Validate each rule
    config.rules.forEach((rule, index) => {
      if (!rule.type || !rule.pattern) {
        throw new Error(`Invalid rule at index ${index}: missing type or pattern`);
      }
    });

    return true;
  } catch (err) {
    error(`Invalid Cursor configuration: ${err.message}`);
    return false;
  }
}

function validateGitHubWorkflow(workflowPath) {
  try {
    const workflow = fs.readFileSync(workflowPath, 'utf8');
    
    // Check for required sections
    const requiredSections = ['name', 'on', 'jobs'];
    requiredSections.forEach(section => {
      if (!workflow.includes(section)) {
        throw new Error(`Missing required section: ${section}`);
      }
    });

    // Check for sensitive information
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i
    ];

    sensitivePatterns.forEach(pattern => {
      if (pattern.test(workflow)) {
        throw new Error('Workflow contains potentially sensitive information');
      }
    });

    return true;
  } catch (err) {
    error(`Invalid GitHub workflow: ${err.message}`);
    return false;
  }
}

module.exports = {
  validateCursorConfig,
  validateGitHubWorkflow,
  validateRole
}; 