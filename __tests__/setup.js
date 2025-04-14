// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock process.exit
process.exit = jest.fn();

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  copy: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  writeJson: jest.fn(),
  existsSync: jest.fn(),
  readJson: jest.fn(),
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

// Mock commander
jest.mock('commander', () => ({
  program: {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn(),
  },
})); 