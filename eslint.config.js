import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  markdown: false,
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  ignores: ['node_modules', 'dist', 'plans/**'],
  rules: {
    'no-console': 'off',
    'node/prefer-global/process': 'off',
  },
})
