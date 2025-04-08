#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { version } = require('../package.json');
const { interactiveInit } = require('../lib/interactive');
const { compareConfigs } = require('../lib/diff');
const { listBackups, restoreBackup, cleanupBackups } = require('../lib/backup');
const { setLogLevel, info, success, warn, error } = require('../lib/logger');
const { syncRules, testRules, readGlobalRules, readProjectRules } = require('../lib/rules');
const { initializeProject } = require('../lib/init');

const argv = yargs(hideBin(process.argv))
  .option('log-level', {
    describe: 'Set logging level (debug, info, warn, error)',
    type: 'string',
    default: 'info'
  })
  .command('init', 'Initialize Cursor configuration', (yargs) => {
    return yargs
      .option('interactive', {
        alias: 'i',
        type: 'boolean',
        description: 'Run in interactive mode'
      });
  }, async (argv) => {
    try {
      await initializeProject(argv);
      info('Successfully initialized Cursor configuration');
    } catch (err) {
      error(`Failed to initialize: ${err.message}`);
      process.exit(1);
    }
  })
  .command('merge', 'Merge base .cursor with role override', (yargs) => {
    return yargs.option('role', {
      alias: 'r',
      describe: 'Role to merge with',
      type: 'string',
      demandOption: true
    }).option('dry-run', {
      describe: 'Preview changes without applying them',
      type: 'boolean',
      default: false
    });
  })
  .command('diff', 'Show differences between configurations', (yargs) => {
    return yargs.option('role', {
      alias: 'r',
      describe: 'Role to compare with',
      type: 'string',
      demandOption: true
    });
  })
  .command('rules', 'Manage Cursor rules', (yargs) => {
    return yargs
      .command('sync', 'Sync rules between global and project settings', (yargs) => {
        return yargs
          .option('strategy', {
            describe: 'Rule merge strategy (project-first, global-first, merge)',
            type: 'string',
            default: 'project-first'
          })
          .option('editors', {
            describe: 'Editors to sync with (comma-separated)',
            type: 'string',
            default: 'cursor,vscode'
          });
      })
      .command('test', 'Test rules before applying', (yargs) => {
        return yargs
          .option('files', {
            describe: 'Specific files to test against (comma-separated)',
            type: 'string'
          })
          .option('sample', {
            describe: 'Number of random files to test against',
            type: 'number',
            default: 5
          });
      })
      .command('list', 'List all available rules', (yargs) => {
        return yargs
          .option('scope', {
            describe: 'Rule scope (global, project, all)',
            type: 'string',
            default: 'all'
          });
      })
      .demandCommand(1, 'Please specify a rules command');
  })
  .command('backup', 'Manage configuration backups', (yargs) => {
    return yargs
      .command('list', 'List available backups')
      .command('restore', 'Restore a backup', (yargs) => {
        return yargs.option('file', {
          alias: 'f',
          describe: 'Backup file to restore',
          type: 'string',
          demandOption: true
        });
      })
      .command('cleanup', 'Clean up old backups', (yargs) => {
        return yargs.option('days', {
          alias: 'd',
          describe: 'Remove backups older than X days',
          type: 'number',
          default: 30
        });
      })
      .demandCommand(1, 'You need at least one backup command');
  })
  .command('audit', 'Audit Cursor configuration')
  .command('version', 'Check installed version and updates')
  .demandCommand(1, 'You need at least one command')
  .help()
  .version(version)
  .argv;

const [command, subcommand] = argv._;

// Set log level
setLogLevel(argv['log-level']);

