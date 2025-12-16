import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  shims: true,
  format: ['esm']
})
