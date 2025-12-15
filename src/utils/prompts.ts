import process from 'node:process'

import {
  confirm as clackConfirm,
  isCancel as clackIsCancel,
  password as clackPassword,
  select as clackSelect,
  text as clackText
} from '@clack/prompts'
import ansis from 'ansis'

import { logger } from './logger'

/**
 * 处理取消操作
 */
function handleCancel(result: unknown): void {
  if (clackIsCancel(result)) {
    logger.error(ansis.red('操作已取消'))
    process.exit(0)
  }
}

/**
 * 文本输入
 */
export async function text(
  options: Parameters<typeof clackText>[0]
): Promise<string> {
  const result = await clackText(options)
  handleCancel(result)
  return result as string
}

/**
 * 确认输入
 */
export async function confirm(
  options: Parameters<typeof clackConfirm>[0]
): Promise<boolean> {
  const result = await clackConfirm(options)
  handleCancel(result)
  return result as boolean
}

/**
 * 选择输入
 */
export async function select<T extends string>(
  options: Parameters<typeof clackSelect>[0]
): Promise<T> {
  const result = await clackSelect(options)
  handleCancel(result)
  return result as T
}

/**
 * 密码输入
 */
export async function password(
  options: Parameters<typeof clackPassword>[0]
): Promise<string> {
  const result = await clackPassword(options)
  handleCancel(result)
  return result as string
}
