const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', '.expo/*', 'e2e/.build/*', 'test-results/*', 'playwright-report/*'] },
  { files: ['e2e/*.js'], languageOptions: { globals: { __dirname: 'readonly', process: 'readonly' } } },
];
