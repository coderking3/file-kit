import type { AudioQuality, CompressionLevel } from '#/types'

// 工具名称
export const CLI_NAME = 'File Kit' as const

// 版本号
export const CLI_VERSION = '0.1.0' as const

// 别名
export const CLI_ALIAS = 'fkt' as const

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  // 输出目录配置
  output: {
    defaultDir: './.output',
    useInputDirForBase64: true,
    useInputDirForRestore: true
  },

  // 压缩配置
  compress: {
    level: 6 as CompressionLevel,
    levelDescription: {
      0: '最快(无压缩)',
      1: '很快',
      3: '快速',
      6: '平衡(推荐)',
      9: '最大压缩(慢)'
    } as Record<CompressionLevel, string>
  },

  // 视频转音频配置
  videoToAudio: {
    defaultFormat: 'mp3' as const,
    defaultQuality: 'high' as AudioQuality
  }
} as const

// 导出类型
export type DefaultConfig = typeof DEFAULT_CONFIG
