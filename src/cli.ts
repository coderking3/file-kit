import process from 'node:process'

import { intro } from '@clack/prompts'
import ansis from 'ansis'
import { defineCommand, runMain } from 'citty'

import { base64, decrypt, encrypt, restore, v2a } from './commands'
import { CLI_ALIAS, CLI_NAME, CLI_VERSION } from './config/defaults'
import { logger } from './utils/logger'
import { select } from './utils/prompts'

// 命令映射表
const COMMAND_MAP = {
  base64,
  restore,
  'video-to-audio': v2a,
  encrypt,
  decrypt
} as const

// 交互选项配置
const INTERACTIVE_OPTIONS = [
  {
    value: 'base64',
    label: ansis.cyan('📦 文件转 Base64'),
    hint: '将任意文件编码为 Base64 JSON'
  },
  {
    value: 'restore',
    label: ansis.green('🔄 Base64 还原文件'),
    hint: '从 Base64 JSON 恢复原始文件'
  },
  {
    value: 'video-to-audio',
    label: ansis.magenta('🎵 视频提取音频'),
    hint: '从视频中提取音频轨道'
  },
  {
    value: 'encrypt',
    label: ansis.red('🔐 文件加密'),
    hint: '加密文件并生成 Crypto JSON'
  },
  {
    value: 'decrypt',
    label: ansis.green('🔓 文件解密'),
    hint: '从 Crypto JSON 解密还原文件'
  }
]

const cliArgs = {
  help: false,
  version: false
}

function preprocessArgs(rawArgs: string[]) {
  cliArgs.help = rawArgs.some((arg) => arg === '--help' || arg === '-h')
  cliArgs.version = rawArgs.some((arg) => arg === '--version' || arg === '-v')

  if (cliArgs.help) {
    const excludeHelpArgs = rawArgs.filter(
      (arg) => arg !== '--help' && arg !== '-h'
    )
    process.argv = excludeHelpArgs
  }
}

/**
 * 显示版本信息
 */
function showVersion() {
  console.log(
    ansis.cyan(`
  ╭──────────────────────────╮
  │   🔧 ${ansis.bold(CLI_NAME)} · ${ansis.dim(`v${CLI_VERSION}`.padEnd(9))}│
  ╰──────────────────────────╯
`)
  )
  console.log(ansis.bold('  多功能文件工具箱\n'))
  console.log(ansis.gray('  🔄 Base64 互转    🎧 音频提取    🔐 文件加密\n'))
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(
    `${ansis.bold.cyan(`🔧 ${CLI_NAME}`)}${ansis.dim(` - 多功能文件工具箱 (${CLI_ALIAS} v${CLI_VERSION})`)}\n`
  )

  console.log(ansis.bold('用法:'))
  console.log(`  ${CLI_ALIAS} <command> [options]     执行指定命令`)
  console.log(`  ${CLI_ALIAS} -i, --interactive       进入交互模式`)
  console.log(`  ${CLI_ALIAS} -v, --version           显示版本信息`)
  console.log(`  ${CLI_ALIAS} -h, --help              显示帮助信息（默认）\n`)

  console.log(ansis.bold('命令:'))
  console.log(`  ${ansis.cyan('base64')}                      文件转 Base64`)
  console.log(`  ${ansis.green('restore')}                     Base64 还原文件`)
  console.log(`  ${ansis.magenta('video-to-audio, v2a')}         视频提取音频`)
  console.log(`  ${ansis.red('encrypt')}                     加密文件`)
  console.log(`  ${ansis.green('decrypt')}                     解密文件\n`)

  console.log(ansis.bold('示例:'))
  console.log(`  ${CLI_ALIAS} base64 file.txt                转换文件为 Base64`)
  console.log(`  ${CLI_ALIAS} restore file.json              还原 Base64 文件`)
  console.log(
    `  ${CLI_ALIAS} v2a video.mp4 -f mp3           提取视频音频为 MP3`
  )
  console.log(`  ${CLI_ALIAS} encrypt secret.txt -p pwd      加密文件`)
  console.log(`  ${CLI_ALIAS} decrypt secret.json -p pwd     解密文件`)
  console.log(`  ${CLI_ALIAS} -i                             交互式选择功能\n`)
}

/**
 * 交互模式
 */
async function runInteractiveMode() {
  intro(ansis.bold.cyan(`🔧 ${CLI_NAME}`))

  const choice = await select<keyof typeof COMMAND_MAP>({
    message: '选择功能',
    options: INTERACTIVE_OPTIONS
  })

  const selectedCommand = COMMAND_MAP[choice]

  if (!selectedCommand) {
    logger.error(`未知命令: ${choice}`)
    process.exit(1)
  }

  await selectedCommand.run?.({
    rawArgs: ['-i'],
    args: { _: [] },
    cmd: {}
  } as any)
}

const main = defineCommand({
  meta: {
    name: 'cvt',
    version: '2.0.0',
    description: '🔧 Converter Kit - 现代化文件转换工具'
  },

  args: {
    interactive: {
      type: 'boolean',
      alias: 'i',
      description: '进入交互模式',
      default: false
    }
  },

  // 子命令定义
  subCommands: {
    base64: () => base64,
    restore: () => restore,
    'video-to-audio': () => v2a,
    v2a: () => v2a,
    encrypt,
    decrypt
  },

  // 默认行为
  async run({ args, rawArgs }) {
    if (args.interactive) {
      await runInteractiveMode()
    }

    if (cliArgs.version) {
      showVersion()
      process.exit(0)
    }

    if (cliArgs.help || rawArgs.length === 0) {
      showHelp()
      process.exit(0)
    }
  }
})

preprocessArgs(process.argv)
runMain(main)
