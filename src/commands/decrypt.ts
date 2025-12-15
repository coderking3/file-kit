import { defineCommand } from 'citty'
import * as clack from '@clack/prompts'
import ansis from 'ansis'
import { CryptoConverter } from '../core/crypto-converter'
import { handleError } from '../utils/errors'
import { validateFilePath } from '../utils/file'

export default defineCommand({
  meta: {
    name: 'decrypt',
    description: '解密文件'
  },
  args: {
    input: {
      type: 'positional',
      description: '加密文件路径 (.encrypted.json)',
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
  async run({ args }) {
    const spinner = clack.spinner()

    try {
      // 验证输入文件
      await validateFilePath(args.input)

      // 获取密码
      let password = args.password

      if (!password) {
        const passwordInput = await clack.password({
          message: '请输入解密密码:',
          validate: (value) => {
            if (!value) return '密码不能为空'
          }
        })

        if (clack.isCancel(passwordInput)) {
          clack.cancel('操作已取消')
          process.exit(0)
        }

        password = passwordInput as string
      }

      // 开始解密
      spinner.start('正在解密文件...')

      const converter = new CryptoConverter()
      const outputPath = await converter.decrypt({
        input: args.input,
        output: args.output,
        password
      })

      spinner.stop(ansis.green('✔ 文件已解密'))
      clack.note(ansis.cyan(outputPath), '输出路径')
    } catch (error) {
      spinner.stop(ansis.red('✖ 解密失败'))
      handleError(error)
    }
  }
})
