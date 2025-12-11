import type { Unzipped, Zippable } from 'fflate'

import type { CompressOptions } from '#/types'

import fs from 'node:fs/promises'
import path from 'node:path'

import fg from 'fast-glob'
import { unzip, zip } from 'fflate'

import { ensureDir } from '#/utils/file'

export async function compressFiles(
  inputPath: string,
  outputPath: string,
  options: CompressOptions = {}
): Promise<string> {
  ensureDir(outputPath)

  const stats = await fs.stat(inputPath)
  const files: Zippable = {}

  if (stats.isDirectory()) {
    // 压缩整个文件夹
    const filePaths = await fg('**/*', {
      cwd: inputPath,
      dot: true,
      onlyFiles: true
    })

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
    zip(files, { level: options.level || 6 }, async (err, data) => {
      if (err) {
        reject(err)
        return
      }

      await fs.writeFile(outputPath, data)
      resolve(outputPath)
    })
  })
}

export async function decompressFile(
  zipPath: string,
  outputDir: string
): Promise<string[]> {
  ensureDir(outputDir)

  const zipData = await fs.readFile(zipPath)

  return new Promise((resolve, reject) => {
    unzip(zipData, async (err, unzipped: Unzipped) => {
      if (err) {
        reject(err)
        return
      }

      const outputFiles: string[] = []

      for (const [filePath, content] of Object.entries(unzipped)) {
        const outputPath = path.join(outputDir, filePath)
        ensureDir(outputPath)
        await fs.writeFile(outputPath, content)
        outputFiles.push(outputPath)
      }

      resolve(outputFiles)
    })
  })
}
