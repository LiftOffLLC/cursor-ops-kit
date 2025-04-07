const readline = require('readline');
const { execSync } = require('child_process');
const { debug, info, success, warn, error } = require('./logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function selectRole() {
  const roles = ['frontend', 'devops', 'infra', 'backend'];
  info('\nAvailable roles:');
  roles.forEach((role, index) => {
    info(`${index + 1}. ${role}`);
  });

  while (true) {
    const answer = await question('\nSelect a role (1-4): ');
    const choice = parseInt(answer, 10);
    if (choice >= 1 && choice <= roles.length) {
      return roles[choice - 1];
    }
    warn('Invalid choice. Please try again.');
  }
}

async function confirmBackup(existingFiles) {
  if (existingFiles.length === 0) return true;

  warn('\n⚠️  The following files will be backed up:');
  existingFiles.forEach(file => {
    warn(`  - ${file}`);
  });

  const answer = await question('\nDo you want to proceed? (y/n): ');
  return answer.toLowerCase() === 'y';
}

async function handleDryRun() {
  const answer = await question('\nWould you like to preview changes before applying? (y/n): ');
  return answer.toLowerCase() === 'y';
}

async function interactiveInit() {
  try {
    info('\nWelcome to Cursor Ops Kit Setup!');
    info('This will help you set up Cursor configurations for your project.\n');

    // Select role
    const role = await selectRole();
    debug(`Selected role: ${role}`);

    // Check for existing configurations
    const existingFiles = require('./init').checkExistingConfigurations();
    if (existingFiles.length > 0) {
      const proceed = await confirmBackup(existingFiles);
      if (!proceed) {
        info('Setup cancelled by user.');
        process.exit(0);
      }
    }

    // Ask about dry run
    const dryRun = await handleDryRun();
    if (dryRun) {
      info('\nRunning in dry-run mode...');
      process.env.DRY_RUN = '1';
    }

    // Execute initialization
    require('./init').copyAll(role);

  } catch (err) {
    error(`Error during interactive setup: ${err.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

module.exports = {
  interactiveInit
}; 