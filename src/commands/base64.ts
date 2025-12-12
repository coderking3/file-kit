import path from 'node:path'

import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import type { Base64CommandArgs } from '#/types'

import { fileToBase64 } from '#/core/base64-converter'
import { buildOutputPath } from '#/utils/file'
import {
  createCommandContext,
  createSpinner,
  getOutputDir,
  getValidatedInputPath,
  handleCommandError
} from '#/utils/command-helpers'

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
    const typedArgs = args as unknown as Base64CommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await handleCommandError(async () => {
      // 获取输入路径
      const inputPath = await getValidatedInputPath(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: 'file.txt'
      })

      // 获取输出目录
      const outputDir = await getOutputDir(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 构建输出路径
      const outputPath = buildOutputPath(inputPath, outputDir, 'json')

      // 执行转换
      const spinner = createSpinner()
      spinner.start('正在转换')

      const archiveData = await fileToBase64(inputPath, outputPath)

      spinner.stop(
        `文件已保存到: ${cyan(outputPath)},共计 ${bold.gray((archiveData.file.size / 1024).toFixed(2))} KB`
      )

      ctx.showOutro('🎉 转换完成')
    }, '转换失败')
  }
})
