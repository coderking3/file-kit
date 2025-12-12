import type {
  AudioFormat,
  AudioQuality,
  VideoToAudioCommandArgs
} from '#/types'

import path from 'node:path'
import process from 'node:process'

import { spinner } from '@clack/prompts'
import { cyan } from 'ansis'
import { defineCommand } from 'citty'

import { AUDIO_FORMATS } from '#/config/audio-formats'
import { DEFAULT_CONFIG } from '#/config/defaults'
import { extractAudio } from '#/core/video-converter'
import { tryCatch } from '#/utils/errors'
import {
  buildOutputPath,
  createCommandContext,
  getInputPath,
  getOutputDir
} from '#/utils/helpers'
import { logger } from '#/utils/logger'
import { select } from '#/utils/prompts'

// 格式选项配置
const FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3 (通用)', hint: '128k-320k' },
  { value: 'aac', label: 'AAC/M4A (Apple)', hint: '128k-256k' },
  { value: 'flac', label: 'FLAC (无损)', hint: '可压缩' },
  { value: 'alac', label: 'ALAC (Apple 无损)', hint: 'iTunes/iOS' },
  { value: 'wav', label: 'WAV (无损)', hint: '最大' }
]

// 获取质量选项
const getQualityOptions = (format: AudioFormat) => {
  if (format === 'flac') {
    return [
      { value: 'low', label: '快速', hint: '级别 0' },
      { value: 'medium', label: '平衡 (推荐)', hint: '级别 5' },
      { value: 'high', label: '最大压缩', hint: '级别 8' }
    ]
  }

  const formatConfig = AUDIO_FORMATS[format]
  return [
    { value: 'low', label: '低', hint: formatConfig.quality.low },
    { value: 'medium', label: '中 (推荐)', hint: formatConfig.quality.medium },
    { value: 'high', label: '高', hint: formatConfig.quality.high }
  ]
}

export default defineCommand({
  meta: {
    name: 'video-to-audio',
    description: '从视频中提取音频'
  },
  args: {
    input: {
      type: 'positional',
      description: '视频文件路径'
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出文件目录'
    },
    format: {
      type: 'string',
      alias: 'f',
      description: '音频格式 (mp3, aac, flac, alac, wav)'
    },
    quality: {
      type: 'string',
      alias: 'q',
      description: '音频质量 (low, medium, high)'
    }
  },
  async run({ args, rawArgs }) {
    const typedArgs = args as unknown as VideoToAudioCommandArgs
    const ctx = createCommandContext(rawArgs)
    ctx.showIntro()

    await tryCatch(async () => {
      // 获取输入文件路径
      const inputPath = await getInputPath(typedArgs.input, {
        message: '请输入视频文件路径',
        placeholder: 'video.mp4'
      })

      // 获取输出目录
      const outputDir = await getOutputDir(typedArgs.output, {
        defaultDir: path.dirname(inputPath)
      })

      // 选择音频格式
      let format = typedArgs.format as AudioFormat

      if (!format) {
        format = (await select({
          message: '选择音频格式',
          options: FORMAT_OPTIONS
        })) as AudioFormat
      } else if (!AUDIO_FORMATS[format]) {
        logger.error(`不支持的格式: ${format}`)
        logger.info(`支持的格式: ${Object.keys(AUDIO_FORMATS).join(', ')}`)
        process.exit(1)
      }

      // 选择音频质量
      const formatConfig = AUDIO_FORMATS[format]
      let quality: AudioQuality | undefined

      if (!typedArgs.quality && formatConfig.needsQuality) {
        const message = format === 'flac' ? '选择压缩级别' : '选择音频质量'

        quality = (await select({
          message,
          options: getQualityOptions(format)
        })) as AudioQuality
      } else if (typedArgs.quality) {
        quality = typedArgs.quality as AudioQuality
      } else {
        quality = DEFAULT_CONFIG.videoToAudio.defaultQuality
      }

      // 构建输出路径
      const outputPath = buildOutputPath(
        inputPath,
        outputDir,
        formatConfig.extension
      )

      // 开始转换
      const s = spinner()
      s.start('正在提取音频 0%')

      await extractAudio(
        inputPath,
        outputPath,
        { format, quality },
        (percent) => {
          s.message(`正在提取音频 ${percent}%`)
        }
      )

      s.stop(`音频已提取到: ${cyan(outputPath)}`)

      ctx.showOutro('🎉 提取完成')
    })
  }
})
