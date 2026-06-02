/**
 * 工厂重置
 * - 清本地 Dexie 所有 store（笔记/标签/note_tags/sync_queue/sync_metadata/conflicts/cache）
 * - 清云端当前 user 的所有笔记/标签/note_tags（RLS 自动 scope 到 user）
 * - 保留 auth.users 账号
 *
 * 不可恢复。UI 上必须 3 次确认 + 强提示。
 */
import { db } from './db'
import { supabase } from './supabase'
import { stopSync } from './syncInstance'
import { stopArchiveScheduler } from './autoArchive'

const CLOUD_TABLES = ['notes', 'tags', 'note_tags']

/**
 * 清空所有 Dexie 存储（保留 auth 状态）
 */
export const localReset = async () => {
  const stores = db.tables.map((t) => t.name)
  await db.transaction(
    'rw',
    db.notes,
    db.tags,
    db.note_tags,
    db.sync_queue,
    db.sync_metadata,
    db.conflicts,
    db.cache,
    async () => {
      for (const name of stores) {
        await db.table(name).clear()
      }
    },
  )
  return stores.length
}

/**
 * 清空云端当前 user 的所有数据
 * - 用 .gte('updated_at', '1970-01-01') 触发 PostgREST bulk delete
 * - RLS 自动 scope 到当前 user 的行
 * - 如果用户未登录（offline 状态），跳过
 */
export const cloudReset = async () => {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    return { skipped: true, reason: 'not signed in' }
  }
  const stats = { notes: 0, tags: 0, note_tags: 0 }
  for (const tableName of CLOUD_TABLES) {
    const { error, count } = await supabase
      .from(tableName)
      .delete({ count: 'exact' })
      .gte('updated_at', '1970-01-01T00:00:00Z')
    if (error) {
      throw new Error(`cloud ${tableName}: ${error.message}`)
    }
    stats[tableName] = count ?? 0
  }
  return { skipped: false, ...stats }
}

/**
 * 完整重置：先停 sync / 归档 / cleanup 定时器，再清本地 + 云端
 * - 必须在 sync 未运行时调用，避免重置期间 sync 写入新数据
 * - UI 上：调用前最好 reload 一次（确保没有正在进行的写）
 */
export const fullReset = async () => {
  // 1. 停所有后台任务
  await stopSync().catch(() => {})
  stopArchiveScheduler()
  // 2. 清本地
  const localStores = await localReset()
  // 3. 清云端
  const cloudStats = await cloudReset()
  return { localStores, cloud: cloudStats }
}
