const fs = require('fs-extra');
const path = require('path');
const { debug, info, success, warn, error } = require('./logger');
const {
  validateRole,
  validateCursorConfig,
  validateGitHubWorkflow,
  validateEnvironment,
  validateConfig,
  validateRules,
} = require('./validator');

const role = process.argv[2];
const projectRoot = process.cwd();
const templateRoot = path.join(__dirname, '..', 'templates');

const CONFIG_VERSION = '1.0.0';
const BACKUP_SUFFIX = '.bak';

// Track files that were copied for potential rollback
const copiedFiles = [];
const backupFiles = new Map();

function checkConfigVersion(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const config = fs.readJsonSync(configPath);
      if (config.version && config.version !== CONFIG_VERSION) {
        warn(
          'Configuration version mismatch. Template version: ' + CONFIG_VERSION + ', Existing version: ' + config.version
        );
        return false;
      }
    } catch (error) {
      warn('Failed to read config file: ' + error.message);
      return false;
    }
  }
  return true;
}

function ensureConfigVersion(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const config = fs.readJsonSync(configPath);
      config.version = CONFIG_VERSION;
      fs.writeJsonSync(configPath, config, { spaces: 2 });
      debug(
        'Added version ' + CONFIG_VERSION + ' to config: ' + path.relative(projectRoot, configPath)
      );
    } catch (error) {
      warn('Failed to update config version: ' + error.message);
    }
  }
}

function backupExistingFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}${BACKUP_SUFFIX}-${Date.now()}`;
    fs.copySync(filePath, backupPath);
    backupFiles.set(filePath, backupPath);
    warn(
      `Backed up existing file: ${path.relative(
        projectRoot,
        filePath
      )} → ${path.relative(projectRoot, backupPath)}`
    );
  }
}

function restoreBackups() {
  backupFiles.forEach((backupPath, originalPath) => {
    try {
      fs.moveSync(backupPath, originalPath, { overwrite: true });
      debug(`Restored backup: ${path.relative(projectRoot, originalPath)}`);
    } catch (err) {
      error(`Failed to restore backup for ${originalPath}: ${err.message}`);
    }
  });
}

function rollback() {
  info('Rolling back changes...');

  // Remove newly copied files
  copiedFiles.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.removeSync(file);
        debug(`Removed: ${file}`);
      }
    } catch (err) {
      error(`Failed to remove ${file}: ${err.message}`);
    }
  });

  // Restore backups
  restoreBackups();
}

function validateTemplates() {
  debug('Validating templates...');

  const cursorConfigPath = path.join(templateRoot, '.cursor');
  const workflowPath = path.join(
    templateRoot,
    '.github/workflows/cursor-ai-review.yml'
  );

  if (!validateCursorConfig(cursorConfigPath)) {
    throw new Error('Invalid base Cursor configuration');
  }

  if (!validateGitHubWorkflow(workflowPath)) {
    throw new Error('Invalid GitHub workflow configuration');
  }
}

function checkExistingConfigurations() {
  const filesToCheck = [
    '.cursor',
    '.husky/pre-commit',
    '.husky/commit-msg',
    '.github/workflows/cursor-ai-review.yml',
  ];

  const existingFiles = filesToCheck.filter((file) => {
    const fullPath = path.join(projectRoot, file);
    return fs.existsSync(fullPath);
  });

  if (existingFiles.length > 0) {
    warn('\n⚠️  Existing configurations found:');
    existingFiles.forEach((file) => {
      warn(`  - ${file}`);
    });
    warn('\nThese files will be backed up before proceeding.');
  }

  return existingFiles;
}

function copyAll() {
  try {
    // Validate environment first
    if (!validateEnvironment()) {
      throw new Error('Environment validation failed');
    }

    // Validate role
    validateRole(role);

    // Check for existing configurations
    const existingFiles = checkExistingConfigurations();

    // Check version compatibility for existing files
    if (existingFiles.includes('.cursor')) {
      const cursorPath = path.join(projectRoot, '.cursor');
      if (!checkConfigVersion(cursorPath)) {
        warn(
          'Version mismatch detected. Consider using the merge command instead.'
        );
        if (!process.env.FORCE_INIT) {
          error(
            'Aborting due to version mismatch. Set FORCE_INIT=1 to override.'
          );
          process.exit(1);
        }
      }
    }

    // Validate templates
    validateTemplates();

    // Check if role template exists
    const roleTemplatePath = path.join(templateRoot, 'roles', `${role}.cursor`);
    if (!fs.existsSync(roleTemplatePath)) {
      throw new Error(`Role template not found: ${roleTemplatePath}`);
    }

    // Define files to copy
    const filesToCopy = [
      {
        src: path.join(templateRoot, '.cursor'),
        dest: path.join(projectRoot, '.cursor'),
      },
      {
        src: roleTemplatePath,
        dest: path.join(projectRoot, `.cursor-role-${role}`),
      },
      {
        src: path.join(templateRoot, '.github'),
        dest: path.join(projectRoot, '.github'),
      },
      {
        src: path.join(templateRoot, 'ci-workflow-rules.mdc'),
        dest: path.join(projectRoot, 'ci-workflow-rules.mdc'),
      },
    ];

    // Backup existing files first
    filesToCopy.forEach(({ dest }) => {
      backupExistingFile(dest);
    });

    // Copy files and track them
    filesToCopy.forEach(({ src, dest }) => {
      try {
        fs.copySync(src, dest);
        copiedFiles.push(dest);
        debug(`Copied: ${path.relative(projectRoot, dest)}`);
      } catch (err) {
        throw new Error(`Failed to copy ${src} to ${dest}: ${err.message}`);
      }
    });

    // Ensure version is set in new configurations
    ensureConfigVersion(path.join(projectRoot, '.cursor'));
    ensureConfigVersion(path.join(projectRoot, `.cursor-role-${role}`));

    // Validate copied files
    const requiredFiles = ['.cursor'];

    requiredFiles.forEach((file) => {
      const fullPath = path.join(projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required file not found after copy: ${file}`);
      }
    });

    success('Initialization completed successfully!');
    info('\nConfiguration files installed:');
    info('  - .cursor (base configuration)');
    info(`  - .cursor-role-${role} (role-specific configuration)`);
    info('  - .github (CI/CD workflows)');

    if (backupFiles.size > 0) {
      info('\n⚠️  Backups created for existing files:');
      backupFiles.forEach((backupPath, originalPath) => {
        info(
          `  - ${path.relative(projectRoot, originalPath)} → ${path.relative(
            projectRoot,
            backupPath
          )}`
        );
      });
    }

    info('\nNext steps:');
    info('  1. Review the installed configuration files');
    info('  2. Compare with backups if any were created');
    info('  3. Initialize git if you want to use git-related features');
  } catch (err) {
    error(`Error during initialization: ${err.message}`);
    rollback();
    process.exit(1);
  }
}

