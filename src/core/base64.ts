import type { Base64ArchiveData } from '#/types'

import fs from 'node:fs/promises'
import path from 'node:path'

import { ConversionError, FileError, ValidationError } from '#/utils/errors'
import {
  base64ToBuffer,
  bufferToBase64,
  ensureDir,
  getFileExt,
  getFileName
} from '#/utils/file'
import { nowUTC8 } from '#/utils/time'

/**
 * 将文件转换为 Base64 JSON
 */
export async function fileToBase64(
  filePath: string,
  outputPath: string
): Promise<Base64ArchiveData> {
  // 验证输入
  if (!filePath) {
    throw new ValidationError('文件路径不能为空', 'filePath')
  }
  if (!outputPath) {
    throw new ValidationError('输出路径不能为空', 'outputPath')
  }

  try {
    ensureDir(outputPath)

    // 读取文件
    const buffer = await fs.readFile(filePath)
    const base64 = bufferToBase64(buffer)
    const fileName = getFileName(filePath)
    const fileExt = getFileExt(filePath)

    // 构建归档数据
    const archiveData: Base64ArchiveData = {
      type: 'base64',
      createdAt: nowUTC8(),
      file: {
        name: fileName,
        extension: fileExt,
        size: buffer.length,
        base64
      }
    }

    // 写入 JSON 文件
    const content = JSON.stringify(archiveData, null, 2)
    await fs.writeFile(outputPath, content, 'utf-8')

    return archiveData
  } catch (error: any) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error.code === 'ENOENT') {
      throw new FileError(`文件不存在: ${filePath}`, filePath)
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有文件访问权限: ${filePath}`, filePath)
    }
    throw new ConversionError(
      `Base64 转换失败: ${error.message}`,
      'fileToBase64'
    )
  }
}

/**
 * 从 Base64 JSON 恢复文件
 */
export async function base64ToFile(
  archiveData: Base64ArchiveData,
  outputDir: string = '.'
): Promise<string> {
  // 验证输入
  if (!archiveData) {
    throw new ValidationError('归档数据不能为空', 'archiveData')
  }
  if (!archiveData.file?.base64) {
    throw new ValidationError('归档数据格式错误', 'archiveData.file.base64')
  }

  try {
    ensureDir(outputDir)

    const { file } = archiveData

    // 解码 Base64
    const buffer = base64ToBuffer(file.base64)
    const outputPath = path.join(outputDir, file.name)

    // 写入文件
    await fs.writeFile(outputPath, buffer)
    return outputPath
  } catch (error: any) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有目录写入权限: ${outputDir}`, outputDir)
    }
    throw new ConversionError(
      `Base64 还原失败: ${error.message}`,
      'base64ToFile'
    )
  }
}
