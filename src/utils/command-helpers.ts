import process from 'node:process'

import { intro, outro, spinner as clackSpinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'

import { CLI_NAME } from '#/constants'

import { handleError } from './errors'
import { fileExists, validateExtension } from './file'
import { logger } from './logger'
import { confirm, text } from './prompts'

/**
 * 命令执行上下文
 */
export interface CommandContext {
  isInteractive: boolean
  showIntro: () => void
  showOutro: (message: string) => void
}

/**
 * 创建命令上下文
 */
export function createCommandContext(rawArgs: string[]): CommandContext {
  const isInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')

  return {
    isInteractive,
    showIntro: () => {
      if (!isInteractive) intro(bold.cyan(`🔧 ${CLI_NAME}`))
    },
    showOutro: (message: string) => {
      outro(bold.green(message))
    }
  }
}

/**
 * 输入路径验证选项
 */
export interface InputPathOptions {
  message: string
  placeholder: string
  validateExtension?: string
  customValidate?: (value: string) => string | void
}

/**
 * 获取并验证输入路径
 */
export async function getValidatedInputPath(
  providedPath: string | undefined,
  options: InputPathOptions
): Promise<string> {
  let inputPath = providedPath

  if (!inputPath) {
    inputPath = await text({
      message: options.message,
      placeholder: options.placeholder,
      validate: (value) => {
        if (!value) return '文件路径不能为空'
        if (!fileExists(value)) return '文件不存在'

        if (
          options.validateExtension &&
          !validateExtension(value, options.validateExtension)
        ) {
          return `请输入 ${options.validateExtension} 格式的文件`
        }

        return options.customValidate?.(value)
      }
    })
  } else {
    // 命令行直接提供路径时的验证
    if (!fileExists(inputPath)) {
      logger.error(`文件不存在: ${inputPath}`)
      process.exit(1)
    }

    if (
      options.validateExtension &&
      !validateExtension(inputPath, options.validateExtension)
    ) {
      logger.error(`请输入 ${options.validateExtension} 格式的文件`)
      process.exit(1)
    }
  }

  return inputPath
}

/**
 * 输出目录配置选项
 */
export interface OutputDirOptions {
  defaultDir: string
  promptMessage?: string
  placeholder?: string
}

/**
 * 获取输出目录（支持交互式确认）
 */
export async function getOutputDir(
  providedDir: string | undefined,
  options: OutputDirOptions
): Promise<string> {
  if (providedDir) return providedDir

  const shouldUseDefault = await confirm({
    message: `使用默认输出目录: ${cyan(options.defaultDir)}`
  })

  if (shouldUseDefault) return options.defaultDir

  return await text({
    message: options.promptMessage || '请输入输出目录',
    placeholder: options.placeholder || './.output'
  })
}

/**
 * 进度 Spinner 控制器
 */
export interface SpinnerController {
  start: (message: string) => void
  update: (message: string) => void
  stop: (message: string) => void
}

/**
 * 创建进度 spinner
 */
export function createSpinner(): SpinnerController {
  const s = clackSpinner()

  return {
    start: (message: string) => {
      s.start(message)
    },
    update: (message: string) => {
      s.message(message)
    },
    stop: (message: string) => {
      s.stop(message)
    }
  }
}

/**
 * 命令错误处理包装器
 * 注意: 此函数在错误时会调用 process.exit,因此实际不会返回
 */
export async function handleCommandError<T>(
  operation: () => Promise<T>,
  errorPrefix: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    handleError(error)
    // handleError 会调用 process.exit(1),所以下面的代码不会执行
    // 但为了类型安全,我们需要一个 never 返回的占位
    throw error // 这行实际不会执行,但能满足 TypeScript
  }
}
