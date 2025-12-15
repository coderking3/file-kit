import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'

import { intro, outro } from '@clack/prompts'
import { bold, cyan } from 'ansis'

import { CLI_NAME } from '#/config/defaults'
import { fileExists, getFileName, validateExtension } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, text } from '#/utils/prompts'
import { Base64ArchiveData, CryptoArchiveData } from '#/types'
import { AppError, FileError, ValidationError } from './errors'

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

export interface LoadArchiveData {
  /**
   * 加载 Base64 归档
   */
  (filePath: string, type: 'base64'): Promise<Base64ArchiveData>

  /**
   * 加载加密归档
   */
  (filePath: string, type: 'crypto'): Promise<CryptoArchiveData>
}

/**
 * 从文件加载归档数据
 */
export const loadArchive: LoadArchiveData = async (
  filePath: string,
  type: 'base64' | 'crypto'
): Promise<Base64ArchiveData | CryptoArchiveData> => {
  if (!filePath) {
    throw new ValidationError('文件路径不能为空', 'filePath')
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as Base64ArchiveData | CryptoArchiveData

    // 验证归档类型
    if (!data.type || (data.type !== 'base64' && data.type !== 'crypto')) {
      throw new ValidationError(
        '不是有效的归档文件（type 必须是 base64 或 crypto）',
        'archiveData.type'
      )
    }

    // 验证期望类型是否匹配
    if (data.type !== type) {
      throw new ValidationError(
        `期望的归档类型是 ${type}，但实际是 ${data.type}`,
        'archiveData.type'
      )
    }

    // 根据类型验证必需字段
    if (type === 'base64') {
      const base64Data = data as Base64ArchiveData
      if (!base64Data.file?.base64) {
        throw new ValidationError(
          'Base64 归档文件缺少 base64 数据',
          'archiveData.file.base64'
        )
      }
      return base64Data
    } else {
      const cryptoData = data as CryptoArchiveData
      const requiredFields: (keyof CryptoArchiveData['file'])[] = [
        'iv',
        'authTag',
        'salt',
        'encrypted'
      ]

      for (const field of requiredFields) {
        if (!cryptoData.file?.[field]) {
          throw new ValidationError(
            `加密归档文件缺少 ${field} 数据`,
            `archiveData.file.${field}`
          )
        }
      }
      return cryptoData
    }
  } catch (error: any) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error.code === 'ENOENT') {
      throw new FileError(`归档文件不存在: ${filePath}`, filePath)
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('归档文件 JSON 格式错误', 'json')
    }
    throw new AppError(`加载归档失败: ${error.message}`, 'loadArchive')
  }
}
