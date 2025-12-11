import ansis from 'ansis'

export const logger = {
  success: (msg: string) => console.log(`${ansis.green('✓')}  ${msg}`),
  error: (msg: string) => console.log(`${ansis.red('✗')}  ${msg}`),
  info: (msg: string) => console.log(`${ansis.cyan('ℹ')}  ${msg}`),
  warn: (msg: string) => console.log(`${ansis.yellow('⚠')}  ${msg}`),
  dim: (msg: string) => console.log(`${ansis.dim('•')}  ${msg}`)
}
