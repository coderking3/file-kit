export const CRYPTO_ALGORITHM = {
  name: 'aes-256-gcm',
  ivLength: 16,
  saltLength: 32,
  iterations: 100000 // PBKDF2 迭代次数
} as const
