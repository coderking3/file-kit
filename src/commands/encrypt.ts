import { defineCommand } from 'citty'
import * as clack from '@clack/prompts'
import ansis from 'ansis'
import { CryptoConverter } from '../core/crypto-converter'
import { handleError } from '../utils/errors'
import { validateFilePath } from '../utils/file'

export default defineCommand({
  meta: {
    name: 'encrypt',
    description: '加密文件'
  },
  args: {
    input: {
      type: 'positional',
      description: '输入文件路径',
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
  async run({ args }) {
    const spinner = clack.spinner()

    try {
      // 验证输入文件
      await validateFilePath(args.input)

      // 获取密码
      let password = args.password

      if (!password) {
        const passwordInput = await clack.password({
          message: '请输入加密密码:',
          validate: (value) => {
            if (!value) return '密码不能为空'
            if (value.length < 6) return '密码长度至少 6 位'
          }
        })

        if (clack.isCancel(passwordInput)) {
          clack.cancel('操作已取消')
          process.exit(0)
        }

        password = passwordInput as string

        // 确认密码
        const confirmPassword = await clack.password({
          message: '请再次输入密码:',
          validate: (value) => {
            if (value !== password) return '两次密码不一致'
          }
        })

        if (clack.isCancel(confirmPassword)) {
          clack.cancel('操作已取消')
          process.exit(0)
        }
      }

      // 开始加密
      spinner.start('正在加密文件...')

      const converter = new CryptoConverter()
      const outputPath = await converter.encrypt({
        input: args.input,
        output: args.output,
        password
      })

      spinner.stop(ansis.green('✔ 文件已加密'))
      clack.note(ansis.cyan(outputPath), '输出路径')

      console.log(ansis.yellow('\n⚠️  请妥善保管密码，丢失后无法恢复文件！'))
    } catch (error) {
      spinner.stop(ansis.red('✖ 加密失败'))
      handleError(error)
    }
  }
})
