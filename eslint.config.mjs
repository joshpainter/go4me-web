// ESLint Flat Config for Next.js + TypeScript + Prettier
// Follows ESLint v9+ flat config format

import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const config = [
  // Ignore common build and cache directories
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'tests/test-results/**',
      'tests/reports/**',
      'tests/screenshots/**',
    ],
  },

  // JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended configs (parser + rules)
  ...tseslint.configs.recommended,

  // Next.js rules (core web vitals)
  ...compat.extends('next/core-web-vitals'),

  // Disable formatting-related ESLint rules to let Prettier handle formatting
  eslintConfigPrettier,

  // Project rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Prefer unused-imports plugin for dead code detection
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      // Keep legacy Next.js rule override from previous config
      '@next/next/no-html-link-for-pages': 'off',

      // TypeScript: rely on unused-imports instead of TS rule
      '@typescript-eslint/no-unused-vars': 'off',

      // Make migration non-blocking
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'import/no-anonymous-default-export': 'off',
    },
  },
]

export default config
