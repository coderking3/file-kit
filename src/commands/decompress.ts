import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { CLI_NAME } from '#/constants'
import { decompressFile } from '#/core/compressor'
import { fileExists, getFileName } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'

export default defineCommand({
  meta: {
    name: 'decompress',
    description: '解压 zip 文件'
  },
  args: {
    input: {
      type: 'positional',
      description: 'zip 文件路径'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '文件解压目录'
    }
  },
  async run({ args, rawArgs }) {
    const isMainInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')
    if (!isMainInteractive) intro(bold.cyan(`🔧 ${CLI_NAME}`))

    let inputPath = args.input
    let outputDir = args.output

    if (!inputPath) {
      inputPath = await text({
        message: '请输入 zip 文件路径',
        placeholder: 'archive.zip',
        validate: (value) => {
          if (!value) return '文件路径不能为空'
          if (!fileExists(value)) return '文件不存在'
          if (!value.endsWith('.zip')) return '请输入 zip 格式的文件'
        }
      })
    } else if (!fileExists(inputPath)) {
      logger.error(`文件不存在: ${inputPath}`)
      process.exit(1)
    }

    if (!outputDir) {
      const defaultOutputDir = path.join(
        path.dirname(inputPath),
        getFileName(inputPath, { withoutExt: true })
      )

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

    try {
      const s = spinner()
      s.start('正在解压')
      s.message(`正在解压`)

      const files = await decompressFile(inputPath, outputDir)

      s.stop(
        `文件已解压到: ${cyan(outputDir)}，共计 ${bold.gray(files.length.toString())} 个文件。`
      )

      outro(bold.green('🎉 解压完成'))
    } catch (error) {
      logger.error(`解压失败: ${error}`)
      process.exit(1)
    }
  }
})
