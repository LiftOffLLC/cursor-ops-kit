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
  console.debug(chalk.gray(`🔍 ${message}`));
}

function info(message) {
  console.info(chalk.blue(`ℹ️  ${message}`));
}

function success(message) {
  console.log(chalk.green(`✅ ${message}`));
}

function warn(message) {
  console.warn(chalk.yellow(`⚠️  ${message}`));
}

function error(message) {
  console.error(chalk.red(`❌ ${message}`));
}

module.exports = {
  setLogLevel,
  debug,
  info,
  success,
  warn,
  error
}; 