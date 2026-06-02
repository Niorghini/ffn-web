/**
 * NoteList —— 中栏：搜索 + 状态筛选 + 虚拟滚动笔记列表
 * - 状态：all / pending / completed
 * - 搜索：按 content 过滤
 * - 行高 56px
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Trash2, Plus } from 'lucide-react'
import { useNotesStore } from '@/stores/useNotesStore'
import { useTagsStore } from '@/stores/useTagsStore'
import { notesRepo } from '@/repositories/notesRepo'
import { useVirtualizer } from '@/hooks/useVirtualizer'
import SearchBar from './SearchBar'
import StatusFilter from './StatusFilter'

const ROW_HEIGHT = 56

const NoteList = ({ activeId, onSelect, onCreateNew }) => {
  const { notes, statusFilter, searchQuery, setStatusFilter, setSearchQuery, load, activeTagId } = useNotesStore()
  const { tags, load: loadTags } = useTagsStore()
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    load()
    loadTags()
    const handler = () => {
      load()
      loadTags()
      setRefreshKey((k) => k + 1)
    }
    window.addEventListener('data-updated', handler)
    return () => window.removeEventListener('data-updated', handler)
  }, [load, loadTags])

  const filtered = useMemo(() => {
    return notes
      .filter((n) => {
        if (statusFilter !== 'all' && n.status !== statusFilter) return false
        if (searchQuery && !n.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
        return true
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [notes, statusFilter, searchQuery])

  const { containerRef, totalHeight, visible, offsetY } = useVirtualizer({
    count: filtered.length,
    rowHeight: ROW_HEIGHT,
  })

  const tagByName = useMemo(() => new Map(tags.map((t) => [t.name, t])), [tags])

  const handleToggleStatus = async (e, n) => {
    e.stopPropagation()
    const next = n.status === 'completed' ? 'pending' : 'completed'
    await notesRepo.setStatus(n.id, next)
  }

  const handleDelete = async (e, n) => {
    e.stopPropagation()
    if (!confirm('确定删除这条记录？30 天内可在回收站恢复。')) return
    await notesRepo.softDelete(n.id)
  }

  return (
    <div className="flex flex-col h-full bg-bg-card">
      <div className="p-3 border-b border-gray-200 space-y-2">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto" data-testid="note-list">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {notes.length === 0 ? '还没有笔记，从右栏写下第一条' : '没有匹配的笔记'}
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visible.map((i) => {
                const n = filtered[i]
                return (
                  <NoteRow
                    key={n.id}
                    note={n}
                    active={activeId === n.id}
                    onClick={() => onSelect(n.id)}
                    onToggleStatus={(e) => handleToggleStatus(e, n)}
                    onDelete={(e) => handleDelete(e, n)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onCreateNew}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-dark"
        title="新建笔记"
        aria-label="新建笔记"
      >
        <Plus size={20} />
      </button>
    </div>
  )
}

const NoteRow = ({ note, active, onClick, onToggleStatus, onDelete }) => {
  const preview = note.content.replace(/#[\w一-鿿-]+/g, '').trim().slice(0, 100) || note.content.slice(0, 100)
  return (
    <div
      onClick={onClick}
      style={{ height: ROW_HEIGHT }}
      className={`flex items-start gap-2 px-4 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
        active ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      <button
        onClick={onToggleStatus}
        className="mt-0.5 text-gray-400 hover:text-primary"
        aria-label="切换状态"
      >
        {note.status === 'completed' ? (
          <CheckCircle2 size={16} className="text-primary" />
        ) : (
          <Circle size={16} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm whitespace-nowrap overflow-hidden text-ellipsis ${
            note.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {preview}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{formatTime(note.created_at)}</div>
      </div>
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-danger opacity-0 group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

const formatTime = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export default NoteList
