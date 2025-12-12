import type { DecompressCommandArgs } from '#/types'

import path from 'node:path'

import { spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { decompressFile } from '#/core/compressor'
import { tryCatch } from '#/utils/errors'
import { getFileName } from '#/utils/file'
import {
  createCommandContext,
  getInputPath,
  getOutputDir
} from '#/utils/helpers'

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
    const typedArgs = args as unknown as DecompressCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入路径
      const inputPath = await getInputPath(typedArgs.input, {
        message: '请输入 zip 文件路径',
        placeholder: 'archive.zip',
        validateExtension: '.zip'
      })

      // 获取输出目录
      const defaultOutputDir = path.join(
        path.dirname(inputPath),
        getFileName(inputPath, { withoutExt: true })
      )

      const outputDir = await getOutputDir(typedArgs.output, {
        defaultDir: defaultOutputDir
      })

      // 执行解压
      const s = spinner()
      s.start('正在解压')

      const files = await decompressFile(inputPath, outputDir)

      s.stop(
        `文件已解压到: ${cyan(outputDir)},共计 ${bold.gray(files.length.toString())} 个文件`
      )

      ctx.showOutro('🎉 解压完成')
    })
  }
})
