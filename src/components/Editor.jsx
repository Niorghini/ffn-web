/**
 * Editor —— 右栏：选中笔记的编辑视图
 * - 存在笔记：300ms debounce 自动保存
 * - 新建：Ctrl+Enter 提交
 * - 标签高亮显示
 * - 顶部状态切换 + 删除
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle, Trash2, ArrowLeft } from 'lucide-react'
import { notesRepo } from '@/repositories/notesRepo'
import { tagsRepo } from '@/repositories/tagsRepo'
import { extractTagNames } from '@/lib/tags'

const DEBOUNCE_MS = 300

const Editor = ({ note, onSaved, onBack }) => {
  const [content, setContent] = useState(note?.content ?? '')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    setContent(note?.content ?? '')
    setSavedAt(null)
  }, [note?.id])

  useEffect(() => {
    const names = extractTagNames(content)
    setTags(names)
  }, [content])

  const scheduleAutoSave = (next) => {
    if (!note?.id) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await notesRepo.update(note.id, { content: next })
        setSavedAt(new Date())
        onSaved?.()
      } finally {
        setSaving(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleChange = (e) => {
    const v = e.target.value
    setContent(v)
    if (note?.id) scheduleAutoSave(v)
  }

  const handleSubmit = async () => {
    if (!content.trim()) return
    const tagRecords = await tagsRepo.findOrCreate(extractTagNames(content))
    const created = await notesRepo.create({ content, tagIds: tagRecords.map((t) => t.id) })
    onSaved?.(created)
  }

  const handleKeyDown = (e) => {
    if (!note && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleStatusToggle = async () => {
    if (!note?.id) return
    const next = note.status === 'completed' ? 'pending' : 'completed'
    await notesRepo.setStatus(note.id, next)
    onSaved?.()
  }

  const handleDelete = async () => {
    if (!note?.id) return
    if (!confirm('确定删除？30 天内可在回收站恢复。')) return
    await notesRepo.softDelete(note.id)
    onSaved?.()
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {note && (
            <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600" title="返回列表">
              <ArrowLeft size={16} />
            </button>
          )}
          {note ? (
            <>
              <button
                onClick={handleStatusToggle}
                className="text-gray-500 hover:text-primary"
                title="切换状态"
              >
                {note.status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-primary" />
                ) : (
                  <Circle size={18} />
                )}
              </button>
              <span className="text-xs text-gray-400">
                {saving ? '保存中...' : savedAt ? `已保存 ${formatTime(savedAt)}` : formatTime(note.created_at)}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400">新笔记</span>
          )}
        </div>
        {note && (
          <button onClick={handleDelete} className="text-gray-400 hover:text-danger" title="删除">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={note ? '编辑内容...' : '写下你的想法...（Ctrl+Enter 提交）'}
        className="flex-1 w-full p-4 resize-none outline-none text-base leading-relaxed"
        autoFocus
      />
      {tags.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}
      {!note && content.trim() && (
        <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSubmit}
            className="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark"
          >
            创建
          </button>
        </div>
      )}
    </div>
  )
}

const formatTime = (d) => {
  const x = typeof d === 'string' ? new Date(d) : d
  const h = x.getHours().toString().padStart(2, '0')
  const m = x.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export default Editor
