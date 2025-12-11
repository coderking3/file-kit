import { accessSync, mkdirSync } from 'node:fs'
import path, { basename, extname } from 'node:path'

/**
 * 检查文件路径是否存在。
 */
export function fileExists(filePath: string): boolean {
  try {
    accessSync(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 确保目录存在，如果不存在则创建它。
 */
export function ensureDir(targetPath: string): void {
  const hasExtension = path.extname(targetPath) !== ''
  const dirPath = hasExtension ? path.dirname(targetPath) : targetPath

  if (dirPath && dirPath !== '.' && dirPath !== '/') {
    mkdirSync(dirPath, { recursive: true })
  }
}

export function getFileExt(filePath: string): string {
  return extname(filePath).toLowerCase()
}

export function getFileName(
  filePath: string,
  options?: { withoutExt?: boolean }
): string {
  const ext = extname(filePath)
  return options?.withoutExt ? basename(filePath, ext) : basename(filePath)
}
