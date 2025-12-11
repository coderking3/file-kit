import type { AudioFormat, AudioQuality } from '#/core/video-converter'

import path from 'node:path'
import process from 'node:process'

import { intro, outro, spinner } from '@clack/prompts'
import { bold, cyan } from 'ansis'
import { defineCommand } from 'citty'

import { CLI_NAME } from '#/constants'
import { AUDIO_FORMATS, extractAudio } from '#/core/video-converter'
import { fileExists } from '#/utils/file'
import { logger } from '#/utils/logger'
import { confirm, select, text } from '#/utils/prompts'

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
    const isMainInteractive = Array.isArray(rawArgs) && rawArgs.includes('-i')
    if (!isMainInteractive) intro(bold.cyan(`🔧 ${CLI_NAME}`))

    let inputPath = args.input
    let outputDir = args.output

    // 获取输入文件路径
    if (!inputPath) {
      inputPath = await text({
        message: '请输入视频文件路径',
        placeholder: 'video.mp4',
        validate: (value) => {
          if (!value) return '文件路径不能为空'
          if (!fileExists(value)) return '文件不存在'
        }
      })
    } else if (!fileExists(inputPath)) {
      logger.error(`文件不存在: ${inputPath}`)
      process.exit(1)
    }

    // 获取输出目录
    if (!outputDir) {
      const defaultOutputDir = path.dirname(inputPath)
      const shouldUseDefault = await confirm({
        message: `使用默认输出目录: ${cyan(defaultOutputDir)}`
      })

      outputDir = shouldUseDefault
        ? defaultOutputDir
        : await text({
            message: '请输入输出目录',
            placeholder: './.output',
            validate: (value) => {
              if (!value) return '输出目录不能为空'
            }
          })
    }

    // 选择音频格式
    let format = args.format as AudioFormat

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

    // 选择音频质量（如果格式需要）
    const formatConfig = AUDIO_FORMATS[format]
    let quality: AudioQuality | undefined

    if (!args.quality && formatConfig.needsQuality) {
      const message = format === 'flac' ? '选择压缩级别' : '选择音频质量'

      quality = (await select({
        message,
        options: getQualityOptions(format)
      })) as AudioQuality
    } else if (args.quality) {
      quality = args.quality as AudioQuality
    }

    // 开始转换
    try {
      const s = spinner()
      s.start('正在提取音频 0%...')

      const outputPath = await extractAudio(
        inputPath,
        outputDir,
        { format, quality },
        (percent) => {
          s.message(`正在提取音频 ${percent}%`)
        }
      )

      s.stop(`音频已提取到: ${cyan(outputPath)}`)

      outro(bold.green('🎉 提取完成'))
    } catch (error: any) {
      logger.error(`提取失败: ${error.message}`)
      process.exit(1)
    }
  }
})
