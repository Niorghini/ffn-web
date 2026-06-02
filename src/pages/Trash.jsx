/**
 * Trash 页面：30 天内软删除的笔记 + 恢复 / 永久删除
 */
import { useEffect, useState } from 'react'
import { Trash2, RotateCcw, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '@/lib/db'
import { notesRepo } from '@/repositories/notesRepo'
import { runCleanup } from '@/lib/cleanup'

const Trash = () => {
  const [notes, setNotes] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      const all = await notesRepo.getAll({ includeDeleted: true })
      setNotes(all.filter((n) => n.deleted_at))
    }
    load()
    const handler = () => {
      load()
      setRefreshKey((k) => k + 1)
    }
    window.addEventListener('data-updated', handler)
    return () => window.removeEventListener('data-updated', handler)
  }, [refreshKey])

  const handleRestore = async (id) => {
    await notesRepo.restore(id)
  }

  const handleHardDelete = async (id) => {
    if (!confirm('永久删除？此操作不可恢复。')) return
    await db.notes.delete(id)
    window.dispatchEvent(new CustomEvent('data-updated'))
  }

  const handleCleanup = async () => {
    const stats = await runCleanup()
    alert(`已清理：${JSON.stringify(stats)}`)
  }

  const daysLeft = (deletedAt) => {
    const days = Math.ceil((30 * 86400000 - (Date.now() - new Date(deletedAt).getTime())) / 86400000)
    return Math.max(0, days)
  }

  return (
    <div className="min-h-screen bg-bg-main">
      <header className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-semibold">回收站</h1>
        </div>
        <button
          onClick={handleCleanup}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
        >
          立即清理过期
        </button>
      </header>
      <div className="max-w-3xl mx-auto p-6">
        {notes.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">回收站是空的</div>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="bg-white p-4 rounded border border-gray-200 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 line-through">{n.content.slice(0, 200)}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    删除于 {new Date(n.deleted_at).toLocaleString('zh-CN')} · 还剩 {daysLeft(n.deleted_at)} 天
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(n.id)}
                  className="px-3 py-1 text-xs text-primary border border-primary rounded hover:bg-primary/5"
                >
                  <RotateCcw size={12} className="inline mr-1" />
                  恢复
                </button>
                <button
                  onClick={() => handleHardDelete(n.id)}
                  className="px-3 py-1 text-xs text-danger border border-danger rounded hover:bg-danger-bg"
                >
                  <Trash2 size={12} className="inline mr-1" />
                  永久删
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Trash