if (command === 'init') {
  if (!argv.role || argv.interactive) {
    interactiveInit();
  } else {
    const dryRun = argv['dry-run'] ? 'DRY_RUN=1 ' : '';
    const initPath = path.resolve(__dirname, '../lib/init.js');
    execSync(`${dryRun}node ${initPath} ${argv.role}`, { stdio: 'inherit' });
  }
} else if (command === 'merge') {
  const dryRun = argv['dry-run'] ? 'DRY_RUN=1 ' : '';
  const mergePath = path.resolve(__dirname, '../lib/merge.js');
  execSync(`${dryRun}node ${mergePath} ${argv.role}`, { stdio: 'inherit' });
} else if (command === 'diff') {
  compareConfigs();
} else if (command === 'rules') {
  handleRulesCommand(argv);
} else if (command === 'backup') {
  if (subcommand === 'list') {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log('No backups found');
    } else {
      console.log('\nAvailable backups:');
      backups.forEach(backup => {
        console.log(`- ${backup.file} (${backup.role}, ${new Date(parseInt(backup.timestamp)).toLocaleString()})`);
      });
    }
  } else if (subcommand === 'restore') {
    restoreBackup(argv.file);
  } else if (subcommand === 'cleanup') {
    const count = cleanupBackups(argv.days);
    console.log(`Removed ${count} old backups`);
  }
} else if (command === 'audit') {
  const auditPath = path.resolve(__dirname, '../lib/audit.js');
  execSync(`node ${auditPath}`, { stdio: 'inherit' });
} else if (command === 'version') {
  console.log(`Current version: ${version}`);
  try {
    const latestVersion = execSync('npm view @liftoffllc/cursor-ops version').toString().trim();
    if (latestVersion !== version) {
      console.log(`\nNew version available: ${latestVersion}`);
      console.log('Run "npm install -g @liftoffllc/cursor-ops" to update');
    } else {
      console.log('\nYou are using the latest version');
    }
  } catch (error) {
    console.error('Could not check for updates:', error.message);
  }
}

async function handleRulesCommand(argv) {
  const projectRoot = process.cwd();

  if (argv._[1] === 'sync') {
    const editors = argv.editors.split(',');
    const success = await syncRules(projectRoot, {
      mergeStrategy: argv.strategy,
      editors
    });
    
    if (success) {
      success('Rules synced successfully');
    } else {
      error('Failed to sync rules');
      process.exit(1);
    }
  }
  
  else if (argv._[1] === 'test') {
    const files = argv.files ? argv.files.split(',') : [];
    const { rules } = await readProjectRules(projectRoot);
    
    const results = await testRules(projectRoot, rules, {
      sampleSize: argv.sample,
      testFiles: files
    });
    
    info('\nTest Results:');
    if (results.passed.length > 0) {
      success(`\n✓ ${results.passed.length} rules passed`);
      results.passed.forEach(result => {
        success(`  - ${result.rule}`);
      });
    }
    
    if (results.failed.length > 0) {
      warn(`\n✗ ${results.failed.length} rules failed`);
      results.failed.forEach(result => {
        warn(`  - ${result.rule}`);
        result.matches.forEach(match => {
          warn(`    • ${match.file}: ${match.message}`);
        });
      });
    }
    
    if (results.errors.length > 0) {
      error('\n! Errors occurred:');
      results.errors.forEach(err => {
        error(`  - ${err}`);
      });
      process.exit(1);
    }
  }
  
  else if (argv._[1] === 'list') {
    const scope = argv.scope;
    const rules = new Map();
    
    if (scope === 'all' || scope === 'global') {
      const globalRules = await readGlobalRules();
      globalRules.rules.forEach(rule => {
        rules.set(rule.name, { ...rule, scope: 'global' });
      });
    }
    
    if (scope === 'all' || scope === 'project') {
      const projectRules = await readProjectRules(projectRoot);
      projectRules.rules.forEach(rule => {
        const existing = rules.get(rule.name);
        if (existing) {
          rules.set(rule.name, { ...rule, scope: 'both' });
        } else {
          rules.set(rule.name, { ...rule, scope: 'project' });
        }
      });
    }
    
    info('\nAvailable Rules:');
    Array.from(rules.values()).forEach(rule => {
      const scopeColor = {
        global: '\x1b[36m', // cyan
        project: '\x1b[32m', // green
        both: '\x1b[33m' // yellow
      }[rule.scope];
      
      info(`\n${scopeColor}${rule.name}\x1b[0m (${rule.scope})`);
      if (rule.patterns) {
        rule.patterns.forEach(pattern => {
          info(`  • ${pattern.message}`);
        });
      }
    });
  }
}
