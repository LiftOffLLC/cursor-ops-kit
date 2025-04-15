const fs = require('fs-extra');
const path = require('path');
const { debug, info, success, error } = require('./logger');

const MIGRATIONS = {
  '1.0.0': (config) => {
    // Add any new required fields or transformations
    if (!config.rules) {
      config.rules = [];
    }
    return config;
  },
  '1.1.0': (config) => {
    // Add any new required fields or transformations for 1.1.0
    if (!config.rules) {
      config.rules = [];
    }
    // Ensure all rules have severity level
    config.rules.forEach(rule => {
      if (!rule.severity) {
        rule.severity = 'warning';
      }
    });
    return config;
  },
  '1.2.0': (config) => {
    // Add any new required fields or transformations for 1.2.0
    if (!config.rules) {
      config.rules = [];
    }
    // Ensure all rules have proper structure
    config.rules.forEach(rule => {
      if (!rule.severity) {
        rule.severity = 'warning';
      }
      if (!rule.enabled) {
        rule.enabled = true;
      }
    });
    return config;
  },
  '1.2.1': (config) => {
    // Add any new required fields or transformations for 1.2.1
    if (!config.rules) {
      config.rules = [];
    }
    // Ensure all rules have proper structure
    config.rules.forEach(rule => {
      if (!rule.severity) {
        rule.severity = 'warning';
      }
      if (!rule.enabled) {
        rule.enabled = true;
      }
      // Add type field if missing
      if (!rule.type) {
        rule.type = 'base';
      }
    });
    return config;
  }
};

function migrateConfig(configPath) {
  try {
    const config = fs.readJsonSync(configPath);
    const currentVersion = config.version || '0.0.0';
    
    if (currentVersion === '1.2.1') {
      debug(`Config ${path.relative(process.cwd(), configPath)} is already at latest version`);
      return true;
    }

    info(`Migrating config from version ${currentVersion} to 1.2.1`);
    
    // Apply migrations in order
    let migratedConfig = { ...config };
    for (const [version, migration] of Object.entries(MIGRATIONS)) {
      if (currentVersion < version) {
        debug(`Applying migration for version ${version}`);
        migratedConfig = migration(migratedConfig);
      }
    }

    // Update version
    migratedConfig.version = '1.2.1';
    
    // Create backup
    const backupPath = `${configPath}.pre-migration-${Date.now()}`;
    fs.copySync(configPath, backupPath);
    debug(`Created backup: ${path.relative(process.cwd(), backupPath)}`);

    // Write migrated config
    fs.writeJsonSync(configPath, migratedConfig, { spaces: 2 });
    success('Successfully migrated config to version 1.2.1');
    
    return true;
  } catch (err) {
    error(`Failed to migrate config: ${err.message}`);
    return false;
  }
}

function migrateAll() {
  const projectRoot = process.cwd();
  const configFiles = [
    '.cursor',
    '.cursor-role-frontend',
    '.cursor-role-devops',
    '.cursor-role-infra',
    '.cursor-role-backend'
  ];

  let success = true;
  configFiles.forEach(file => {
    const configPath = path.join(projectRoot, file);
    if (fs.existsSync(configPath)) {
      if (!migrateConfig(configPath)) {
        success = false;
      }
    }
  });

  return success;
}

module.exports = {
  migrateAll
}; 