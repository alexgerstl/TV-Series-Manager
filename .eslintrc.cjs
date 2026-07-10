/* eslint-env node */
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.main.json', './tsconfig.renderer.json', './tsconfig.eslint.json'],
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'import', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    react: { version: 'detect', runtime: 'automatic' },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.main.json', './tsconfig.renderer.json', './tsconfig.eslint.json'],
      },
    },
  },
  rules: {
    // React 18 JSX automatic runtime — no need for React to be in scope.
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // Architecture §3.4: async-heavy app, floating promises are a real bug class here.
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    // Architecture §3.4: named exports only for services/classes.
    'import/no-default-export': 'warn',
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-imports': 'warn',
  },
  overrides: [
    {
      // React components conventionally use default export for the component itself;
      // relax the no-default-export rule there while keeping it strict for services.
      files: ['src/renderer/**/*.tsx', '*.config.ts', '*.config.cjs', 'electron.vite.config.ts'],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
};
