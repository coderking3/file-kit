import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { CLI_NAME } from '#/constants'
import { base64ToFile, loadArchive } from '#/core/base64-converter'
import { fileExists } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'

export default defineCommand({
  meta: {
    name: 'restore',
    description: '从 Base64 JSON 恢复文件'
  },
  args: {
    input: {
      type: 'positional',
      description: 'Base64 JSON 文件路径'
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
        message: '请输入 JSON 文件路径',
        placeholder: 'archive.json',
        validate: (value) => {
          if (!value) return '文件路径不能为空'
          if (!fileExists(value)) return '文件不存在'
          if (!value.endsWith('.json')) return '请输入 Base64 JSON 格式的文件'
        }
      })
    } else if (!fileExists(inputPath)) {
      logger.error(`文件不存在: ${inputPath}`)
      process.exit(1)
    }

    // 如果没有提供输出目录，使用默认值
    if (!outputDir) {
      const defaultOutputDir = path.dirname(inputPath) // 默认值：输入文件所在的目录
      const shouldUseDefault = await confirm({
        message: `使用默认输出目录: ${defaultOutputDir}`
      })

      outputDir = shouldUseDefault
        ? defaultOutputDir
        : await text({
            message: '请输入输出目录',
            placeholder: './.output' // 给出示例目录
          })
    }

    try {
      const s = spinner()
      s.start('正在恢复')
      s.message(`正在恢复`)

      const archiveData = await loadArchive(inputPath)
      const restoredPath = await base64ToFile(archiveData, outputDir)

      s.stop(
        `文件已恢复到: ${cyan(restoredPath)}，原始创建时间 ${bold.gray(archiveData.createdAt)}`
      )

      outro(bold.green('🎉 恢复完成'))
    } catch (error) {
      logger.error(`恢复失败: ${error}`)
      process.exit(1)
    }
  }
})
