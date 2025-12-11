import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { CLI_NAME } from '#/constants'
import { compressFiles } from '#/core/compressor'
import { fileExists, getFileName } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'

export default defineCommand({
  meta: {
    name: 'compress',
    description: '压缩文件或文件夹'
  },
  args: {
    input: {
      type: 'positional',
      description: '输入文件或文件夹路径'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录'
    },
    level: {
      type: 'string',
      alias: 'l',
      description: '压缩级别 (0-9)'
    }
  },
  async run({ args, rawArgs }) {
    const isMainInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')
    if (!isMainInteractive) intro(bold.cyan(`🔧 ${CLI_NAME}`))

    let inputPath = args.input
    let outputDir = args.output
    let compressionLevel = args.level

    if (!inputPath) {
      inputPath = await text({
        message: '请输入文件或文件夹路径',
        placeholder: 'folder',
        validate: (value) => {
          if (!value) return '路径不能为空'
          if (!fileExists(value)) return '路径不存在'
        }
      })
    } else if (!fileExists(inputPath)) {
      logger.error(`路径不存在: ${inputPath}`)
      process.exit(1)
    }

    if (!outputDir) {
      const defaultOutputDir = './.output'
      const shouldUseDefault = await confirm({
        message: `使用默认输出目录: ${defaultOutputDir}`
      })

      outputDir = shouldUseDefault
        ? defaultOutputDir
        : await text({
            message: '请输入输出目录',
            placeholder: './.output'
          })
    }

    if (!compressionLevel) {
      const defaultLevel = '6' // 默认为 '6'
      const shouldUseDefault = await confirm({
        message: `使用默认压缩级别: ${defaultLevel} (速度/平衡)`
      })

      const levelInput = shouldUseDefault
        ? defaultLevel
        : await text({
            message: '请输入新的压缩级别 (0-9)',
            placeholder: `0=最快, 9=最小`,
            // initialValue: defaultLevel,
            validate: (value) => {
              if (!value) return '压缩级别不能为空'
              const num = Number.parseInt(value)
              if (Number.isNaN(num)) return '请输入数字'
              if (num < 0 || num > 9) return '级别必须在 0 到 9 之间'
              return undefined
            }
          })

      // 如果用户输入了值，则更新 compressionLevel
      if (typeof levelInput === 'string') {
        compressionLevel = levelInput
      }
    }

    const outputPath = path.join(
      outputDir,
      `${getFileName(inputPath, { withoutExt: true })}.zip`
    )

    try {
      const s = spinner()
      s.start('正在压缩')
      s.message(`正在压缩`)

      await compressFiles(inputPath, outputPath, {
        level: Number.parseInt(args.level as string) as any
      })

      s.stop(`文件已压缩到: ${cyan(outputPath)}`)

      outro(bold.green('🎉 压缩完成'))
    } catch (error) {
      logger.error(`压缩失败: ${error}`)
      process.exit(1)
    }
  }
})
