import type { RestoreCommandArgs } from '#/types'

import path from 'node:path'

import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { base64ToFile, chunkedBase64ToFile } from '#/core/base64'
import { tryCatch, ValidationError } from '#/utils/errors'
import {
  createCommandContext,
  discoverChunks,
  isChunkedArchive,
  loadArchive,
  loadChunkedArchive
} from '#/utils/helpers'

export default defineCommand({
  meta: {
    name: 'restore',
    description: '从 Base64 JSON 恢复文件'
  },
  args: {
    input: {
      type: 'positional',
      description: 'Base64 文件 (*.base64.txt 或 *.base64.partN.txt)'
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
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: '*.base64.txt 或 *.base64.partN.txt',
        validateExtension: 'base64.txt'
      })

      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      const loading = ctx.loading('正在恢复')

      // 先加载输入文件判断是否为切片格式
      const archiveData = await loadArchive(inputPath, 'base64')

      if (isChunkedArchive(archiveData)) {
        // 切片模式：自动发现所有切片
        loading.update('正在扫描切片文件')
        const chunkPaths = await discoverChunks(inputPath)

        loading.update(
          `发现 ${chunkPaths.length}/${archiveData.chunk.total} 个切片，正在校验并恢复`
        )

        if (chunkPaths.length !== archiveData.chunk.total) {
          loading.close()
          throw new ValidationError(
            `切片不完整: 期望 ${archiveData.chunk.total} 个，实际发现 ${chunkPaths.length} 个`,
            'chunks'
          )
        }

        const chunks = await loadChunkedArchive(chunkPaths)
        const restoredPath = await chunkedBase64ToFile(chunks, outputDir)

        loading.close(
          `文件已恢复到: ${cyan(restoredPath)}, 共 ${bold.gray(String(archiveData.chunk.total))} 个切片, 原始创建时间 ${bold.gray(archiveData.createdAt)}`
        )
      } else {
        // 单文件模式
        const restoredPath = await base64ToFile(archiveData, outputDir)

        loading.close(
          `文件已恢复到: ${cyan(restoredPath)}, 原始创建时间 ${bold.gray(archiveData.createdAt)}`
        )
      }

      ctx.showOutro('🔄 恢复完成')
    })
  }
})
