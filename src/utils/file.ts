import { accessSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * 检查文件是否存在
 */
export function fileExists(targetPath: string): boolean {
  try {
    accessSync(targetPath)
    return true
  } catch {
    return false
  }
}

/**
 * 检查是否为文件
 */
export function isFile(targetPath: string): boolean {
  try {
    return statSync(targetPath).isFile()
  } catch {
    return false
  }
}

/**
 * 检查是否为目录
 */
export function isDirectory(targetPath: string): boolean {
  try {
    return statSync(targetPath).isDirectory()
  } catch {
    return false
  }
}

/**
 * 确保目录存在
 */
export function ensureDir(targetPath: string): void {
  // 规范化路径
  const normalizedPath = path.normalize(targetPath)

  // 判断是文件路径还是目录路径
  const dirPath = path.extname(normalizedPath)
    ? path.dirname(normalizedPath)
    : normalizedPath

  // 空路径或根路径跳过
  if (!dirPath || dirPath === '.' || dirPath === path.sep) {
    return
  }

  // 递归创建目录
  if (!fileExists(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 获取文件扩展名
 */
export function getFileExt(
  filePath: string,
  options?: { withDot?: boolean }
): string {
  const ext = path.extname(filePath).toLowerCase()
  return options?.withDot === false ? ext.slice(1) : ext
}

/**
 * 获取文件名
 */
export function getFileName(
  filePath: string,
  options?: { withoutExt?: boolean }
): string {
  const base = path.basename(filePath)
  return options?.withoutExt ? base.replace(path.extname(base), '') : base
}

/**
 * 验证文件扩展名
 */
export function validateExtension(
  filePath: string,
  expectedExt: string
): boolean {
  const ext = getFileExt(filePath, { withDot: false })
  const expected = expectedExt.startsWith('.')
    ? expectedExt.slice(1)
    : expectedExt
  return ext === expected.toLowerCase()
}
