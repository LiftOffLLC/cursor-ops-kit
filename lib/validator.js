const fs = require('fs-extra');
const path = require('path');
const { error, debug, warn } = require('./logger');

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
      
      // Validate reference files exist for workflow rules
      if (rule.type === 'workflow' && rule.reference) {
        const referenceFile = rule.reference.split('#')[0];
        const referencePath = path.join(path.dirname(configPath), referenceFile);
        
        if (!fs.existsSync(referencePath)) {
          warn(`Reference file not found for rule ${rule.name}: ${referencePath}`);
        } else {
          debug(`Validated reference file for rule ${rule.name}: ${referencePath}`);
        }
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

    // Validate workflow against referenced rules
    validateWorkflowAgainstRules(workflowPath);

    return true;
  } catch (err) {
    error(`Invalid GitHub workflow: ${err.message}`);
    return false;
  }
}

function validateWorkflowAgainstRules(workflowPath) {
  const configPath = path.join(process.cwd(), '.cursor');
  
  if (!fs.existsSync(configPath)) {
    debug('No .cursor configuration file found for workflow validation');
    return;
  }
  
  try {
    const config = fs.readJsonSync(configPath);
    
    if (!Array.isArray(config.rules)) {
      return;
    }
    
    const workflowRules = config.rules.filter(rule => 
      rule.type === 'workflow' && 
      rule.pattern && 
      new RegExp(rule.pattern).test(workflowPath)
    );
    
    workflowRules.forEach(rule => {
      if (rule.reference) {
        debug(`Validating workflow ${workflowPath} against rule ${rule.name}`);
        // Here we would implement the actual validation logic
        // For now, we just log that we're validating
      }
    });
  } catch (err) {
    warn(`Error validating workflow against rules: ${err.message}`);
  }
}

function validateEnvironment() {
  debug('Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const requiredVersion = '14.0.0';
  if (nodeVersion < requiredVersion) {
    throw new Error(`Node.js version ${requiredVersion} or higher is required. Current version: ${nodeVersion}`);
  }

  debug('Environment validation completed');
  return true;
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const requiredFields = ['version', 'rules'];
  for (const field of requiredFields) {
    if (!(field in config)) {
      warn(`Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

function validateRules(rules) {
  if (!Array.isArray(rules)) {
    return false;
  }

  for (const rule of rules) {
    if (!rule.name || !rule.patterns || !Array.isArray(rule.patterns)) {
      return false;
    }

    for (const pattern of rule.patterns) {
      if (!pattern.pattern || !pattern.message) {
        return false;
      }
    }
  }

  return true;
}

module.exports = {
  validateCursorConfig,
  validateGitHubWorkflow,
  validateRole,
  validateEnvironment,
  validateConfig,
  validateRules
}; 