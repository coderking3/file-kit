// ============ 通用类型 ============
export type Nullable<T> = T | null | undefined

// ============ 文件相关 ============
export interface FileInfo {
  name: string
  extension: string
  size: number
  path?: string
}

// ============ Base64 相关 ============
export interface Base64ArchiveData {
  type: 'base64'
  createdAt: string
  file: FileInfo & {
    base64: string
  }
}

// ============ 音频/视频相关 ============
export type AudioFormat = 'mp3' | 'aac' | 'flac' | 'alac' | 'wav'
export type AudioQuality = 'low' | 'medium' | 'high'

export interface VideoToAudioOptions {
  format: AudioFormat
  quality?: AudioQuality
  bitrate?: string
}

export interface AudioFormatConfig {
  codec: string
  extension: string
  quality: Record<AudioQuality, string>
  description: string
  needsQuality: boolean
  extraArgs: string[]
}

// ============ 命令参数类型 ============
export interface BaseCommandArgs {
  input?: string
  output?: string
}

export interface Base64CommandArgs extends BaseCommandArgs {}

export interface RestoreCommandArgs extends BaseCommandArgs {}
export interface VideoToAudioCommandArgs extends BaseCommandArgs {
  format?: string
  quality?: string
}

// ============ 进度回调 ============
export type ProgressCallback = (percent: number, message?: string) => void

// ============ 转换类型 ============
export type ConvertType =
  | 'base64'
  | 'restore'
  | 'video-to-audio'
  | 'compress'
  | 'decompress'
