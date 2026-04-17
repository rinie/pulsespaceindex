module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es2020: true,
    node: true,
  },
  extends: 'airbnb-base',
  plugins: ['import'],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'linebreak-style': 0,
    'no-console': 0,
    'no-bitwise': 0,
    'no-plusplus': 0,
  },
};
