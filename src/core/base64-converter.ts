import type { Base64ArchiveData } from '#/types/index'

import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

import { ensureDir, getFileExt, getFileName } from '#/utils/file'
import { nowUTC8 } from '#/utils/time'

export async function fileToBase64(
  filePath: string,
  outputPath: string
): Promise<Base64ArchiveData> {
  ensureDir(outputPath)

  const buffer = await fs.readFile(filePath)
  const base64 = buffer.toString('base64')
  const fileName = getFileName(filePath)
  const fileExt = getFileExt(filePath)

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

  const content = JSON.stringify(archiveData, null, 2)
  await fs.writeFile(outputPath, content, 'utf-8')

  return archiveData
}

export async function base64ToFile(
  archiveData: Base64ArchiveData,
  outputDir: string = '.'
): Promise<string> {
  ensureDir(outputDir)

  const buffer = Buffer.from(archiveData.file.base64, 'base64')
  const outputPath = path.join(outputDir, archiveData.file.name)

  await fs.writeFile(outputPath, buffer)
  return outputPath
}

export async function loadArchive(
  filePath: string
): Promise<Base64ArchiveData> {
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content)
}
