import process from 'node:process'

import {
  confirm as clackConfirm,
  isCancel as clackIsCancel,
  select as clackSelect,
  text as clackText
} from '@clack/prompts'
import ansis from 'ansis'

import { logger } from './logger'

export async function text(
  options: Parameters<typeof clackText>[0]
): Promise<string> {
  const result = await clackText(options)

  if (clackIsCancel(result)) {
    logger.error(ansis.red('已退出'))
    process.exit(0)
  }

  return result as string
}

export async function confirm(
  options: Parameters<typeof clackConfirm>[0]
): Promise<boolean> {
  const result = await clackConfirm(options)

  if (clackIsCancel(result)) {
    logger.error(ansis.red('已退出'))

    process.exit(0)
  }

  return result as boolean
}

export async function select<T extends string>(
  options: Parameters<typeof clackSelect>[0]
): Promise<T> {
  const result = await clackSelect(options)

  if (clackIsCancel(result)) {
    logger.error(ansis.red('已退出'))

    process.exit(0)
  }

  return result as T
}
