const fs = require('fs-extra');
const path = require('path');
const { info, success, error } = require('./logger');

function parseMDC(content) {
  const parts = content.split('---');
  // Remove empty strings and trim each part
  const cleanParts = parts.filter(Boolean).map(part => part.trim());
  
  // First part is frontmatter, rest is content
  return {
    frontmatter: cleanParts[0] || '',
    content: cleanParts.slice(1).join('\n\n')
  };
}

function mergeMDCFiles(baseContent, roleContent, roles) {
  const base = parseMDC(baseContent);
  const roleMDC = parseMDC(roleContent);

  // Merge frontmatter
  const mergedFrontmatter = `---
description: Merged rules for ${roles.join(' and ')}
globs: ["**/*.{js,jsx,ts,tsx}"]
alwaysApply: false
---`;

  // Merge content
  const mergedContent = `${base.content}\n\n## ${roles[1]} Rules\n${roleMDC.content}`;

  return `${mergedFrontmatter}\n\n${mergedContent}`;
}

function mergeConfigs(role) {
  const projectRoot = process.cwd();
  const baseRulesPath = path.join(projectRoot, '.cursor/rules');
  const roleRulesPath = path.join(baseRulesPath, `${role}.mdc`);
  
  try {
    // Get all existing MDC files
    const existingFiles = fs.readdirSync(baseRulesPath)
      .filter(file => file.endsWith('.mdc') && !file.includes('merged'))
      .map(file => path.basename(file, '.mdc'));

    // Remove the current role if it's in the list
    const otherRoles = existingFiles.filter(r => r !== role);
    
    if (otherRoles.length === 0) {
      error('No other roles found to merge with');
      return false;
    }

    // For each other role, create a merged file
    for (const otherRole of otherRoles) {
      // Create merged filename (alphabetically ordered)
      const roles = [otherRole, role].sort();
      const mergedFileName = `${roles.join('-')}-merged.mdc`;
      const mergedRulesPath = path.join(baseRulesPath, mergedFileName);

      // Read base MDC file
      const baseContent = fs.readFileSync(path.join(baseRulesPath, `${otherRole}.mdc`), 'utf8');
      
      // Read role MDC file
      const roleContent = fs.readFileSync(roleRulesPath, 'utf8');

      // Merge MDC files
      const mergedContent = mergeMDCFiles(baseContent, roleContent, roles);
      fs.writeFileSync(mergedRulesPath, mergedContent);

      info(`Created merged file: ${path.relative(projectRoot, mergedRulesPath)}`);
    }

    success('Merged configurations successfully!');
    return true;
  } catch (err) {
    error(`Failed to merge configurations: ${err.message}`);
    return false;
  }
}

module.exports = {
  mergeConfigs
};
