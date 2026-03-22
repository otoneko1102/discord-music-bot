// @ts-check
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Ignore generated / third-party files
  { ignores: ['dist/**', 'node_modules/**', '*.mjs'] },

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Disable rules that conflict with Prettier formatting
  prettierConfig,

  // Project-specific rules
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
);
