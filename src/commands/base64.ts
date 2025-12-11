import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { CLI_NAME } from '#/constants'
import { fileToBase64 } from '#/core/base64-converter'
import { fileExists, getFileName } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'

export default defineCommand({
  meta: {
    name: 'base64',
    description: '将文件转换为 Base64 JSON'
  },
  args: {
    input: {
      type: 'positional',
      description: '输入文件路径'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出文件目录'
    }
  },
  async run({ args, rawArgs }) {
    const isMainInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')
    if (!isMainInteractive) intro(bold.cyan(`🔧 ${CLI_NAME}`))

    let inputPath = args.input
    let outputDir = args.output

    if (!inputPath) {
      inputPath = await text({
        message: '请输入文件路径',
        placeholder: 'file.txt',
        validate: (value) => {
          if (!value) return '文件路径不能为空'
          if (!fileExists(value)) return '文件不存在'
        }
      })
    } else if (!fileExists(inputPath)) {
      logger.error(`文件不存在: ${inputPath}`)
      process.exit(1)
    }

    if (!outputDir) {
      const defaultOutputDir = path.dirname(inputPath)
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

    const outputPath = path.join(
      outputDir,
      `${getFileName(inputPath, { withoutExt: true })}.json`
    )

    try {
      const s = spinner()
      s.start('正在转换')
      s.message(`正在转换`)

      const archiveData = await fileToBase64(inputPath, outputPath)
      s.stop(
        `文件已保存到: ${cyan(outputPath)}，共计 ${bold.gray((archiveData.file.size / 1024).toFixed(2))} KB`
      )

      outro(bold.green('🎉 转换完成'))
    } catch (error) {
      logger.error(`转换失败: ${error}`)
      process.exit(1)
    }
  }
})
