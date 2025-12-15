import process from 'node:process'

import { logger } from './logger'

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 文件相关错误
 */
export class FileError extends AppError {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(message, 'FILE_ERROR', { filePath })
    this.name = 'FileError'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field: string
  ) {
    super(message, 'VALIDATION_ERROR', { field })
    this.name = 'ValidationError'
  }
}

/**
 * 转换错误
 */
export class ConversionError extends AppError {
  constructor(
    message: string,
    public operation: string
  ) {
    super(message, 'CONVERSION_ERROR', { operation })
    this.name = 'ConversionError'
  }
}

/**
 * 加密/解密错误
 */
export class CryptoError extends AppError {
  constructor(
    message: string,
    public operation: string
  ) {
    super(message, 'CRYPTO_ERROR', { operation })
    this.name = 'CryptoError'
  }
}

/**
 * FFmpeg 相关错误
 */
export class FFmpegError extends AppError {
  constructor(
    message: string,
    public command?: string
  ) {
    super(message, 'FFMPEG_ERROR', { command })
    this.name = 'FFmpegError'
  }
}

/**
 * 异步操作包装器
 */
export async function tryCatch<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    handleError(error)
  }
}

/**
 * 全局错误处理器
 */
export function handleError(error: unknown): never {
  if (error instanceof AppError) {
    logger.error(`[${error.code}] ${error.message}`)
    if (error.details && Object.keys(error.details).length > 0) {
      logger.dim(`详情: ${JSON.stringify(error.details, null, 2)}`)
    }
  } else if (error instanceof Error) {
    logger.error(error.message)
    if (process.env.DEBUG) {
      logger.dim(error.stack || '')
    }
  } else {
    logger.error(`未知错误: ${String(error)}`)
  }

  process.exit(1)
}
