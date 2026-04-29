import type { Buffer } from 'node:buffer'

import type { Base64ArchiveData, Base64ChunkedArchiveData } from '#/types'

import { createHash } from 'node:crypto'
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

function sha256(buffer: Buffer): string {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`
}

export interface ChunkedResult {
  totalChunks: number
  chunkDir: string
  originalSize: number
}

/**
 * 将文件转换为切片 Base64 JSON
 */
export async function fileToBase64Chunked(
  filePath: string,
  outputDir: string,
  chunkSizeKB: number
): Promise<ChunkedResult> {
  if (!filePath) {
    throw new ValidationError('文件路径不能为空', 'filePath')
  }
  if (!outputDir) {
    throw new ValidationError('输出路径不能为空', 'outputDir')
  }

  try {
    const buffer = await fs.readFile(filePath)
    const base64 = bufferToBase64(buffer)
    const hash = sha256(buffer)
    const fileName = getFileName(filePath)
    const fileExt = getFileExt(filePath)
    const baseName = getFileName(filePath, { withoutExt: true })
    const createdAt = nowUTC8()

    const chunkSizeBytes = chunkSizeKB * 1024
    const totalChunks = Math.ceil(base64.length / chunkSizeBytes)

    const chunkDir = path.join(outputDir, `${baseName}-base64-chunks`)
    ensureDir(chunkDir)

    for (let i = 0; i < totalChunks; i++) {
      const data = base64.slice(i * chunkSizeBytes, (i + 1) * chunkSizeBytes)

      const archive: Base64ChunkedArchiveData = {
        type: 'base64',
        createdAt,
        file: {
          name: fileName,
          extension: fileExt,
          size: buffer.length
        },
        chunk: {
          index: i + 1,
          total: totalChunks,
          hash,
          data
        }
      }

      const chunkPath = path.join(
        chunkDir,
        `${baseName}.base64.part${i + 1}.txt`
      )
      await fs.writeFile(chunkPath, JSON.stringify(archive, null, 2), 'utf-8')
    }

    return { totalChunks, chunkDir, originalSize: buffer.length }
  } catch (error: any) {
    if (error instanceof ValidationError) throw error
    if (error.code === 'ENOENT') {
      throw new FileError(`文件不存在: ${filePath}`, filePath)
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有文件访问权限: ${filePath}`, filePath)
    }
    throw new ConversionError(
      `Base64 切片转换失败: ${error.message}`,
      'fileToBase64Chunked'
    )
  }
}

/**
 * 从切片 Base64 JSON 恢复文件
 */
export async function chunkedBase64ToFile(
  chunks: Base64ChunkedArchiveData[],
  outputDir: string
): Promise<string> {
  if (!chunks.length) {
    throw new ValidationError('切片数据不能为空', 'chunks')
  }

  const first = chunks[0]
  const { total, hash } = first.chunk

  // 校验所有切片元数据一致性
  for (const chunk of chunks) {
    if (chunk.chunk.total !== total) {
      throw new ValidationError(
        `切片总数不一致: 期望 ${total}, 实际 ${chunk.chunk.total} (part${chunk.chunk.index})`,
        'chunk.total'
      )
    }
    if (chunk.chunk.hash !== hash) {
      throw new ValidationError(
        `切片 hash 不一致 (part${chunk.chunk.index})`,
        'chunk.hash'
      )
    }
    if (
      chunk.file.name !== first.file.name ||
      chunk.file.extension !== first.file.extension ||
      chunk.file.size !== first.file.size
    ) {
      throw new ValidationError(
        `切片文件信息不一致 (part${chunk.chunk.index})`,
        'chunk.file'
      )
    }
  }

  // 校验 index 完整性
  const indices = chunks.map((c) => c.chunk.index).sort((a, b) => a - b)
  for (let i = 0; i < total; i++) {
    if (indices[i] !== i + 1) {
      throw new ValidationError(`缺少切片 part${i + 1}`, 'chunk.index')
    }
  }

  try {
    const sorted = chunks.sort((a, b) => a.chunk.index - b.chunk.index)
    const fullBase64 = sorted.map((c) => c.chunk.data).join('')
    const buffer = base64ToBuffer(fullBase64)

    // 校验 SHA-256
    const actualHash = sha256(buffer)
    if (actualHash !== hash) {
      throw new ValidationError(
        `文件完整性校验失败: 期望 ${hash}, 实际 ${actualHash}`,
        'hash'
      )
    }

    ensureDir(outputDir)
    const outputPath = path.join(outputDir, first.file.name)
    await fs.writeFile(outputPath, buffer)
    return outputPath
  } catch (error: any) {
    if (error instanceof ValidationError) throw error
    if (error.code === 'EACCES') {
      throw new FileError(`没有目录写入权限: ${outputDir}`, outputDir)
    }
    throw new ConversionError(
      `切片 Base64 还原失败: ${error.message}`,
      'chunkedBase64ToFile'
    )
  }
}
