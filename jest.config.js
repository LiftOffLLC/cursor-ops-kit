module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.js',
    'bin/**/*.js'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    './__tests__/setup.js'
  ]
}; 