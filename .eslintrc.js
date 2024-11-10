module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: [
    'airbnb-base',
    'plugin:node/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:promise/recommended',
    'plugin:jsdoc/recommended',
  ],
  plugins: ['import', 'node', 'promise', 'jsdoc'],
  rules: {
    'no-console': 'off',
    'no-var': 'error',
    'prefer-const': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'import/order': [
      'error',
      {
        groups: [['builtin', 'external', 'internal']],
        'newlines-between': 'always',
      },
    ],
    'node/no-unsupported-features/es-syntax': 'off',
    'promise/always-return': 'warn',
    'promise/catch-or-return': 'error',
    'jsdoc/check-alignment': 'error',
    'jsdoc/check-param-names': 'error',
    'jsdoc/require-jsdoc': 'warn',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
  },
};
