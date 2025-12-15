import type { RestoreCommandArgs } from '#/types'

import path from 'node:path'

import { spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { base64ToFile } from '#/core/base64'
import { tryCatch } from '#/utils/errors'
import {
  createCommandContext,
  getInputPath,
  getOutputDir,
  loadArchive
} from '#/utils/helpers'

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
    const typedArgs = args as unknown as RestoreCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入路径
      const inputPath = await getInputPath(typedArgs.input, {
        message: '请输入 JSON 文件路径',
        placeholder: 'archive.json',
        validateExtension: '.json'
      })

      // 获取输出目录
      const outputDir = await getOutputDir(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 执行恢复
      const s = spinner()
      s.start('正在恢复')

      const archiveData = await loadArchive(inputPath,'base64')
      const restoredPath = await base64ToFile(archiveData, outputDir)

      s.stop(
        `文件已恢复到: ${cyan(restoredPath)}, 原始创建时间 ${bold.gray(archiveData.createdAt)}`
      )

      ctx.showOutro('🎉 恢复完成')
    })
  }
})
