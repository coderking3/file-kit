import type { EncryptCommandArgs } from '#/types'

import path from 'node:path/posix'

import { bold, cyan, gray, yellow } from 'ansis'
import { defineCommand } from 'citty'

import {
  buildOutputPath,
  createCommandContext,
  getPassword
} from '#/utils/helpers'
import { logger } from '#/utils/logger'

import { encrypt } from '../core/crypto'
import { tryCatch } from '../utils/errors'

export default defineCommand({
  meta: {
    name: 'encrypt',
    description: '将文件加密为 CRYPTO JSON 文本'
  },
  args: {
    input: {
      type: 'positional',
      description: '文件路径',
      required: true
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录'
    },
    password: {
      type: 'string',
      alias: 'p',
      description: '加密密码'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as EncryptCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入路径
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: 'file.txt'
      })

      // 获取输出目录
      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      const password = await getPassword(typedArgs.password, { confirm: true })

      console.log(gray('│'))
      logger.warn(yellow('请妥善保管密码，丢失后无法恢复文件！'))

      // 构建输出路径
      const outputPath = buildOutputPath(inputPath, outputDir, 'crypto.txt')

      // 执行转换
      const loading = ctx.loading('正在加密')
      const archiveData = await encrypt(inputPath, outputPath, {
        password
      })

      loading.close(
        `文件已加密到: ${cyan(outputPath)}, 共计 ${bold.gray((archiveData.file.size / 1024).toFixed(2))} KB`
      )

      ctx.showOutro('🔐 加密完成')
    })
  }
})
