/**
 * Jest test setup file
 * This file is run before each test file
 */

import { jest } from '@jest/globals';

// Mock axios globally for ES modules
jest.unstable_mockModule('axios', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }))
  }
}));

// Extend Jest matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Declare custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Set up global test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Mock environment variables for tests
process.env.GOOGLE_PLACES_API_KEY = 'test-google-key';
process.env.MAX_REQUESTS_PER_MINUTE = '100';
process.env.CACHE_DURATION_MINUTES = '5';
process.env.API_TIMEOUT = '5000';
process.env.SCRAPING_TIMEOUT = '3000';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error, // Keep error for debugging
};

// Restore console after tests
afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

export {};