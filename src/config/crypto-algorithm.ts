export const CRYPTO_ALGORITHM = {
  name: 'aes-256-gcm',
  ivLength: 12,
  saltLength: 32,
  keyLength: 32,
  argon2: {
    memoryCost: 131072, // 内存占用 128MB（单位 KB）
    timeCost: 3, // 迭代次数
    parallelism: 4 // 并行线程数
  }
} as const
