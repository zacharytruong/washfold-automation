import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  markdown: false,
  stylistic: {
    indent: 2,
    quotes: 'single',
    braceStyle: '1tbs',
  },
  ignores: ['node_modules', 'dist', 'plans/**'],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
    'curly': ['error', 'all'],
    'antfu/if-newline': 'error',
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['../*', './*'],
        message: 'Use @/ path alias instead of relative imports.',
      }],
    }],
  },
})
