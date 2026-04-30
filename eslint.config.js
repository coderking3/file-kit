import { defineConfig } from '@king-3/eslint-config'

export default defineConfig(
  {
    type: 'lib',
    typescript: true
  },
  {
    rules: {
      'no-console': 'off',
      'antfu/no-import-dist': 'off'
    }
  }
)
