export default {
  testEnvironment: 'node',
  // Explicitly tell Babel Jest how to find the config
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  // Ensure openai module itself is transformed if needed (it's ESM)
  transformIgnorePatterns: [
    '/node_modules/(?!(openai)/)' // Adjust if other ESM modules in node_modules need transforming
  ],
  // Point Jest to the setup file for mocks
  setupFilesAfterEnv: ['./__tests__/setupMocks.js'],
  // Map imports of 'openai' to our mock setup file
  moduleNameMapper: {
    // Match the exact module name 'openai' and point to the mock setup
    // Use <rootDir> to ensure the path is absolute from the project root
    '^openai$': '<rootDir>/__tests__/setupMocks.js'
  },
  // Explicitly look for test files ending in .test.js
  testMatch: [
    '**/__tests__/**/*.test.js?(x)',
    '**/?(*.)+(spec|test).js?(x)'
  ]
};
