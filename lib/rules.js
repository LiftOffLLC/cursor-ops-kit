const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { debug, info, warn, error } = require('./logger');

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.cursor');
const EDITOR_CONFIGS = {
  cursor: {
    configPath: '.cursor/settings.json',
    rulesPath: '.cursor/rules'
  },
  vscode: {
    configPath: '.vscode/settings.json',
    rulesPath: '.vscode/cursor-rules'
  }
};

// Sync rules between global and project settings
async function syncRules(projectRoot, options = {}) {
  const { mergeStrategy = 'project-first', editors = ['cursor', 'vscode'] } = options;
  
  try {
    // Read global rules
    const globalRules = await readGlobalRules();
    
    // Read project rules
    const projectRules = await readProjectRules(projectRoot);
    
    // Merge rules based on strategy
    const mergedRules = mergeRules(globalRules, projectRules, mergeStrategy);
    
    // Write rules to each editor's config
    for (const editor of editors) {
      await writeEditorRules(projectRoot, editor, mergedRules);
    }
    
    return true;
  } catch (err) {
    error(`Failed to sync rules: ${err.message}`);
    return false;
  }
}

// Test rules before applying
async function testRules(projectRoot, rules, options = {}) {
  const { sampleSize = 5, testFiles = [] } = options;
  const results = { passed: [], failed: [], errors: [] };
  
  try {
    // Get files to test against
    const filesToTest = testFiles.length > 0 ? testFiles : await getSampleFiles(projectRoot, sampleSize);
    
    // Test each rule against the files
    for (const rule of rules) {
      const ruleResults = await testRule(rule, filesToTest);
      results[ruleResults.status].push({
        rule: rule.name,
        ...ruleResults
      });
    }
    
    return results;
  } catch (err) {
    error(`Failed to test rules: ${err.message}`);
    return { passed: [], failed: [], errors: [err.message] };
  }
}

// Read global rules from user's home directory
async function readGlobalRules() {
  try {
    const globalConfigPath = path.join(GLOBAL_CONFIG_DIR, 'rules.json');
    if (await fs.pathExists(globalConfigPath)) {
      return await fs.readJson(globalConfigPath);
    }
    return { rules: [], version: '1.0.0' };
  } catch (err) {
    warn(`Failed to read global rules: ${err.message}`);
    return { rules: [], version: '1.0.0' };
  }
}

// Read project-specific rules
async function readProjectRules(projectRoot) {
  try {
    const projectRulesPath = path.join(projectRoot, '.cursorrules');
    if (await fs.pathExists(projectRulesPath)) {
      return await fs.readJson(projectRulesPath);
    }
    return { rules: [], version: '1.0.0' };
  } catch (err) {
    warn(`Failed to read project rules: ${err.message}`);
    return { rules: [], version: '1.0.0' };
  }
}

// Merge global and project rules
function mergeRules(globalRules, projectRules, strategy) {
  const mergedRules = {
    version: projectRules.version || globalRules.version,
    rules: []
  };

  const ruleMap = new Map();

  // Add rules based on strategy
  if (strategy === 'project-first') {
    // Project rules take precedence
    projectRules.rules.forEach(rule => ruleMap.set(rule.name, rule));
    globalRules.rules.forEach(rule => {
      if (!ruleMap.has(rule.name)) {
        ruleMap.set(rule.name, rule);
      }
    });
  } else if (strategy === 'global-first') {
    // Global rules take precedence
    globalRules.rules.forEach(rule => ruleMap.set(rule.name, rule));
    projectRules.rules.forEach(rule => {
      if (!ruleMap.has(rule.name)) {
        ruleMap.set(rule.name, rule);
      }
    });
  } else {
    // Merge strategy (combine rules)
    [...globalRules.rules, ...projectRules.rules].forEach(rule => {
      const existing = ruleMap.get(rule.name);
      if (existing) {
        ruleMap.set(rule.name, {
          ...existing,
          ...rule,
          patterns: [...(existing.patterns || []), ...(rule.patterns || [])]
        });
      } else {
        ruleMap.set(rule.name, rule);
      }
    });
  }

  mergedRules.rules = Array.from(ruleMap.values());
  return mergedRules;
}

// Write rules to editor-specific config
async function writeEditorRules(projectRoot, editor, rules) {
  const editorConfig = EDITOR_CONFIGS[editor];
  if (!editorConfig) {
    warn(`Unknown editor: ${editor}`);
    return false;
  }

  try {
    const configPath = path.join(projectRoot, editorConfig.configPath);
    const rulesPath = path.join(projectRoot, editorConfig.rulesPath);

    // Ensure directories exist
    await fs.ensureDir(path.dirname(configPath));
    await fs.ensureDir(rulesPath);

    // Write individual rule files
    for (const rule of rules.rules) {
      const ruleFile = path.join(rulesPath, `${rule.name}.json`);
      await fs.writeJson(ruleFile, rule, { spaces: 2 });
    }

    // Update editor settings
    const settings = {
      version: rules.version,
      rules: rules.rules.map(rule => ({
        name: rule.name,
        enabled: true,
        severity: rule.severity || 'error',
        path: path.relative(projectRoot, path.join(rulesPath, `${rule.name}.json`))
      }))
    };

    await fs.writeJson(configPath, settings, { spaces: 2 });
    debug(`Updated ${editor} configuration`);
    return true;
  } catch (err) {
    error(`Failed to write ${editor} rules: ${err.message}`);
    return false;
  }
}

// Get sample files for testing
async function getSampleFiles(projectRoot, sampleSize) {
  try {
    const allFiles = await getAllFiles(projectRoot);
    return allFiles.slice(0, sampleSize);
  } catch (err) {
    error(`Failed to get sample files: ${err.message}`);
    return [];
  }
}

// Test a single rule against files
async function testRule(rule, files) {
  const results = {
    status: 'passed',
    matches: [],
    errors: []
  };

  try {
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      for (const pattern of rule.patterns || []) {
        const regex = new RegExp(pattern.pattern, 'g');
        const matches = content.match(regex);
        if (matches) {
          results.matches.push({
            file,
            pattern: pattern.pattern,
            message: pattern.message,
            count: matches.length
          });
        }
      }
    }

    if (results.matches.length > 0) {
      results.status = 'failed';
    }
  } catch (err) {
    results.status = 'errors';
    results.errors.push(err.message);
  }

  return results;
}

// Recursively get all files in directory
async function getAllFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

module.exports = {
  syncRules,
  testRules,
  readGlobalRules,
  readProjectRules,
  mergeRules
}; 