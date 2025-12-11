// Base64 存档数据结构
export interface Base64ArchiveData {
  type: 'base64'
  createdAt: string
  file: {
    name: string
    extension: string
    size: number
    base64: string
  }
}

// 视频转音频选项
export interface VideoToAudioOptions {
  format: 'mp3' | 'm4a' | 'wav' | 'aac' | 'flac'
  quality: 'low' | 'medium' | 'high'
  bitrate?: string
}

// 压缩选项
export interface CompressOptions {
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 // 压缩级别
}

// 转换类型
export type ConvertType =
  | 'base64' // 文件转 Base64
  | 'restore' // Base64 恢复文件
  | 'video-to-audio' // 视频提取音频
  | 'compress' // 压缩文件
  | 'decompress' // 解压文件
