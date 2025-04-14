const fs = require('fs-extra');
const path = require('path');
const { info, success, error } = require('./logger');

function parseMDC(content) {
  const [frontmatter, ...sections] = content.split('---');
  return {
    frontmatter: frontmatter.trim(),
    content: sections.join('---').trim()
  };
}

function mergeMDCFiles(baseContent, roleContent, role) {
  const base = parseMDC(baseContent);
  const roleMDC = parseMDC(roleContent);

  // Merge frontmatter
  const mergedFrontmatter = `---
description: Merged rules for ${role}
globs: ["**/*.{js,jsx,ts,tsx}"]
alwaysApply: false
---`;

  // Merge content
  const mergedContent = `${base.content}\n\n## ${role} Rules\n${roleMDC.content}`;

  return `${mergedFrontmatter}\n${mergedContent}`;
}

function mergeConfigs(role) {
  const projectRoot = process.cwd();
  const baseRulesPath = path.join(projectRoot, '.cursor/rules');
  const roleRulesPath = path.join(baseRulesPath, `${role}.mdc`);
  
  // Get all existing MDC files
  const existingFiles = fs.readdirSync(baseRulesPath)
    .filter(file => file.endsWith('.mdc') && !file.includes('merged'))
    .map(file => path.basename(file, '.mdc'));

  // Create merged filename
  const mergedFileName = [...existingFiles, role].sort().join('-') + '-merged.mdc';
  const mergedRulesPath = path.join(baseRulesPath, mergedFileName);

  try {
    // Read base MDC file (first existing file)
    const baseFile = existingFiles[0];
    const baseContent = fs.readFileSync(path.join(baseRulesPath, `${baseFile}.mdc`), 'utf8');
    
    // Read role MDC file
    const roleContent = fs.readFileSync(roleRulesPath, 'utf8');

    // Merge MDC files
    const mergedContent = mergeMDCFiles(baseContent, roleContent, role);
    fs.writeFileSync(mergedRulesPath, mergedContent);

    success('Merged configurations successfully!');
    info(`\nCreated merged file: ${path.relative(projectRoot, mergedRulesPath)}`);

    return true;
  } catch (err) {
    error(`Failed to merge configurations: ${err.message}`);
    return false;
  }
}

module.exports = {
  mergeConfigs
};
