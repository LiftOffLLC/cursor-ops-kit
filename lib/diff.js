const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { debug, info, success, warn, error } = require('./logger');

function getFileDiff(file1, file2) {
  try {
    const diff = execSync(`diff -u "${file1}" "${file2}"`, { encoding: 'utf8' });
    return diff;
  } catch (err) {
    if (err.status === 1) {
      return err.stdout; // diff found differences
    }
    throw err;
  }
}

function getJsonDiff(file1, file2) {
  try {
    const obj1 = fs.readJsonSync(file1);
    const obj2 = fs.readJsonSync(file2);
    
    const diff = {};
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff[key] = {
          old: obj1[key],
          new: obj2[key]
        };
      }
    });
    
    return diff;
  } catch (err) {
    error(`Failed to compare JSON files: ${err.message}`);
    return null;
  }
}

function showDiff(file1, file2) {
  const relativePath1 = path.relative(process.cwd(), file1);
  const relativePath2 = path.relative(process.cwd(), file2);
  
  info(`\nComparing ${relativePath1} with ${relativePath2}:`);
  
  if (file1.endsWith('.json') || file1.endsWith('.cursor')) {
    const diff = getJsonDiff(file1, file2);
    if (diff) {
      Object.entries(diff).forEach(([key, { old: oldValue, new: newValue }]) => {
        warn(`\nKey: ${key}`);
        info(`Old value: ${JSON.stringify(oldValue, null, 2)}`);
        info(`New value: ${JSON.stringify(newValue, null, 2)}`);
      });
    }
  } else {
    const diff = getFileDiff(file1, file2);
    console.log(diff);
  }
}

function compareConfigs() {
  const projectRoot = process.cwd();
  const role = process.argv[2];
  
  if (!role) {
    error('Role is required. Usage: cursor-ops diff --role <role>');
    process.exit(1);
  }

  try {
    const filesToCompare = [
      {
        old: path.join(projectRoot, '.cursor'),
        new: path.join(projectRoot, `.cursor-role-${role}`)
      },
      {
        old: path.join(projectRoot, '.github/workflows/cursor-ai-review.yml'),
        new: path.join(projectRoot, `.github/workflows/cursor-ai-review.${role}.yml`)
      }
    ];

    filesToCompare.forEach(({ old: oldFile, new: newFile }) => {
      if (fs.existsSync(oldFile) && fs.existsSync(newFile)) {
        showDiff(oldFile, newFile);
      }
    });

  } catch (err) {
    error(`Error during diff: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  compareConfigs
}; 