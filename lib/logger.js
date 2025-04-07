const chalk = require('chalk');

const logLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = logLevels.INFO;

function setLogLevel(level) {
  currentLogLevel = logLevels[level.toUpperCase()] || logLevels.INFO;
}

function debug(message) {
  if (currentLogLevel <= logLevels.DEBUG) {
    console.log(chalk.gray(`[DEBUG] ${message}`));
  }
}

function info(message) {
  if (currentLogLevel <= logLevels.INFO) {
    console.log(chalk.blue(`[INFO] ${message}`));
  }
}

function success(message) {
  if (currentLogLevel <= logLevels.INFO) {
    console.log(chalk.green(`✅ ${message}`));
  }
}

function warn(message) {
  if (currentLogLevel <= logLevels.WARN) {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }
}

function error(message) {
  if (currentLogLevel <= logLevels.ERROR) {
    console.error(chalk.red(`❌ ${message}`));
  }
}

module.exports = {
  setLogLevel,
  debug,
  info,
  success,
  warn,
  error
}; 