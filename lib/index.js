const { validateRole, validateCursorConfig, validateGitHubWorkflow } = require('./validator');
const { syncRules, testRules, readGlobalRules, readProjectRules } = require('./rules');
const { compareConfigs } = require('./diff');
const { listBackups, restoreBackup, cleanupBackups } = require('./backup');
const { interactiveInit } = require('./interactive');
const { debug, info, success, warn, error } = require('./logger');

module.exports = {
  // Rule management
  syncRules,
  testRules,
  readGlobalRules,
  readProjectRules,

  // Validation
  validateRole,
  validateCursorConfig,
  validateGitHubWorkflow,

  // Configuration management
  compareConfigs,
  listBackups,
  restoreBackup,
  cleanupBackups,
  interactiveInit,

  // Logging
  logger: {
    debug,
    info,
    success,
    warn,
    error
  }
}; 