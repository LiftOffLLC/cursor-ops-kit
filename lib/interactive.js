const fs = require('fs-extra');
const path = require('path');
const { info, error } = require('./logger');
const { execSync } = require('child_process');

function interactiveInit() {
  const templateRoot = path.join(__dirname, '../templates');
  
  info('Starting interactive initialization...');
  
  // Get available roles from templates directory
  const roles = fs.readdirSync(path.join(templateRoot, 'roles'))
    .filter(file => file.endsWith('.cursor'))
    .map(file => file.replace('.cursor', ''));
  
  if (roles.length === 0) {
    error('No role templates found');
    process.exit(1);
  }
  
  // Show role selection
  info('\nAvailable roles:');
  roles.forEach((role, index) => {
    info(`${index + 1}. ${role}`);
  });
  
  // Get user input
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\nSelect a role: ', (answer) => {
    const index = parseInt(answer) - 1;
    if (isNaN(index) || index < 0 || index >= roles.length) {
      error('Invalid selection');
      process.exit(1);
    }
    
    const role = roles[index];
    readline.close();
    
    // Run initialization with selected role
    const initPath = path.resolve(__dirname, './init.js');
    execSync(`node ${initPath} ${role}`, { stdio: 'inherit' });
  });
}

module.exports = {
  interactiveInit
}; 