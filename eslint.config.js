// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules/**', '.expo/**', 'android/**', 'ios/**', '.superpowers/**', 'dist/**', 'modules/*/nitrogen/**', 'modules/*/post-script.js', 'supabase/functions/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['eslint.config.js', '*.config.js', 'babel.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['src/kinematics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react-native', 'react-native-*', '@react-native/*', 'react', 'expo', 'expo-*', '@expo/*'], message: 'kinematics es TypeScript puro: sin React, React Native ni Expo.' },
            { group: ['@/*', '!@/core', '!@/core/*', '**/features/**', '**/vision/**', '**/data/**', '**/ui/**', '**/gamification/**', '**/sync/**', '**/i18n/**', '**/audio/**'], message: 'kinematics solo puede importar src/core.' },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'El tiempo llega en frame.tMs.' },
        { object: 'Math', property: 'random', message: 'Usa un PRNG con semilla.' },
      ],
      'no-console': 'error',
    },
  },
);
