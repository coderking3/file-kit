import type { RestoreCommandArgs } from '#/types'

import path from 'node:path'

import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { base64ToFile } from '#/core/base64'
import { tryCatch } from '#/utils/errors'
import { createCommandContext, loadArchive } from '#/utils/helpers'

export default defineCommand({
  meta: {
    name: 'restore',
    description: '从 Base64 JSON 恢复文件'
  },
  args: {
    input: {
      type: 'positional',
      description: 'Base64 文件 (*.base64.txt)'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as RestoreCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入路径
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: '*.base64.txt',
        validateExtension: 'base64.txt'
      })

      // 获取输出目录
      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 执行恢复
      const loading = ctx.loading('正在恢复')

      const archiveData = await loadArchive(inputPath, 'base64')
      const restoredPath = await base64ToFile(archiveData, outputDir)

      loading.close(
        `文件已恢复到: ${cyan(restoredPath)}, 原始创建时间 ${bold.gray(archiveData.createdAt)}`
      )

      ctx.showOutro('🔄 恢复完成')
    })
  }
})
