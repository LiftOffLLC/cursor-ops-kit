const fs = require('fs-extra');
const path = require('path');
const { debug, info, success, warn, error } = require('./logger');

const BACKUP_DIR = '.cursor-backups';
const MAX_BACKUPS = 5;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
  }
}

function getBackupPath(role, timestamp) {
  return path.join(BACKUP_DIR, `${role}-${timestamp}.backup`);
}

function listBackups() {
  ensureBackupDir();
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith('.backup'))
    .map(file => {
      const [role, timestamp] = file.replace('.backup', '').split('-');
      return { role, timestamp, file };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  return backups;
}

function createBackup(role, files) {
  ensureBackupDir();
  const timestamp = Date.now();
  const backupPath = getBackupPath(role, timestamp);

  try {
    const backup = {
      timestamp,
      role,
      files: files.map(file => ({
        path: file,
        content: fs.readFileSync(file, 'utf8')
      }))
    };

    fs.writeJsonSync(backupPath, backup, { spaces: 2 });
    info(`Created backup: ${backupPath}`);

    // Clean up old backups
    const backups = listBackups();
    if (backups.length > MAX_BACKUPS) {
      const oldBackups = backups.slice(MAX_BACKUPS);
      oldBackups.forEach(backup => {
        fs.removeSync(path.join(BACKUP_DIR, backup.file));
        debug(`Removed old backup: ${backup.file}`);
      });
    }

    return backupPath;
  } catch (err) {
    error(`Failed to create backup: ${err.message}`);
    throw err;
  }
}

function restoreBackup(backupFile) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFile);
    const backup = fs.readJsonSync(backupPath);

    backup.files.forEach(file => {
      fs.writeFileSync(file.path, file.content);
      info(`Restored: ${file.path}`);
    });

    success(`Successfully restored backup: ${backupFile}`);
  } catch (err) {
    error(`Failed to restore backup: ${err.message}`);
    throw err;
  }
}

function cleanupBackups(days = 30) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const backups = listBackups();
  const oldBackups = backups.filter(backup => backup.timestamp < cutoff);

  oldBackups.forEach(backup => {
    fs.removeSync(path.join(BACKUP_DIR, backup.file));
    info(`Removed old backup: ${backup.file}`);
  });

  return oldBackups.length;
}

module.exports = {
  listBackups,
  createBackup,
  restoreBackup,
  cleanupBackups
}; 