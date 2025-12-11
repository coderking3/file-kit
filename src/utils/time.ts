// 获取当前UTC+8时间
export function nowUTC8(): string {
  const now = new Date()
  const utc8Time = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return utc8Time.toISOString().replace('T', ' ').substring(0, 19)
}
