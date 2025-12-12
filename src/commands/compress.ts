import type { CompressCommandArgs, CompressionLevel } from '#/types'

import { spinner } from '@clack/prompts'
import { cyan } from 'ansis'
import { defineCommand } from 'citty'

import { DEFAULT_CONFIG } from '#/config/defaults'
import { compressFiles } from '#/core/compressor'
import { tryCatch } from '#/utils/errors'
import {
  buildOutputPath,
  createCommandContext,
  getInputPath,
  getOutputDir
} from '#/utils/helpers'
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
    const typedArgs = args as unknown as CompressCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入路径
      const inputPath = await getInputPath(typedArgs.input, {
        message: '请输入文件或文件夹路径',
        placeholder: 'folder'
      })

      // 获取输出目录
      const outputDir = await getOutputDir(typedArgs.output, {
        defaultDir: DEFAULT_CONFIG.output.defaultDir
      })

      // 获取压缩级别
      let compressionLevel: CompressionLevel = DEFAULT_CONFIG.compress.level

      if (typedArgs.level) {
        compressionLevel = Number.parseInt(typedArgs.level) as CompressionLevel
      } else {
        const defaultLevel = DEFAULT_CONFIG.compress.level.toString()
        const shouldUseDefault = await confirm({
          message: `使用默认压缩级别: ${defaultLevel} (${DEFAULT_CONFIG.compress.levelDescription[DEFAULT_CONFIG.compress.level]})`
        })

        if (!shouldUseDefault) {
          const levelInput = await text({
            message: '请输入新的压缩级别 (0-9)',
            placeholder: '0=最快, 9=最小',
            validate: (value) => {
              if (!value) return '压缩级别不能为空'
              const num = Number.parseInt(value)
              if (Number.isNaN(num)) return '请输入数字'
              if (num < 0 || num > 9) return '级别必须在 0 到 9 之间'
              return undefined
            }
          })
          compressionLevel = Number.parseInt(levelInput) as CompressionLevel
        }
      }

      // 构建输出路径
      const outputPath = buildOutputPath(inputPath, outputDir, 'zip')

      // 执行压缩
      const s = spinner()
      s.start('正在压缩')

      await compressFiles(inputPath, outputPath, {
        level: compressionLevel
      })

      s.stop(`文件已压缩到: ${cyan(outputPath)}`)

      ctx.showOutro('🎉 压缩完成')
    })
  }
})
