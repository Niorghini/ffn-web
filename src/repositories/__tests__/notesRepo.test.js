/**
 * notesRepo 测试
 * - create: 写入 + sync_queue 入队 + version=1
 * - update: bump version + updated_at + sync_status=pending + 入队
 * - softDelete: 设 deleted_at + bump + 入队
 * - restore: 清 deleted_at + bump + 入队
 * - getAll: 排除 deleted
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { db, openDb } from '@/lib/db'
import { notesRepo } from '@/repositories/notesRepo'

describe('notesRepo', () => {
  beforeEach(async () => {
    await openDb()
    await db.notes.clear()
    await db.sync_queue.clear()
    await db.note_tags.clear()
  })

  it('create 写入笔记 + 入队 + 默认字段', async () => {
    const note = await notesRepo.create({ content: 'hello' })
    expect(note.id).toBeTruthy()
    expect(note.content).toBe('hello')
    expect(note.status).toBe('pending')
    expect(note.version).toBe(1)
    expect(note.deleted_at).toBeNull()
    expect(note.sync_status).toBe('pending')
    const queue = await db.sync_queue.toArray()
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ type: 'create', entity_type: 'notes', priority: 1 })
  })

  it('create 接受 tagIds 并写入 note_tags', async () => {
    const note = await notesRepo.create({ content: '#foo #bar', tagIds: ['t1', 't2'] })
    const links = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(links).toHaveLength(2)
    expect(links.map((l) => l.tag_id).sort()).toEqual(['t1', 't2'])
    // 1 note + 2 tag_attach 入队
    const queue = await db.sync_queue.toArray()
    expect(queue).toHaveLength(3)
    expect(queue.filter((q) => q.type === 'tag_attach')).toHaveLength(2)
  })

  it('update bump version + updated_at + sync_status=pending', async () => {
    const note = await notesRepo.create({ content: 'v1' })
    const originalVersion = note.version
    const originalUpdated = note.updated_at
    // 等待 1ms 保证 updated_at 不同
    await new Promise((r) => setTimeout(r, 5))
    const updated = await notesRepo.update(note.id, { content: 'v2' })
    expect(updated.version).toBe(originalVersion + 1)
    expect(updated.content).toBe('v2')
    expect(updated.updated_at).not.toBe(originalUpdated)
    expect(updated.sync_status).toBe('pending')
  })

  it('update 不存在的笔记抛错', async () => {
    await expect(notesRepo.update('nonexistent', { content: 'x' })).rejects.toThrow()
  })

  it('setStatus 合法值', async () => {
    const note = await notesRepo.create({ content: 'x' })
    const completed = await notesRepo.setStatus(note.id, 'completed')
    expect(completed.status).toBe('completed')
    expect(completed.version).toBe(note.version + 1)
  })

  it('setStatus 拒绝非法值', async () => {
    const note = await notesRepo.create({ content: 'x' })
    await expect(notesRepo.setStatus(note.id, 'invalid')).rejects.toThrow()
  })

  it('setStatus 同值不动', async () => {
    const note = await notesRepo.create({ content: 'x' })
    const before = await db.sync_queue.count()
    const again = await notesRepo.setStatus(note.id, 'pending')
    expect(again.version).toBe(note.version)
    const after = await db.sync_queue.count()
    expect(after).toBe(before)
  })

  it('softDelete 设 deleted_at + bump', async () => {
    const note = await notesRepo.create({ content: 'x' })
    const deleted = await notesRepo.notesRepo ? null : await notesRepo.softDelete(note.id)
    expect(deleted.deleted_at).toBeTruthy()
    expect(deleted.version).toBe(note.version + 1)
    const queue = await db.sync_queue.toArray()
    expect(queue.find((q) => q.type === 'delete' && q.entity_id === note.id)).toBeTruthy()
  })

  it('restore 清 deleted_at + bump', async () => {
    const note = await notesRepo.create({ content: 'x' })
    await notesRepo.softDelete(note.id)
    const restored = await notesRepo.restore(note.id)
    expect(restored.deleted_at).toBeNull()
    expect(restored.version).toBe(note.version + 2)
  })

  it('getAll 默认排除 deleted', async () => {
    const a = await notesRepo.create({ content: 'a' })
    const b = await notesRepo.create({ content: 'b' })
    await notesRepo.softDelete(b.id)
    const all = await notesRepo.getAll()
    expect(all.map((n) => n.id)).toEqual([b.id, a.id].filter((id) => id === a.id))
  })

  it('getAll includeDeleted 看到全部', async () => {
    const a = await notesRepo.create({ content: 'a' })
    const b = await notesRepo.create({ content: 'b' })
    await notesRepo.softDelete(b.id)
    const all = await notesRepo.getAll({ includeDeleted: true })
    expect(all).toHaveLength(2)
  })

  it('update 软删除后的笔记抛错', async () => {
    const note = await notesRepo.create({ content: 'x' })
    await notesRepo.softDelete(note.id)
    await expect(notesRepo.update(note.id, { content: 'y' })).rejects.toThrow()
  })

  // ── softDelete 同步处理 note_tags ────────────────────────────────
  it('softDelete 同步软删该笔记的活跃 note_tags 链接', async () => {
    const note = await notesRepo.create({ content: '#a #b', tagIds: ['t1', 't2'] })
    const before = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(before.every((l) => !l.deleted_at)).toBe(true)
    await notesRepo.softDelete(note.id)
    const after = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(after.every((l) => !!l.deleted_at)).toBe(true)
  })

  it('restore 同步复活被 softDelete 软删的 link', async () => {
    const note = await notesRepo.create({ content: 'x', tagIds: ['t1'] })
    await notesRepo.softDelete(note.id)
    const during = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(during[0].deleted_at).toBeTruthy()
    await notesRepo.restore(note.id)
    const after = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(after[0].deleted_at).toBeNull()
  })

  // ── hardDelete 物理删 ───────────────────────────────────────────
  it('hardDelete 物理删 note + 删它的所有 note_tags 链接', async () => {
    const note = await notesRepo.create({ content: 'x', tagIds: ['t1', 't2'] })
    expect(await db.notes.get(note.id)).toBeTruthy()
    expect(await db.note_tags.where('note_id').equals(note.id).count()).toBe(2)
    await notesRepo.hardDelete(note.id)
    expect(await db.notes.get(note.id)).toBeUndefined()
    expect(await db.note_tags.where('note_id').equals(note.id).count()).toBe(0)
  })

  it('hardDelete 清残留 sync_queue entries', async () => {
    const note = await notesRepo.create({ content: 'x' })
    const before = await db.sync_queue.where('entity_id').equals(note.id).toArray()
    expect(before.length).toBeGreaterThan(0)
    await notesRepo.hardDelete(note.id)
    const after = await db.sync_queue.where('entity_id').equals(note.id).toArray()
    expect(after).toHaveLength(0)
  })

  it('硬删的不存在的 id no-op', async () => {
    await expect(notesRepo.hardDelete('nope')).resolves.toBeUndefined()
  })

  // ── hardDelete 同步云端 ────────────────────────────────────────
  it('hardDelete 调云端删 note + note_tags（先 link 后 note）', async () => {
    const { supabase } = await import('@/lib/supabase')
    const callOrder = []
    const linkDelete = vi.fn(() => { callOrder.push('note_tags'); return { eq: vi.fn().mockReturnValue({ error: null }) } })
    const noteDelete = vi.fn(() => { callOrder.push('notes'); return { eq: vi.fn().mockReturnValue({ error: null }) } })
    supabase.from = vi.fn((name) => {
      if (name === 'note_tags') return { delete: linkDelete }
      if (name === 'notes') return { delete: noteDelete }
      return { delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }) }
    })
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } })

    const note = await notesRepo.create({ content: 'x' })
    await notesRepo.hardDelete(note.id)

    expect(callOrder).toEqual(['note_tags', 'notes'])
    expect(linkDelete).toHaveBeenCalled()
    expect(noteDelete).toHaveBeenCalled()
  })

  it('hardDelete 云端失败不阻塞本地删除（best effort）', async () => {
    const { supabase } = await import('@/lib/supabase')
    supabase.from = vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: new Error('cloud 500') }) }),
    })
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } })
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const note = await notesRepo.create({ content: 'x' })
    await expect(notesRepo.hardDelete(note.id)).resolves.toBeUndefined()
    expect(await db.notes.get(note.id)).toBeUndefined() // 本地仍删了
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  it('hardDelete 用户未登录时跳过云端', async () => {
    const { supabase } = await import('@/lib/supabase')
    const fromSpy = vi.fn()
    supabase.from = fromSpy
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } })

    const note = await notesRepo.create({ content: 'x' })
    await notesRepo.hardDelete(note.id)
    expect(fromSpy).not.toHaveBeenCalled() // 不调 supabase.from
    expect(await db.notes.get(note.id)).toBeUndefined() // 本地照删
  })

  // ── update 同步 tag 关联 ────────────────────────────────────────
  it('update 新增 #tag → link 创建 + tag 入库', async () => {
    const note = await notesRepo.create({ content: 'hi' })
    expect(await db.notes.get(note.id)).toBeTruthy()
    // 还没 link
    expect(await db.note_tags.where('note_id').equals(note.id).count()).toBe(0)
    // 用 update 加 #newtag
    await notesRepo.update(note.id, { content: 'hi #newtag' })
    const links = await db.note_tags.where('note_id').equals(note.id).toArray()
    const activeLinks = links.filter((l) => !l.deleted_at)
    expect(activeLinks).toHaveLength(1)
    // tag 入库
    const tag = await db.tags.where('name').equals('newtag').first()
    expect(tag).toBeTruthy()
    expect(tag.id).toBe(activeLinks[0].tag_id)
  })

  it('update 去掉 #tag → 软删 link（不删 tag 本身）', async () => {
    const { tagsRepo } = await import('@/repositories/tagsRepo')
    const [t] = await tagsRepo.findOrCreate(['gone'])
    const note = await notesRepo.create({ content: 'hi #gone', tagIds: [t.id] })
    expect(await db.note_tags.where('note_id').equals(note.id).filter((l) => !l.deleted_at).count()).toBe(1)
    await notesRepo.update(note.id, { content: 'hi (no tag now)' })
    const links = await db.note_tags.where('note_id').equals(note.id).toArray()
    expect(links).toHaveLength(1) // 行还在
    expect(links[0].deleted_at).toBeTruthy() // 但软删了
    // tag 本身还在（不删实体）
    expect(await db.tags.get(t.id)).toBeTruthy()
  })

  it('update 保留活跃 link（不重置未变的）', async () => {
    const { tagsRepo } = await import('@/repositories/tagsRepo')
    const [t1] = await tagsRepo.findOrCreate(['t1'])
    const note = await notesRepo.create({ content: 'a #t1', tagIds: [t1.id] })
    const before = await db.note_tags.where('note_id').equals(note.id).filter((l) => !l.deleted_at).first()
    // update 不改 tag（同样 #t1）
    await notesRepo.update(note.id, { content: 'a #t1 updated text' })
    const after = await db.note_tags.where('note_id').equals(note.id).filter((l) => !l.deleted_at).first()
    expect(after.id).toBe(before.id) // 同一个 link
    expect(after.version).toBe(before.version) // version 没动（因为 link 没改）
  })

  it('update 同时增 + 删 tag：增的 link 创建 + 删的 link 软删', async () => {
    const { tagsRepo } = await import('@/repositories/tagsRepo')
    const [t1] = await tagsRepo.findOrCreate(['t1'])
    const note = await notesRepo.create({ content: 'old #t1', tagIds: [t1.id] })
    await notesRepo.update(note.id, { content: 'new #t2' })
    const links = await db.note_tags.where('note_id').equals(note.id).toArray()
    const active = links.filter((l) => !l.deleted_at)
    expect(active).toHaveLength(1)
    // t1 被软删
    const t1Link = links.find((l) => l.tag_id === t1.id)
    expect(t1Link.deleted_at).toBeTruthy()
    // t2 创建
    const t2 = await db.tags.where('name').equals('t2').first()
    expect(t2).toBeTruthy()
    expect(active[0].tag_id).toBe(t2.id)
  })

  // ── cleanOrphanNoteTags ─────────────────────────────────────────
  it('cleanOrphanNoteTags 删指向不存在笔记的 link', async () => {
    const note = await notesRepo.create({ content: 'x', tagIds: ['t1'] })
    // 手动塞一个 orphan
    await db.note_tags.add({ note_id: 'orphan-note', tag_id: 't1', created_at: '2026-01-01', version: 1, sync_status: 'pending' })
    const count = await notesRepo.cleanOrphanNoteTags()
    expect(count).toBe(1)
    expect(await db.note_tags.get(['orphan-note', 't1'])).toBeUndefined()
    expect(await db.note_tags.get([note.id, 't1'])).toBeTruthy()
  })

  it('cleanOrphanNoteTags 无 orphan 返回 0', async () => {
    const note = await notesRepo.create({ content: 'x', tagIds: ['t1'] })
    const count = await notesRepo.cleanOrphanNoteTags()
    expect(count).toBe(0)
  })

  // ── getStats ────────────────────────────────────────────────────
  it('getStats 返回准确的 active/deleted/total 计数', async () => {
    const a = await notesRepo.create({ content: 'a' })
    const b = await notesRepo.create({ content: 'b' })
    const c = await notesRepo.create({ content: 'c' })
    await notesRepo.softDelete(c.id)
    const s = await notesRepo.getStats()
    expect(s.notes.total).toBe(3)
    expect(s.notes.active).toBe(2)
    expect(s.notes.deleted).toBe(1)
  })

  it('getStats 算 orphan note_tags', async () => {
    await notesRepo.create({ content: 'x' })
    await db.note_tags.add({ note_id: 'orphan', tag_id: 't1', created_at: '2026-01-01', version: 1, sync_status: 'pending' })
    const s = await notesRepo.getStats()
    expect(s.noteTags.orphan).toBe(1)
  })

  // ── hardDelete 自动清理独占 tag ─────────────────────────────────
  it('hardDelete 删唯一引用该 tag 的笔记 → tag 跟着删', async () => {
    // 先建一个真 tag
    const [t] = await db.tags.toArray()  // 还没数据
    // 用 tagsRepo.findOrCreate 走完整流程
    const { tagsRepo } = await import('@/repositories/tagsRepo')
    const [tag] = await tagsRepo.findOrCreate(['only'])
    const note = await notesRepo.create({ content: 'x', tagIds: [tag.id] })
    expect(await db.tags.get(tag.id)).toBeTruthy()
    await notesRepo.hardDelete(note.id)
    expect(await db.tags.get(tag.id)).toBeUndefined()
  })

  it('hardDelete 不删仍有其他引用的 tag', async () => {
    const { tagsRepo } = await import('@/repositories/tagsRepo')
    const [tag] = await tagsRepo.findOrCreate(['shared'])
    const n1 = await notesRepo.create({ content: 'a', tagIds: [tag.id] })
    const n2 = await notesRepo.create({ content: 'b', tagIds: [tag.id] })
    await notesRepo.hardDelete(n1.id)
    expect(await db.tags.get(tag.id)).toBeTruthy()
    await notesRepo.hardDelete(n2.id)
    expect(await db.tags.get(tag.id)).toBeUndefined()
  })
})