/**
 * Returns an array of language-specific patterns for linting
 * @param {string} language The programming language to get patterns for
 * @return {Object[]} Array of pattern objects
 */
function getLanguagePatterns(language) {
  const patterns = {
    typescript: [
      {
        name: 'typescriptBestPractices',
        patterns: [
          {
            pattern: 'as\\s+\\w+',
            message: 'Consider using type guards instead of type assertions',
          },
          {
            pattern: ':\\s*any\\b',
            message: 'Avoid using any type',
          },
        ],
      },
    ],
    python: [
      {
        name: 'pythonBestPractices',
        patterns: [
          {
            pattern: 'def\\s+\\w+\\s*\\([^)]*\\)\\s*->',
            message: 'Document return types',
          },
          {
            pattern: 'except\\s*:',
            message: 'Specify exception types',
          },
          {
            pattern: '\\bprint\\(',
            message: 'Use logging instead of print',
          },
          {
            pattern: '\\bdict\\(\\)',
            message: 'Consider using TypedDict for better type safety',
          },
        ],
      },
    ],
  };

  return patterns[language] || [];
}

/**
 * Removes duplicate rules based on name and patterns
 * @param {Object[]} rules Array of rules to deduplicate
 * @return {Object[]} Deduplicated rules array
 */
function deduplicateRules(rules) {
  const seen = new Set();
  return rules.filter((rule) => {
    const key = `${rule.name}-${JSON.stringify(rule.patterns)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Converts a key into a role-specific suggestion
 * @param {string} key The suggestion key
 * @param {string} role The role to get suggestions for
 * @return {string} The formatted suggestion message
 */
function convertToSuggestion(key, role) {
  // Role-specific suggestion mappings
  const roleSuggestions = {
    frontend: {
      enforceAccessibility: 'Ensure ARIA attributes and semantic HTML',
      optimizeRendering: 'Implement React.memo or useMemo where appropriate',
    },
    backend: {
      enforceAPIStandards: 'Follow REST or GraphQL best practices',
      optimizeQueries: 'Add database indexes and query optimization',
    },
    devops: {
      automateDeployment: 'Implement zero-downtime deployment',
      monitorPerformance: 'Set up proper monitoring and alerting',
    },
    infra: {
      ensureScalability: 'Design for horizontal scaling',
      implementRedundancy: 'Add failover and disaster recovery',
    },
  };

  return (
    (roleSuggestions[role] && roleSuggestions[role][key]) ||
    suggestionMap[key] ||
    key
  );
}

// Common suggestion mappings
const suggestionMap = {
  documentation: {
    autoGenerateDocstrings: 'Add JSDoc comments for functions and classes',
    generateREADMEs: 'Create or update README files for new modules',
    enforceRunbooks: 'Include runbook documentation for operational procedures',
    documentArchitecture: 'Create and maintain architecture diagrams',
    documentAPIs: 'Maintain OpenAPI/Swagger documentation',
  },
  errorHandling: {
    warnIfNoErrorHandling: 'Add proper error handling to async operations',
    encourageTelemetry: 'Include telemetry for better monitoring',
    validateInputs: 'Add input validation for all user inputs',
    handleEdgeCases: 'Document and handle edge cases',
  },
  performance: {
    optimizeQueries: 'Review and optimize database queries',
    implementCaching: 'Add caching for expensive operations',
    optimizeAssets: 'Optimize and compress static assets',
    lazyLoadComponents: 'Implement lazy loading for large components',
  },
};

/**
 * Generate patterns based on permission level
 * @param {string} permission - The permission level to generate patterns for
 * @returns {Array<Object>} Array of permission-specific patterns
 */
function generatePatternsForPermission(permission) {
  const patternMap = {
    allowRefactors: [
      {
        pattern: '\\b(TODO|FIXME|REFACTOR)\\b',
        message: 'Consider addressing technical debt',
      },
    ],
  };

  return patternMap[permission] || [];
}

/**
 * Generate rules for a specific type
 * @param {string} type - The rule type
 * @param {Array<Object>} patterns - Array of patterns for the rule type
 * @return {Object} Type-specific rules configuration
 */
function generateRulesForType(type, patterns) {
  return {
    name: type,
    patterns: patterns.map(pattern => ({
      pattern: pattern.pattern,
      message: pattern.message
    }))
  };
}

/**
 * Generate rules index configuration
 * @param {string[]} types - List of rule types
 * @returns {Object} Rules index configuration
 */
function generateRulesIndex(types) {
  return {
    version: CONFIG_VERSION,
    rules: types.map((type) => ({
      name: type,
      file: `${type}.json`,
      enabled: true,
      severity: type === 'security' ? 'error' : 'warning',
    })),
  };
}

/**
 * Generate Cursor configuration
 * @returns {Object} Cursor configuration
 */
function generateCursorConfig() {
  return {
    version: CONFIG_VERSION,
    rules: {
      enabled: true,
      directory: 'rules',
    },
    editor: {
      formatOnSave: true,
      tabSize: 2,
      insertSpaces: true,
    },
  };
}

/**
 * Generate base rules configuration
 * @returns {Object} Base rules configuration
 */
function generateBaseRules() {
  return {
    version: CONFIG_VERSION,
    rules: [
      {
        name: 'codeStyle',
        enabled: true,
        severity: 'warning',
      },
      {
        name: 'security',
        enabled: true,
        severity: 'error',
      },
      {
        name: 'performance',
        enabled: true,
        severity: 'warning',
      },
      {
        name: 'documentation',
        enabled: true,
        severity: 'info',
      },
    ],
  };
}

/**
 * Generate Cursor rules based on role
 * @param {string} role - The role to generate rules for
 * @returns {Promise<boolean>} Whether the rules were generated successfully
 */
async function generateCursorRules(role) {
  try {
    const cursorRulesDir = path.join(projectRoot, '.cursor', 'rules');
    await fs.ensureDir(cursorRulesDir);

    const baseRules = generateBaseRules();
    if (!validateRules(baseRules.rules)) {
      throw new Error('Invalid base rules configuration');
    }

    // Add permission-based patterns
    const permissionPatterns = generatePatternsForPermission(role);
    baseRules.rules = deduplicateRules([
      ...baseRules.rules,
      ...permissionPatterns,
    ]);

    await fs.writeJson(path.join(cursorRulesDir, 'base.json'), baseRules, {
      spaces: 2,
    });

    const ruleTypes = ['codeStyle', 'security', 'performance', 'documentation'];
    for (const type of ruleTypes) {
      const rules = generateRulesForType(type);
      if (!validateRules([rules])) {
        throw new Error(`Invalid rules configuration for type: ${type}`);
      }
      await fs.writeJson(path.join(cursorRulesDir, `${type}.json`), rules, {
        spaces: 2,
      });
    }

    const rulesIndex = generateRulesIndex(ruleTypes);
    if (!validateConfig(rulesIndex)) {
      throw new Error('Invalid rules index configuration');
    }
    await fs.writeJson(path.join(cursorRulesDir, 'index.json'), rulesIndex, {
      spaces: 2,
    });

    // Add role-specific suggestions to config
    const cursorConfig = generateCursorConfig();
    cursorConfig.suggestions = Object.keys(suggestionMap).reduce((acc, key) => {
      acc[key] = convertToSuggestion(key, role);
      return acc;
    }, {});

    if (!validateConfig(cursorConfig)) {
      throw new Error('Invalid cursor configuration');
    }
    await fs.writeJson(path.join(cursorRulesDir, 'config.json'), cursorConfig, {
      spaces: 2,
    });

    debug('Generated and synced role-specific rules');
    return true;
  } catch (err) {
    error(`Failed to generate rules: ${err.message}`);
    return false;
  }
}

/**
 * Gets role-specific patterns for linting and validation
 * @param {string} role - The role to get patterns for (frontend, backend, devops, infra)
 * @returns {Array<{name: string, enabled: boolean, severity: string, patterns: Array<{pattern: string, message: string}>}>}
 */
function getRoleSpecificPatterns(role) {
  const patterns = [];

  // Add language-specific patterns
  const languagePatterns = getLanguagePatterns(role);
  patterns.push(...languagePatterns);

  // Add framework-specific patterns
  const frameworkPatterns = getFrameworkPatterns(role);
  patterns.push(...frameworkPatterns);

  // Add role-specific patterns
  switch (role) {
  case 'frontend': {
    patterns.push({
      name: 'frontendCodeStyle',
      enabled: true,
      severity: 'warning',
      patterns: [
        {
          pattern: '^\\s{2}[^\\s]',
          message: 'Use 2 spaces for indentation in frontend files',
        },
        {
          pattern: '\\b[a-z][a-zA-Z0-9]*\\b(?!\\s*:)',
          message: 'Use camelCase for variable and function names',
        },
      ],
    });
    break;
  }

  case 'backend': {
    patterns.push({
      name: 'backendCodeStyle',
      enabled: true,
      severity: 'warning',
      patterns: [
        {
          pattern: '^\\s{2}[^\\s]',
          message: 'Use 2 spaces for indentation in backend files',
        },
        {
          pattern: '\\b[a-z][a-zA-Z0-9]*\\b(?!\\s*:)',
          message: 'Use camelCase for function and variable names',
        },
        {
          pattern: '\\b[A-Z][A-Z0-9_]+\\b',
          message: 'Use UPPER_CASE for constants',
        },
        {
          pattern: '\\b[A-Z][a-zA-Z0-9]*\\b',
          message: 'Use PascalCase for class names',
        },
      ],
    });
    break;
  }

  case 'devops': {
    patterns.push({
      name: 'devopsSecurityChecks',
      enabled: true,
      severity: 'error',
      patterns: [
        {
          pattern: '\\b(password|secret|token|key)\\s*=\\s*[\'"][^\'"]+"[\'"]',
          message: 'Do not hardcode sensitive information in DevOps scripts',
        },
        {
          pattern: '\\b(http|ws)://\\b',
          message: 'Use HTTPS/WSS for secure connections in configurations',
        },
      ],
    });
    break;
  }

  case 'infra': {
    patterns.push({
      name: 'infraSecurityChecks',
      enabled: true,
      severity: 'error',
      patterns: [
        {
          pattern: '\\b(password|secret|token|key)\\s*=\\s*[\'"][^\'"]+"[\'"]',
          message: 'Do not hardcode sensitive information in infrastructure code',
        },
        {
          pattern: '\\b(http|ws)://\\b',
          message: 'Use HTTPS/WSS for secure connections in infrastructure',
        },
      ],
    });
    break;
  }

  case 'django': {
    patterns.push({
      pattern: '@view\\s*\\([^)]*\\)\\s*def\\s+\\w+\\s*\\([^)]*\\)\\s*:(?![^\\n]*""")',
      message: 'Add docstring to describe view purpose'
    });
    patterns.push({
      pattern: 'models\\.\\w+Field\\([^)]*\\)(?![^\\n]*help_text)',
      message: 'Add help_text to model fields for better documentation'
    });
  }
  }

  return patterns;
}

function getFrameworkPatterns(framework) {
  const patterns = {
    react: [
      {
        name: 'reactBestPractices',
        patterns: [
          {
            pattern: 'React\\.memo\\(',
            message: 'Document performance optimization decisions'
          },
          {
            pattern: 'useCallback\\(\\s*\\([^)]*\\)\\s*=>',
            message: 'Ensure proper dependency array in useCallback'
          },
          {
            pattern: 'useMemo\\(\\s*\\(\\)\\s*=>',
            message: 'Consider if memoization is necessary here',
          },
          {
            pattern: '<\\w+\\s+style="',
            message: 'Consider using styled-components or CSS modules',
          },
        ]
      },
      {
        name: 'reactPerformance',
        patterns: [
          {
            pattern: 'useState\\(\\[\\]\\)',
            message: 'Consider using useRef for non-reactive arrays',
          },
          {
            pattern: '\\.map\\(.*=>.*<\\w+',
            message: 'Add key prop to mapped elements',
          },
        ],
      },
    ],
    vue: [
      {
        name: 'vueBestPractices',
        patterns: [
          {
            pattern: 'data\\(\\s*\\)\\s*{\\s*return\\s*{',
            message: 'Use composition API for better type support'
          },
          {
            pattern: '@click="',
            message: 'Consider extracting complex event handlers',
          },
        ]
      },
    ],
    angular: [
      {
        name: 'angularBestPractices',
        patterns: [
          {
            pattern: '@Input\\(\\)\\s+\\w+',
            message: 'Document component inputs',
          },
          {
            pattern: '@Output\\(\\)\\s+\\w+',
            message: 'Document component outputs',
          },
        ],
      },
    ],
    express: [
      {
        name: 'expressBestPractices',
        patterns: [
          {
            pattern: 'app\\.use\\(',
            message: 'Document middleware purpose and order',
          },
          {
            pattern: 'router\\.(get|post|put|delete)',
            message: 'Add input validation middleware',
          },
          {
            pattern: 'res\\.status\\([^)]+\\)\\.send',
            message: 'Use consistent error response format',
          },
        ],
      },
    ],
    nest: [
      {
        name: 'nestBestPractices',
        patterns: [
          {
            pattern: '@Controller\\(',
            message: 'Document controller responsibility',
          },
          {
            pattern: '@Injectable\\(',
            message: 'Document service scope and purpose',
          },
        ],
      },
    ],
    spring: [
      {
        name: 'springBestPractices',
        patterns: [
          {
            pattern: '@Controller|@RestController|@Service|@Repository',
            message: 'Document component purpose and dependencies'
          }
        ]
      }
    ]
  };

  return patterns[framework] || [];
}

class InitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InitializationError';
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

async function initializeProject() {
  try {
    // Validate environment first
    if (!validateEnvironment()) {
      throw new ValidationError('Environment validation failed');
    }

    // Create necessary directories
    await fs.ensureDir(path.join(projectRoot, '.cursor/rules'));
    await fs.ensureDir(path.join(projectRoot, '.github/workflows'));

    // Generate and write all rules
    const success = await generateCursorRules(role);
    if (!success) {
      throw new InitializationError('Failed to generate cursor rules');
    }

    success('Successfully initialized Cursor configuration');
  } catch (err) {
    error(`Failed to initialize: ${err.message}`);
    throw err;
  }
}

// Run the initialization
(async () => {
  try {
    await copyAll();
  } catch (err) {
    error(`Failed to copy files: ${err.message}`);
    process.exit(1);
  }
})();

// Export functions
export const utils = {
  deduplicateRules,
  convertToSuggestion,
  generatePatternsForPermission,
  getRoleSpecificPatterns
};

export {
  initializeProject,
  generateCursorRules
};
