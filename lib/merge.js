const fs = require('fs-extra');
const path = require('path');
const { debug, info, success, error } = require('./logger');

function mergeCursorConfigs(basePath, rolePath, outputPath) {
  try {
    const baseConfig = fs.readJsonSync(basePath);
    const roleConfig = fs.readJsonSync(rolePath);

    // Merge rules arrays
    const mergedRules = [...(baseConfig.rules || []), ...(roleConfig.rules || [])];

    // Merge other properties, with role config taking precedence
    const mergedConfig = {
      ...baseConfig,
      ...roleConfig,
      rules: mergedRules
    };

    fs.writeJsonSync(outputPath, mergedConfig, { spaces: 2 });
    debug(`Merged Cursor configurations: ${path.relative(process.cwd(), outputPath)}`);
    return true;
  } catch (err) {
    error(`Failed to merge Cursor configurations: ${err.message}`);
    return false;
  }
}

function mergeConfigs(role) {
  const projectRoot = process.cwd();
  const baseCursorPath = path.join(projectRoot, '.cursor');
  const roleRulesPath = path.join(projectRoot, '.cursor/rules', `${role}.mdc`);
  const mergedCursorPath = path.join(projectRoot, '.cursor/merged.mdc');

  const baseWorkflowPath = path.join(projectRoot, '.github/workflows/cursor-ai-review.yml');
  const roleWorkflowPath = path.join(projectRoot, `.github/workflows/cursor-ai-review.${role}.yml`);
  const mergedWorkflowPath = path.join(projectRoot, '.github/workflows/cursor-ai-review.merged.yml');

  try {
    // Merge Cursor configurations
    if (fs.existsSync(baseCursorPath) && fs.existsSync(roleRulesPath)) {
      mergeCursorConfigs(baseCursorPath, roleRulesPath, mergedCursorPath);
    }

    // Merge workflow files
    if (fs.existsSync(baseWorkflowPath) && fs.existsSync(roleWorkflowPath)) {
      const baseWorkflow = fs.readFileSync(baseWorkflowPath, 'utf8');
      const roleWorkflow = fs.readFileSync(roleWorkflowPath, 'utf8');
      const mergedWorkflow = `${baseWorkflow}\n\n# Role-specific workflow for ${role}\n${roleWorkflow}`;
      fs.writeFileSync(mergedWorkflowPath, mergedWorkflow);
    }

    success('Merged configurations successfully!');
    info('\nMerged files:');
    info(`  - ${path.relative(projectRoot, mergedCursorPath)}`);
    info(`  - ${path.relative(projectRoot, mergedWorkflowPath)}`);

  } catch (err) {
    error(`Failed to merge configurations: ${err.message}`);
    return false;
  }
}

module.exports = {
  mergeConfigs,
  mergeCursorConfigs
};
