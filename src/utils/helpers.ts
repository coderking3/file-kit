import type {
  Base64ArchiveData,
  Base64ChunkedArchiveData,
  CryptoArchiveData
} from '#/types'

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'

import { CLI_NAME } from '#/config/defaults'
import { fileExists, getFileName, validateExtension } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, password, text } from '#/utils/prompts'

import { AppError, FileError, ValidationError } from './errors'

/**
 * 命令执行上下文
 */
export interface CommandContext {
  isInteractive: boolean
  showIntro: () => void
  showOutro: typeof showOutro
  getInput: typeof getInputPath
  getOutput: typeof getOutputDir
  loading: typeof loading
}

/**
 * 创建命令上下文
 */
export function createCommandContext(rawArgs: string[]): CommandContext {
  const isInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')

  return {
    isInteractive,
    showIntro: () => showIntro(!isInteractive),
    showOutro,
    getInput: getInputPath,
    getOutput: getOutputDir,
    loading
  }
}

/**
 * Loading 加载器接口
 */
export interface LoadingSpinner {
  /** 更新加载消息 */
  update: (message: string) => void
  /** 关闭加载器 */
  close: (message?: string) => void
}

/**
 * Loading 加载器
 */
export function loading(initialMessage?: string) {
  const s = spinner()
  s.start(initialMessage)

  return {
    update: (message) => s.message(message),
    close: (message) => s.stop(message)
  } as LoadingSpinner
}

export function showIntro(isShow: boolean) {
  if (isShow) {
    console.log('')
    intro(bold.cyan(`🔧 ${CLI_NAME}`))
  }
}

export function showOutro(message: string) {
  outro(bold.green(message))
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

export async function getPassword(
  providedPwd: string,
  options?: { confirm?: boolean }
) {
  let userPwd = providedPwd

  if (!userPwd) {
    userPwd = await password({
      message: '请输入密码:',
      validate: (value) => {
        if (!value) return '密码不能为空'
        if (value.length < 6) return '密码长度至少 6 位'
      }
    })

    // 仅在需要时二次确认（加密时传 true，解密时传 false）
    if (options?.confirm) {
      await password({
        message: '请再次输入密码:',
        validate: (value) => {
          if (value !== userPwd) return '两次密码不一致'
        }
      })
    }
  } else if (typeof userPwd === 'string' && userPwd.length < 6) {
    logger.error('密码长度至少 6 位')
    process.exit(1)
  }

  return userPwd
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

/**
 * 从文件加载归档数据
 */
export function loadArchive(
  filePath: string,
  type: 'base64'
): Promise<Base64ArchiveData | Base64ChunkedArchiveData>

/**
 * 从文件加载归档数据
 */
export function loadArchive(
  filePath: string,
  type: 'crypto'
): Promise<CryptoArchiveData>

export async function loadArchive(
  filePath: string,
  type: 'base64' | 'crypto'
): Promise<Base64ArchiveData | Base64ChunkedArchiveData | CryptoArchiveData> {
  if (!filePath) {
    throw new ValidationError('文件路径不能为空', 'filePath')
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

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
      // 切片格式: 有 chunk 字段
      if (data.chunk) {
        const chunked = data as Base64ChunkedArchiveData
        if (!chunked.chunk?.data) {
          throw new ValidationError(
            '切片归档文件缺少 chunk.data',
            'archiveData.chunk.data'
          )
        }
        return chunked
      }
      // 单文件格式: 有 file.base64 字段
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

/**
 * 判断归档数据是否为切片格式
 */
export function isChunkedArchive(
  data: Base64ArchiveData | Base64ChunkedArchiveData
): data is Base64ChunkedArchiveData {
  return 'chunk' in data && !('base64' in data.file)
}

/**
 * 从任意一个切片文件自动发现同目录下的所有切片
 */
export async function discoverChunks(chunkPath: string): Promise<string[]> {
  const dir = path.dirname(chunkPath)
  const fileName = getFileName(chunkPath)

  // 从 name.base64.partN.txt 提取 name.base64.part 前缀
  const match = fileName.match(/^(.+\.base64\.part)\d+(\.txt)$/i)
  if (!match) {
    throw new ValidationError(
      `文件名不符合切片命名规则: ${fileName}`,
      'chunkPath'
    )
  }

  const prefix = match[1].toLowerCase()
  const suffix = match[2].toLowerCase()

  const files = await fs.readdir(dir)
  const chunkFiles = files
    .filter((f) => {
      const lower = f.toLowerCase()
      return lower.startsWith(prefix) && lower.endsWith(suffix)
    })
    .map((f) => path.join(dir, f))

  return chunkFiles
}

/**
 * 加载所有切片归档数据
 */
export async function loadChunkedArchive(
  chunkPaths: string[]
): Promise<Base64ChunkedArchiveData[]> {
  const chunks: Base64ChunkedArchiveData[] = []

  for (const p of chunkPaths) {
    try {
      const content = await fs.readFile(p, 'utf-8')
      const data = JSON.parse(content)

      if (data.type !== 'base64' || !data.chunk) {
        throw new ValidationError(
          `不是有效的切片归档文件: ${getFileName(p)}`,
          'chunk'
        )
      }

      chunks.push(data as Base64ChunkedArchiveData)
    } catch (error: any) {
      if (error instanceof ValidationError) throw error
      if (error instanceof SyntaxError) {
        throw new ValidationError(
          `切片文件 JSON 格式错误: ${getFileName(p)}`,
          'json'
        )
      }
      throw new FileError(`无法读取切片文件: ${p}`, p)
    }
  }

  return chunks
}
