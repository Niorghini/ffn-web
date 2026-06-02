/**
 * Settings 页面：账号、同步、自动归档、登出
 * v0.7.0 风格：白底卡片、圆角
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, LogOut, Eraser, RotateCcw } from 'lucide-react'
import { getArchiveAfterDays, setArchiveAfterDays, runArchive } from '@/lib/autoArchive'
import { tagsRepo } from '@/repositories/tagsRepo'
import { notesRepo } from '@/repositories/notesRepo'
import { fullReset } from '@/lib/factoryReset'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSyncManager } from '@/lib/syncInstance'
import { useSyncStore } from '@/stores/useSyncStore'

const OPTIONS = [
  { value: 7, label: '7 天' },
  { value: 30, label: '30 天（推荐）' },
  { value: -1, label: '永不' },
]

const Settings = () => {
  const { user, signOut } = useAuthStore()
  const { lastSyncAt } = useSyncStore()
  const [days, setDays] = useState(30)
  const [saved, setSaved] = useState(false)
  const [unused, setUnused] = useState(null) // null = 加载中, [] = 没有
  const [stats, setStats] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanedMsg, setCleanedMsg] = useState('')
  const [resetting, setResetting] = useState(false)

  const refreshUnused = async () => {
    const u = await tagsRepo.findUnused()
    setUnused(u)
  }

  const refreshStats = async () => {
    const s = await notesRepo.getStats()
    setStats(s)
  }

  useEffect(() => {
    getArchiveAfterDays().then(setDays)
    refreshUnused()
    refreshStats()
    const onUpdate = () => {
      refreshUnused()
      refreshStats()
    }
    window.addEventListener('data-updated', onUpdate)
    return () => window.removeEventListener('data-updated', onUpdate)
  }, [])

  const handleChange = async (v) => {
    setDays(v)
    await setArchiveAfterDays(v)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRunArchive = async () => {
    const count = await runArchive()
    alert(`本次归档 ${count} 条笔记`)
  }

  const handleSync = async () => {
    await getSyncManager().fullSync()
  }

  const handleHardDeleteUnused = async () => {
    if (cleaning) return
    if (!unused || unused.length === 0) {
      alert('没有未使用的标签')
      return
    }
    if (!confirm(`将物理删除 ${unused.length} 个未使用的标签（本地 + 云端）。\n此操作不可恢复，继续？`)) {
      return
    }
    setCleaning(true)
    try {
      const count = await tagsRepo.hardDeleteUnused()
      setCleanedMsg(`已删除 ${count} 个未用标签`)
      setTimeout(() => setCleanedMsg(''), 3000)
      await refreshUnused()
      await refreshStats()
    } catch (e) {
      alert('删除失败：' + e.message)
    } finally {
      setCleaning(false)
    }
  }

  const handleCleanOrphans = async () => {
    if (!stats || stats.noteTags.orphan === 0) return
    if (!confirm(`将清理 ${stats.noteTags.orphan} 个 orphan note_tags 链接（指向不存在笔记的 link）。继续？`)) return
    setCleaning(true)
    try {
      const count = await notesRepo.cleanOrphanNoteTags()
      setCleanedMsg(`已清理 ${count} 个 orphan 链接`)
      setTimeout(() => setCleanedMsg(''), 3000)
      await refreshStats()
      await refreshUnused()
    } catch (e) {
      alert('清理失败：' + e.message)
    } finally {
      setCleaning(false)
    }
  }

  const handleFactoryReset = async () => {
    if (resetting) return
    const c1 = confirm('⚠ 真的要清空所有数据吗？\n\n这会删除：所有笔记、所有标签、note_tags 链接、同步队列、冲突记录。\n\n保留：你的登录账号。\n\n不可恢复。继续？')
    if (!c1) return
    const c2 = confirm('再次确认：本地 IndexedDB 和云端 Supabase 的所有数据都会被删除。\n\n这一步是最后的检查。继续？')
    if (!c2) return
    setResetting(true)
    try {
      const result = await fullReset()
      const cloud = result.cloud?.skipped
        ? '（未登录，跳过云端）'
        : `笔记 ${result.cloud.notes} / 标签 ${result.cloud.tags} / 链接 ${result.cloud.note_tags}`
      alert(`重置完成！\n\n本地：${result.localStores} 个 store 已清空\n云端：${cloud}\n\n页面将刷新。`)
      window.location.reload()
    } catch (e) {
      alert('重置失败：' + e.message)
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-main">
      <header className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">设置</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <section className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          <h2 className="text-sm font-medium text-gray-800">账号</h2>
          <div className="text-sm text-gray-600">{user?.email}</div>
          <div className="text-xs text-gray-400">
            {lastSyncAt && `上次同步 ${new Date(lastSyncAt).toLocaleString('zh-CN')}`}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-800">同步</h2>
          <button
            onClick={handleSync}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} />
            立即同步
          </button>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium text-gray-800">自动归档</h2>
            <p className="text-xs text-gray-500 mt-1">已处理笔记超过指定天数后自动归档（仍可恢复）</p>
          </div>
          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="archive-days"
                  checked={days === opt.value}
                  onChange={() => handleChange(opt.value)}
                  className="text-[#0077B6] focus:ring-[#0077B6]"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {saved && <div className="text-xs text-[#0077B6]">已保存</div>}
          <button
            onClick={handleRunArchive}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            立即执行一次归档
          </button>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-2">数据</h2>
          <div className="space-y-3">
            <Link to="/trash" className="text-sm text-[#0077B6] hover:underline block">
              回收站（30 天内可恢复）
            </Link>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">数据库统计</span>
                <button
                  onClick={refreshStats}
                  className="text-xs text-[#0077B6] hover:underline"
                  title="重新计算"
                >
                  {stats === null ? '加载中...' : '刷新'}
                </button>
              </div>
              {stats && (
                <div className="text-xs text-gray-600 grid grid-cols-2 gap-x-3 gap-y-0.5 mb-2 font-mono">
                  <span>笔记</span>
                  <span className="text-right">
                    active {stats.notes.active} · deleted {stats.notes.deleted} · archived {stats.notes.archived}
                  </span>
                  <span>标签</span>
                  <span className="text-right">
                    active {stats.tags.active} · deleted {stats.tags.deleted}
                  </span>
                  <span>note_tags 链接</span>
                  <span className="text-right">
                    active {stats.noteTags.active} · deleted {stats.noteTags.deleted}
                    {stats.noteTags.orphan > 0 && (
                      <span className="text-red-600 ml-1">· orphan {stats.noteTags.orphan}</span>
                    )}
                  </span>
                </div>
              )}
              {stats && stats.noteTags.orphan > 0 && (
                <button
                  onClick={handleCleanOrphans}
                  disabled={cleaning}
                  className="text-xs px-3 py-1.5 border border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
                >
                  {cleaning ? '清理中...' : `清理 ${stats.noteTags.orphan} 个 orphan 链接`}
                </button>
              )}
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">未使用标签</span>
                <button
                  onClick={refreshUnused}
                  className="text-xs text-[#0077B6] hover:underline"
                  title="重新计算"
                >
                  {unused === null ? '加载中...' : `刷新 · ${unused.length} 个`}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                没有任何活跃笔记链接的标签（包括软删）。会从本地和云端同时删除。
              </p>
              {unused && unused.length > 0 && (
                <ul className="mb-3 space-y-1 max-h-40 overflow-y-auto bg-bg-main rounded p-2">
                  {unused.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: t.color || '#9CA3AF' }}
                      />
                      <span className="text-gray-700 flex-1 truncate">#{t.name}</span>
                      {t.deleted_at && (
                        <span className="text-[10px] text-gray-400">已软删</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={handleHardDeleteUnused}
                disabled={cleaning || !unused || unused.length === 0}
                className="text-xs px-3 py-1.5 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
              >
                <Eraser size={12} />
                {cleaning ? '清理中...' : '硬删除未用标签'}
              </button>
              {cleanedMsg && <div className="text-xs text-[#0077B6] mt-2">{cleanedMsg}</div>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-sm font-medium text-red-600 mb-3">危险操作</h2>
          <div className="space-y-2">
            <button
              onClick={signOut}
              className="text-sm px-3 py-1.5 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={14} />
              退出登录
            </button>
            <button
              onClick={handleFactoryReset}
              disabled={resetting}
              className="w-full text-sm px-3 py-1.5 border-2 border-red-600 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5 justify-center transition-colors"
            >
              <RotateCcw size={14} />
              {resetting ? '重置中...' : '清空所有数据（本地 + 云端，保留账号）'}
            </button>
          </div>
        </section>

        <div className="text-center text-xs text-gray-400 pt-2">发法牛 v1.2</div>
      </div>
    </div>
  )
}

export default Settings
