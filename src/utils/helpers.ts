import path from 'node:path'
import process from 'node:process'

import { intro, outro } from '@clack/prompts'
import { bold, cyan } from 'ansis'

import { CLI_NAME } from '#/config/defaults'
import { fileExists, getFileName, validateExtension } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'

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
  customValidate?: (value: string) => string
}

/**
 * 获取并验证输入路径
 */
export async function getInputPath(
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
 * 获取输出目录
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
 * 构建输出路径
 */
export function buildOutputPath(
  inputPath: string,
  outputDir: string,
  newExt?: string
): string {
  const baseName = getFileName(inputPath, { withoutExt: !!newExt })
  const fileName = newExt ? `${baseName}.${newExt}` : baseName
  return path.join(outputDir, fileName)
}
