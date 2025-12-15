import type { CryptoArchiveData, CryptoOptions } from '#/types'

import { Buffer } from 'node:buffer'
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes
} from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { CRYPTO_ALGORITHM } from '#/config/crypto-algorithm'
import { CryptoError, FileError, ValidationError } from '#/utils/errors'

import {
  base64ToBuffer,
  bufferToBase64,
  ensureDir,
  getFileExt,
  getFileName
} from '../utils/file'
import { nowUTC8 } from '../utils/time'

/**
 * 从密码派生密钥
 */
const deriveKey = (password: string, salt: Buffer): Buffer => {
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}

/**
 * 加密文件
 */
export async function encrypt(
  filePath: string,
  outputPath: string,
  options: CryptoOptions
): Promise<CryptoArchiveData> {
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
    const fileBuffer = await fs.readFile(filePath)
    const fileName = getFileName(filePath)
    const fileExt = getFileExt(filePath)

    // 生成随机值
    const salt = randomBytes(CRYPTO_ALGORITHM.saltLength)
    const iv = randomBytes(CRYPTO_ALGORITHM.ivLength)

    // 派生密钥
    const key = deriveKey(options.password, salt)

    // 创建加密器
    const cipher = createCipheriv(CRYPTO_ALGORITHM.name, key, iv)

    // 加密数据
    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()])

    // 获取认证标签
    const authTag = cipher.getAuthTag()

    // 构建加密数据
    const encryptedData: CryptoArchiveData = {
      type: 'crypto',
      algorithm: CRYPTO_ALGORITHM.name,
      createdAt: nowUTC8(),
      file: {
        name: fileName,
        extension: fileExt,
        size: fileBuffer.length,
        iv: bufferToBase64(iv),
        authTag: bufferToBase64(authTag),
        salt: bufferToBase64(salt),
        encrypted: bufferToBase64(encrypted)
      }
    }

    // 写入 JSON 文件
    const content = JSON.stringify(encryptedData, null, 2)
    await fs.writeFile(outputPath, content, 'utf-8')

    return encryptedData
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

    throw new CryptoError(`加密失败: ${error.message}`, 'encrypt')
  }
}

/**
 * 解密文件
 */
export async function decrypt(
  archiveData: CryptoArchiveData,
  outputDir: string = '.',
  options: CryptoOptions
): Promise<string> {
  if (!archiveData) {
    throw new ValidationError('归档数据不能为空', 'archiveData')
  }
  if (!archiveData.file?.encrypted) {
    throw new ValidationError('归档数据格式错误', 'archiveData.file.encrypted')
  }

  try {
    ensureDir(outputDir)

    const { file } = archiveData

    // 解析数据
    const salt = base64ToBuffer(file.salt)
    const iv = base64ToBuffer(file.iv)
    const authTag = base64ToBuffer(file.authTag)
    const encrypted = base64ToBuffer(file.encrypted)

    // 派生密钥
    const key = deriveKey(options.password, salt)

    // 创建解密器
    const decipher = createDecipheriv(CRYPTO_ALGORITHM.name, key, iv)
    decipher.setAuthTag(authTag)

    // 解密数据
    let decrypted: Buffer
    try {
      decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    } catch {
      throw new Error('解密失败：密码错误或文件已损坏')
    }

    const outputPath = path.join(outputDir, file.name)

    // 写入文件
    await fs.writeFile(outputPath, decrypted)

    return outputPath
  } catch (error: any) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error.code === 'EACCES') {
      throw new FileError(`没有目录写入权限: ${outputDir}`, outputDir)
    }

    throw new CryptoError(`解密失败: ${error.message}`, 'decrypt')
  }
}
