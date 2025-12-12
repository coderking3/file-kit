import type { AudioFormat, AudioFormatConfig } from '#/types'

/**
 * 音频格式配置表
 */
export const AUDIO_FORMATS: Record<AudioFormat, AudioFormatConfig> = {
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
    extraArgs: ['-movflags', '+faststart']
  },
  flac: {
    codec: 'flac',
    extension: 'flac',
    quality: { low: '0', medium: '5', high: '8' },
    description: 'FLAC (无损)',
    needsQuality: true,
    extraArgs: ['-sample_fmt', 's16']
  },
  alac: {
    codec: 'alac',
    extension: 'm4a',
    quality: { low: '0', medium: '0', high: '0' },
    description: 'ALAC (Apple 无损)',
    needsQuality: false,
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
