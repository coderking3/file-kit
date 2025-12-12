import type { Buffer } from 'node:buffer'
import type {
  AudioFormat,
  AudioQuality,
  ProgressCallback,
  VideoToAudioOptions
} from '#/types'

import { existsSync } from 'node:fs'
import path from 'node:path'

import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { execa } from 'execa'

import { AUDIO_FORMATS } from '#/config/audio-formats'
import { DEFAULT_CONFIG } from '#/config/defaults'
import { FFmpegError, ValidationError } from '#/utils/errors'
import { ensureDir, getFileName } from '#/utils/file'

/**
 * 解析时间字符串为秒
 */
const parseTime = (hours: string, minutes: string, seconds: string): number =>
  Number.parseInt(hours) * 3600 +
  Number.parseInt(minutes) * 60 +
  Number.parseFloat(seconds)

/**
 * 构建 FFmpeg 参数
 */
const buildFFmpegArgs = (
  videoPath: string,
  outputPath: string,
  options: VideoToAudioOptions
): string[] => {
  const formatConfig = AUDIO_FORMATS[options.format]
  const quality = options.quality || DEFAULT_CONFIG.videoToAudio.defaultQuality
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

  // 格式特定参数
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
  onProgress?: ProgressCallback
): Promise<string> {
  // 验证输入
  if (!videoPath) {
    throw new ValidationError('视频文件路径不能为空', 'videoPath')
  }
  if (!outputDir) {
    throw new ValidationError('输出目录不能为空', 'outputDir')
  }

  // 验证 ffmpeg
  if (!ffmpegPath.path || !existsSync(ffmpegPath.path)) {
    throw new FFmpegError(
      `FFmpeg 未找到,路径: ${ffmpegPath.path || 'undefined'}`,
      ffmpegPath.path
    )
  }

  // 验证格式
  const formatConfig = AUDIO_FORMATS[options.format]
  if (!formatConfig) {
    throw new ValidationError(`不支持的音频格式: ${options.format}`, 'format')
  }

  try {
    ensureDir(outputDir)

    // 构建输出路径
    const outputName = getFileName(videoPath, { withoutExt: true })
    const outputPath = path.join(
      outputDir,
      `${outputName}.${formatConfig.extension}`
    )

    // 构建命令参数
    const args = buildFFmpegArgs(videoPath, outputPath, options)

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
    if (error instanceof ValidationError) {
      throw error
    }

    // 优化错误信息
    if (error.message.includes('ENOENT')) {
      throw new FFmpegError('FFmpeg 未找到,请确保已正确安装')
    }
    if (error.message.includes('Invalid')) {
      throw new FFmpegError(`无效的参数: ${error.message}`)
    }

    const args = buildFFmpegArgs(videoPath, '', options)
    throw new FFmpegError(`FFmpeg 转换失败: ${error.message}`, args.join(' '))
  }
}
