#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { version } = require('../package.json');
const { interactiveInit } = require('../lib/interactive');
const { compareConfigs } = require('../lib/diff');
const { listBackups, restoreBackup, cleanupBackups } = require('../lib/backup');
const { setLogLevel } = require('../lib/logger');
const { mergeConfigs } = require('../lib/merge');

const argv = yargs(hideBin(process.argv))
  .option('log-level', {
    describe: 'Set logging level (debug, info, warn, error)',
    type: 'string',
    default: 'info'
  })
  .command('init', 'Initialize Cursor configuration', (yargs) => {
    return yargs.option('role', {
      alias: 'r',
      describe: 'Role to initialize (frontend, devops, infra, backend)',
      type: 'string'
    }).option('dry-run', {
      describe: 'Preview changes without applying them',
      type: 'boolean',
      default: false
    }).option('interactive', {
      alias: 'i',
      describe: 'Run in interactive mode',
      type: 'boolean',
      default: false
    });
  })
  .command('merge', 'Merge base .cursor with role rules', (yargs) => {
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
  if (argv['dry-run']) {
    console.info('Dry run mode: No changes will be made');
  }
  mergeConfigs(argv.role);
} else if (command === 'diff') {
  compareConfigs(argv.role);
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
    cleanupBackups(argv.days);
  }
} else if (command === 'audit') {
  const auditPath = path.resolve(__dirname, '../lib/audit.js');
  execSync(`node ${auditPath}`, { stdio: 'inherit' });
} else if (command === 'version') {
  console.log(`Cursor Ops Kit v${version}`);
}
