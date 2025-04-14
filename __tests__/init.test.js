const fs = require('fs-extra');
const path = require('path');
const { init } = require('../lib/init');

jest.mock('fs-extra');

describe('init', () => {
  const mockProjectRoot = '/mock/project/root';
  const mockTemplatesDir = path.join(mockProjectRoot, 'templates');
  const mockCursorDir = path.join(mockTemplatesDir, '.cursor');
  const mockRulesDir = path.join(mockCursorDir, 'rules');

  beforeEach(() => {
    jest.clearAllMocks();
    process.cwd = jest.fn().mockReturnValue(mockProjectRoot);
  });

  it('should create required directories', async () => {
    await init('frontend');

    expect(fs.ensureDir).toHaveBeenCalledWith(mockTemplatesDir);
    expect(fs.ensureDir).toHaveBeenCalledWith(mockCursorDir);
    expect(fs.ensureDir).toHaveBeenCalledWith(mockRulesDir);
  });

  it('should copy role-specific rules', async () => {
    const mockRoleContent = 'mock role content';
    fs.readFileSync.mockReturnValue(mockRoleContent);

    await init('frontend');

    expect(fs.copy).toHaveBeenCalledWith(
      path.join(mockTemplatesDir, 'roles', 'frontend.cursor'),
      path.join(mockRulesDir, 'frontend.mdc')
    );
  });

  it('should create config.json', async () => {
    await init('frontend');

    expect(fs.writeJson).toHaveBeenCalledWith(
      path.join(mockCursorDir, 'config.json'),
      expect.objectContaining({
        version: expect.any(String),
        rules: expect.any(Object)
      }),
      { spaces: 2 }
    );
  });

  it('should handle errors gracefully', async () => {
    fs.ensureDir.mockRejectedValueOnce(new Error('Mock error'));

    await expect(init('frontend')).rejects.toThrow('Mock error');
  });
}); 