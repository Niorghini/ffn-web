/**
 * TagList —— 左栏：标签列表 + 笔记数 + 选中过滤
 * - 搜索过滤
 * - 全部标签 + 未分类
 * - 拖拽排序（M5 留接口，默认按 name）
 */
import { useEffect, useState } from 'react'
import { Hash, Inbox, Tag as TagIcon, Search } from 'lucide-react'
import { useTagsStore } from '@/stores/useTagsStore'
import { useNotesStore } from '@/stores/useNotesStore'

export default function TagList() {
  const { tags, counts, load } = useTagsStore()
  const { activeTagId, setActiveTagId, notes, load: reloadNotes } = useNotesStore()
  const [query, setQuery] = useState('')

  useEffect(() => {
    load()
    const handler = () => {
      load()
      reloadNotes()
    }
    window.addEventListener('data-updated', handler)
    return () => window.removeEventListener('data-updated', handler)
  }, [load, reloadNotes])

  const filtered = tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
  const unTaggedCount = notes.filter((n) => {
    if (n.deleted_at || n.archived_at) return false
    return true
  }).length

  return (
    <div className="flex flex-col h-full bg-bg-sidebar">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-200">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标签..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <TagItem
          icon={<Inbox size={16} />}
          label="全部"
          count={notes.length}
          active={activeTagId === null}
          onClick={() => setActiveTagId(null)}
        />
        <TagItem
          icon={<TagIcon size={16} />}
          label="未分类"
          count={unTaggedCount}
          active={activeTagId === '__untagged__'}
          onClick={() => setActiveTagId('__untagged__')}
        />

        {filtered.length > 0 && (
          <div className="px-3 py-1 mt-2 text-xs text-gray-400 uppercase tracking-wider">标签</div>
        )}
        {filtered.map((t) => (
          <TagItem
            key={t.id}
            color={t.color}
            label={t.name}
            count={counts.get(t.id) || 0}
            active={activeTagId === t.id}
            onClick={() => setActiveTagId(t.id)}
          />
        ))}

        {tags.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            在笔记中使用 #标签 创建
          </div>
        )}
      </div>
    </div>
  )
}

const TagItem = ({ icon, color, label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/60 ${
      active ? 'bg-white text-primary font-medium' : 'text-gray-700'
    }`}
  >
    {icon || <Hash size={16} style={{ color: color || '#9CA3AF' }} />}
    <span className="flex-1 text-left truncate">{label}</span>
    <span className="text-xs text-gray-400">{count}</span>
  </button>
)
