import type { Base64CommandArgs } from '#/types'

import path from 'node:path'

import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { fileToBase64 } from '#/core/base64'
import { tryCatch } from '#/utils/errors'
import { buildOutputPath, createCommandContext } from '#/utils/helpers'

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
      description: '输出目录'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as Base64CommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    tryCatch(async () => {
      // 获取输入路径
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: 'file.txt'
      })

      // 获取输出目录
      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 构建输出路径
      const outputPath = buildOutputPath(inputPath, outputDir, 'base64.json')

      // 执行转换
      const loading = ctx.loading('正在转换')
      const archiveData = await fileToBase64(inputPath, outputPath)

      loading.close(
        `文件已保存到: ${cyan(outputPath)}, 共计 ${bold.gray((archiveData.file.size / 1024).toFixed(2))} KB`
      )

      ctx.showOutro('📦 转换完成')
    })
  }
})
