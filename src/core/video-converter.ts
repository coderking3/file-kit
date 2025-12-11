import type { Buffer } from 'node:buffer'

import { existsSync } from 'node:fs'
import path from 'node:path'

import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { execa } from 'execa'

import { ensureDir, getFileName } from '#/utils/file'

// 音频格式配置
export const AUDIO_FORMATS = {
  mp3: {
    codec: 'libmp3lame',
    extension: 'mp3',
    quality: { low: '128k', medium: '192k', high: '320k' },
    description: 'MP3 (通用)',
    needsQuality: true,
    extraArgs: []
  },
  aac: {
    codec: 'aac',
    extension: 'm4a',
    quality: { low: '128k', medium: '192k', high: '256k' },
    description: 'AAC/M4A (Apple)',
    needsQuality: true,
    // -movflags +faststart 用于 Web 优化（边下边播）
    extraArgs: ['-movflags', '+faststart']
  },
  flac: {
    codec: 'flac',
    extension: 'flac',
    quality: { low: '0', medium: '5', high: '8' },
    description: 'FLAC (无损)',
    needsQuality: true,
    // 强制 16-bit，避免体积虚高
    extraArgs: ['-sample_fmt', 's16']
  },
  alac: {
    codec: 'alac',
    extension: 'm4a',
    quality: { low: '0', medium: '0', high: '0' },
    description: 'ALAC (Apple 无损)',
    needsQuality: false,
    // 强制 16-bit planar
    extraArgs: ['-sample_fmt', 's16p']
  },
  wav: {
    codec: 'pcm_s16le',
    extension: 'wav',
    quality: { low: '0', medium: '0', high: '0' },
    description: 'WAV (无损)',
    needsQuality: false,
    extraArgs: []
  }
} as const

export type AudioFormat = keyof typeof AUDIO_FORMATS
export type AudioQuality = 'low' | 'medium' | 'high'

export interface VideoToAudioOptions {
  format: AudioFormat
  quality?: AudioQuality
  bitrate?: string
}

// 解析时间字符串为秒
const parseTime = (hours: string, minutes: string, seconds: string): number =>
  Number.parseInt(hours) * 3600 +
  Number.parseInt(minutes) * 60 +
  Number.parseFloat(seconds)

// 构建 FFmpeg 参数
const buildFFmpegArgs = (
  videoPath: string,
  outputPath: string,
  options: VideoToAudioOptions
): string[] => {
  const formatConfig = AUDIO_FORMATS[options.format]
  const quality = options.quality || 'high'
  const bitrateOrQuality = options.bitrate || formatConfig.quality[quality]

  const args = ['-i', videoPath, '-vn']

  // 强制立体声，避免多声道兼容性问题
  args.push('-ac', '2')

  // 添加编码器
  args.push('-acodec', formatConfig.codec)

  // 添加质量/压缩参数
  if (options.format === 'flac') {
    // FLAC 使用 -compression_level
    args.push('-compression_level', bitrateOrQuality)
  } else if (formatConfig.needsQuality) {
    // MP3/AAC 使用 -b:a (bitrate)
    args.push('-b:a', bitrateOrQuality)
  }

  //【格式特定参数】添加配置对象中的额外参数
  if (formatConfig.extraArgs && formatConfig.extraArgs.length > 0) {
    args.push(...formatConfig.extraArgs)
  }

  args.push('-y', outputPath)
  return args
}

/**
 * 从视频中提取音频
 */
export async function extractAudio(
  videoPath: string,
  outputDir: string,
  options: VideoToAudioOptions,
  onProgress?: (percent: number) => void
): Promise<string> {
  ensureDir(outputDir)

  // 验证 ffmpeg
  if (!ffmpegPath.path || !existsSync(ffmpegPath.path)) {
    throw new Error(`FFmpeg binary not found at: ${ffmpegPath.path}`)
  }

  // 验证格式
  const formatConfig = AUDIO_FORMATS[options.format]
  if (!formatConfig) {
    throw new Error(`不支持的音频格式: ${options.format}`)
  }

  // 构建输出路径
  const outputName = getFileName(videoPath, { withoutExt: true })
  const outputPath = path.join(
    outputDir,
    `${outputName}.${formatConfig.extension}`
  )

  // 构建命令参数
  const args = buildFFmpegArgs(videoPath, outputPath, options)

  try {
    const subprocess = execa(ffmpegPath.path, args)

    // 处理进度回调
    if (onProgress && subprocess.stderr) {
      let duration = 0

      subprocess.stderr.on('data', (data: Buffer) => {
        const text = data.toString()

        // 解析总时长
        const durationMatch = text.match(
          /Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/
        )
        if (durationMatch) {
          duration = parseTime(
            durationMatch[1],
            durationMatch[2],
            durationMatch[3]
          )
        }

        // 解析当前进度
        const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
        if (timeMatch && duration > 0) {
          const currentTime = parseTime(
            timeMatch[1],
            timeMatch[2],
            timeMatch[3]
          )
          const percent = Math.min(
            Math.round((currentTime / duration) * 100),
            100
          )
          onProgress(percent)
        }
      })
    }

    await subprocess
    return outputPath
  } catch (error: any) {
    // 优化错误信息
    const errorMessage = error.message.includes('ENOENT')
      ? 'FFmpeg 未找到，请确保已正确安装'
      : error.message.includes('Invalid')
        ? `无效的参数: ${error.message}`
        : `FFmpeg 转换失败: ${error.message}`

    throw new Error(errorMessage)
  }
}
