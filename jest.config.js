module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Preset for TypeScript
    preset: 'ts-jest',
    
    // Root directory
    rootDir: '.',
    
    // Test match patterns
    testMatch: [
      '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
      '<rootDir>/src/**/*.{test,spec}.{ts,tsx}'
    ],
    
    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    
    // Transform configuration
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest'
    },
    
    // Module name mapping for path aliases
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    
    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
      'src/**/*.{ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/__tests__/**',
      '!src/server.ts' // Exclude main server file from coverage
    ],
    
    // Coverage thresholds
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    
    // Test timeout
    testTimeout: 30000,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Verbose output
    verbose: true,
    
    // Globals for ts-jest
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json'
      }
    },
    
    // Ignore patterns
    testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/dist/'
    ],
    
    // Module paths to ignore
    modulePathIgnorePatterns: [
      '<rootDir>/dist/'
    ]
  };