module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json'
    },
    plugins: [
      '@typescript-eslint'
    ],
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      '@typescript-eslint/recommended-requiring-type-checking'
    ],
    root: true,
    env: {
      node: true,
      es6: true,
      jest: true
    },
    ignorePatterns: [
      'dist/',
      'node_modules/',
      '*.js',
      '*.d.ts'
    ],
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-const': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      
      // General ESLint rules
      'no-console': 'off', // We use console for logging in this project
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-await-in-loop': 'warn',
      'no-return-await': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      
      // Code style
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'radix': 'error',
      'wrap-iife': 'error',
      
      // Variables
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-restricted-globals': 'error',
      'no-shadow': 'off', // Disabled in favor of TypeScript version
      '@typescript-eslint/no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',
      'no-undefined': 'off',
      'no-use-before-define': 'off', // Disabled in favor of TypeScript version
      '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
      
      // Error prevention
      'no-cond-assign': 'error',
      'no-constant-condition': 'error',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-obj-calls': 'error',
      'no-regex-spaces': 'error',
      'no-sparse-arrays': 'error',
      'no-unreachable': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    },
    overrides: [
      {
        files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
        env: {
          jest: true
        },
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          '@typescript-eslint/no-non-null-assertion': 'off'
        }
      }
    ]
  };