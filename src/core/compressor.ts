import type { Unzipped, Zippable } from 'fflate'

import type { CompressOptions } from '#/types'

import fs from 'node:fs/promises'
import path from 'node:path'

import fg from 'fast-glob'
import { unzip, zip } from 'fflate'

import { DEFAULT_CONFIG } from '#/config/defaults'
import { ConversionError, FileError, ValidationError } from '#/utils/errors'
import { ensureDir, isDirectory } from '#/utils/file'

/**
 * 压缩文件或文件夹
 */
export async function compressFiles(
  inputPath: string,
  outputPath: string,
  options: CompressOptions = {}
): Promise<string> {
  // 验证输入
  if (!inputPath) {
    throw new ValidationError('输入路径不能为空', 'inputPath')
  }
  if (!outputPath) {
    throw new ValidationError('输出路径不能为空', 'outputPath')
  }

  try {
    ensureDir(outputPath)

    const files: Zippable = {}

    if (isDirectory(inputPath)) {
      // 压缩整个文件夹
      const filePaths = await fg('**/*', {
        cwd: inputPath,
        dot: true,
        onlyFiles: true
      })

      if (filePaths.length === 0) {
        throw new ValidationError('文件夹为空,无法压缩', 'inputPath')
      }

      for (const filePath of filePaths) {
        const fullPath = path.join(inputPath, filePath)
        const content = await fs.readFile(fullPath)
        files[filePath] = content
      }
    } else {
      // 压缩单个文件
      const content = await fs.readFile(inputPath)
      files[path.basename(inputPath)] = content
    }

    return new Promise((resolve, reject) => {
      const level = options.level ?? DEFAULT_CONFIG.compress.level

      zip(files, { level }, async (err, data) => {
        if (err) {
          reject(
            new ConversionError(`压缩失败: ${err.message}`, 'compressFiles')
          )
          return
        }

        try {
          await fs.writeFile(outputPath, data)
          resolve(outputPath)
        } catch (writeError: any) {
          reject(
            new FileError(`写入压缩文件失败: ${writeError.message}`, outputPath)
          )
        }
      })
    })
  } catch (error: any) {
    if (
      error instanceof ValidationError ||
      error instanceof FileError ||
      error instanceof ConversionError
    ) {
      throw error
    }
    if (error.code === 'ENOENT') {
      throw new FileError(`输入路径不存在: ${inputPath}`, inputPath)
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有访问权限: ${inputPath}`, inputPath)
    }
    throw new ConversionError(`压缩操作失败: ${error.message}`, 'compressFiles')
  }
}

/**
 * 解压 zip 文件
 */
export async function decompressFile(
  zipPath: string,
  outputDir: string
): Promise<string[]> {
  // 验证输入
  if (!zipPath) {
    throw new ValidationError('zip 文件路径不能为空', 'zipPath')
  }
  if (!outputDir) {
    throw new ValidationError('输出目录不能为空', 'outputDir')
  }

  try {
    ensureDir(outputDir)

    const zipData = await fs.readFile(zipPath)

    return new Promise((resolve, reject) => {
      unzip(zipData, async (err, unzipped: Unzipped) => {
        if (err) {
          reject(
            new ConversionError(`解压失败: ${err.message}`, 'decompressFile')
          )
          return
        }

        try {
          const outputFiles: string[] = []

          for (const [filePath, content] of Object.entries(unzipped)) {
            const outputPath = path.join(outputDir, filePath)
            ensureDir(outputPath)
            await fs.writeFile(outputPath, content)
            outputFiles.push(outputPath)
          }

          resolve(outputFiles)
        } catch (writeError: any) {
          reject(
            new FileError(`写入解压文件失败: ${writeError.message}`, outputDir)
          )
        }
      })
    })
  } catch (error: any) {
    if (
      error instanceof ValidationError ||
      error instanceof FileError ||
      error instanceof ConversionError
    ) {
      throw error
    }
    if (error.code === 'ENOENT') {
      throw new FileError(`zip 文件不存在: ${zipPath}`, zipPath)
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有访问权限: ${zipPath}`, zipPath)
    }
    throw new ConversionError(
      `解压操作失败: ${error.message}`,
      'decompressFile'
    )
  }
}
