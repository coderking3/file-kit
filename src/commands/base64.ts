import type { Base64CommandArgs } from '#/types'

import fs from 'node:fs/promises'
import path from 'node:path'

import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { DEFAULT_CONFIG } from '#/config/defaults'
import { fileToBase64, fileToBase64Chunked } from '#/core/base64'
import { tryCatch } from '#/utils/errors'
import { bufferToBase64 } from '#/utils/file'
import { buildOutputPath, createCommandContext } from '#/utils/helpers'
import { confirm } from '#/utils/prompts'

export default defineCommand({
  meta: {
    name: 'base64',
    description: '将文件转换为 Base64 JSON 文本'
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
    },
    split: {
      type: 'string',
      alias: 's',
      description: '切片转换，可指定每片大小(KB)，默认 1024'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as Base64CommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: 'file.txt'
      })

      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      const hasSplitFlag = rawArgs.includes('--split') || rawArgs.includes('-s')
      const chunkSizeKB = typedArgs.split
        ? Number.parseInt(typedArgs.split, 10)
        : DEFAULT_CONFIG.chunk.defaultSizeKB

      // 判断是否需要切片
      let shouldSplit = hasSplitFlag

      if (!shouldSplit && ctx.isInteractive) {
        const buffer = await fs.readFile(inputPath)
        const base64Len = bufferToBase64(buffer).length
        const thresholdBytes = DEFAULT_CONFIG.chunk.thresholdKB * 1024

        if (base64Len > thresholdBytes) {
          const sizeMB = (base64Len / 1024 / 1024).toFixed(2)
          shouldSplit = await confirm({
            message: `Base64 编码后大小为 ${bold(sizeMB)} MB，是否切片转换？`
          })
        }
      }

      if (shouldSplit) {
        const loading = ctx.loading('正在切片转换')
        const result = await fileToBase64Chunked(
          inputPath,
          outputDir,
          chunkSizeKB
        )

        loading.close(
          `已切片为 ${bold.gray(String(result.totalChunks))} 个文件，保存到: ${cyan(result.chunkDir)}，原始大小 ${bold.gray((result.originalSize / 1024).toFixed(2))} KB`
        )
      } else {
        const outputPath = buildOutputPath(inputPath, outputDir, 'base64.txt')
        const loading = ctx.loading('正在转换')
        const archiveData = await fileToBase64(inputPath, outputPath)

        loading.close(
          `文件已保存到: ${cyan(outputPath)}, 共计 ${bold.gray((archiveData.file.size / 1024).toFixed(2))} KB`
        )
      }

      ctx.showOutro('📦 转换完成')
    })
  }
})
