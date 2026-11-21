// ESLint flat config: Airbnb base style (ESLint 9).
// eslint-config-airbnb-extended/legacy ports the rules of the official
// eslint-config-airbnb-base, which only supports ESLint 7/8.
import globals from 'globals';
import { configs } from 'eslint-config-airbnb-extended/legacy';

export default [
  {
    ignores: [
      'node_modules/',
      'arduino/',
      // rtl_433 device tables still in their original C, not yet converted to JS
      'samples/rtl_433_ook_pulse_nrz.js',
      'samples/rtl_433_ook_pulse_pwm.js',
    ],
  },
  ...configs.base.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'linebreak-style': 'off', // files are edited on Windows (CRLF) and Linux
      'no-console': 'off', // CLI prints to stdout/stderr
      'no-bitwise': 'off', // PSI decoding works on bits
      'no-plusplus': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    rules: {
      // eslint-plugin-import cannot resolve this ESM-only subpath export
      'import/no-unresolved': 'off',
    },
  },
];
