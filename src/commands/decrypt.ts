import type { DecryptCommandArgs } from '#/types'

import path from 'node:path'

import { cyan } from 'ansis'
import { defineCommand } from 'citty'

import { createCommandContext, getPassword, loadArchive } from '#/utils/helpers'

import { decrypt } from '../core/crypto'
import { tryCatch } from '../utils/errors'

export default defineCommand({
  meta: {
    name: 'decrypt',
    description: '解密文件'
  },
  args: {
    input: {
      type: 'positional',
      description: '加密文件 (*.crypto.json)',
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
      description: '解密密码'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as DecryptCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    tryCatch(async () => {
      // 获取输入路径
      const inputPath = await ctx.getInput(typedArgs.input, {
        message: '请输入文件路径',
        placeholder: '*.crypto.json',
        validateExtension: '.crypto.json'
      })

      // 获取输出目录
      const outputDir = await ctx.getOutput(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 加密密钥
      const password = await getPassword(typedArgs.password)

      // 开始解密
      const loading = ctx.loading('正在解密')

      const archiveData = await loadArchive(inputPath, 'crypto')
      const outputPath = await decrypt(archiveData, outputDir, {
        password
      })

      loading.close(`文件已解密到: ${cyan(outputPath)}}`)

      ctx.showOutro('🔓 解密完成')
    })
  }
})
