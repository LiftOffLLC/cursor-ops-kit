const fs = require('fs-extra');
const path = require('path');
const { debug, info, success, warn, error } = require('./logger');

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

function mergeGitHubWorkflows(basePath, rolePath, outputPath) {
  try {
    const baseWorkflow = fs.readFileSync(basePath, 'utf8');
    const roleWorkflow = fs.readFileSync(rolePath, 'utf8');

    // Simple concatenation for now - could be enhanced with proper YAML merging
    const mergedWorkflow = `${baseWorkflow}\n\n# Role-specific additions\n${roleWorkflow}`;

    fs.writeFileSync(outputPath, mergedWorkflow);
    debug(`Merged GitHub workflows: ${path.relative(process.cwd(), outputPath)}`);
    return true;
  } catch (err) {
    error(`Failed to merge GitHub workflows: ${err.message}`);
    return false;
  }
}

function mergeConfigurations() {
  const projectRoot = process.cwd();
  const role = process.argv[2];

  if (!role) {
    error('Role is required. Usage: cursor-ops merge --role <role>');
    process.exit(1);
  }

  try {
    info('Starting configuration merge...');

    // Define paths
    const baseCursorPath = path.join(projectRoot, '.cursor');
    const roleCursorPath = path.join(projectRoot, `.cursor-role-${role}`);
    const mergedCursorPath = path.join(projectRoot, '.cursor.merged');

    const baseWorkflowPath = path.join(projectRoot, '.github/workflows/cursor-ai-review.yml');
    const roleWorkflowPath = path.join(projectRoot, `.github/workflows/cursor-ai-review.${role}.yml`);
    const mergedWorkflowPath = path.join(projectRoot, '.github/workflows/cursor-ai-review.merged.yml');

    // Check if files exist
    if (!fs.existsSync(baseCursorPath) || !fs.existsSync(roleCursorPath)) {
      error('Base or role-specific Cursor configuration not found');
      process.exit(1);
    }

    // Merge configurations
    const cursorSuccess = mergeCursorConfigs(baseCursorPath, roleCursorPath, mergedCursorPath);
    const workflowSuccess = mergeGitHubWorkflows(baseWorkflowPath, roleWorkflowPath, mergedWorkflowPath);

    if (cursorSuccess && workflowSuccess) {
      success('Configuration merge completed successfully!');
      info('\nMerged files created:');
      info(`  - ${path.relative(projectRoot, mergedCursorPath)}`);
      info(`  - ${path.relative(projectRoot, mergedWorkflowPath)}`);
      
      info('\nNext steps:');
      info('  1. Review the merged configurations');
      info('  2. Replace original files with merged versions if desired');
      info('  3. Commit the changes to your repository');
    } else {
      error('Configuration merge completed with errors');
      process.exit(1);
    }
  } catch (err) {
    error(`Error during configuration merge: ${err.message}`);
    process.exit(1);
  }
}

mergeConfigurations();
