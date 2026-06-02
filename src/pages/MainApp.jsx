/**
 * MainApp —— 三栏主界面
 * - 左 240px：TagList
 * - 中 flex-1：NoteList (含搜索/状态/虚拟滚动/FAB)
 * - 右 480px：Editor
 * - 顶栏：标题 + 同步指示器 + 手动同步 + 设置 + 登出
 * - 底部：冲突 banner
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import { db } from '@/lib/db'
import { getSyncManager } from '@/lib/syncInstance'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotesStore } from '@/stores/useNotesStore'
import { useSyncStore } from '@/stores/useSyncStore'
import TagList from '@/components/TagList'
import NoteList from '@/components/NoteList'
import Editor from '@/components/Editor'
import SyncIndicator from '@/components/SyncIndicator'
import { ConflictBanner } from '@/components/ConflictDialog'

const MainApp = () => {
  const { user, signOut } = useAuthStore()
  const { notes, setActiveTagId, load } = useNotesStore()
  const [activeId, setActiveId] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!activeId) {
      setActiveNote(null)
      return
    }
    db.notes.get(activeId).then(setActiveNote)
  }, [activeId, refreshKey])

  // 全局 data-updated 监听
  useEffect(() => {
    const handler = () => {
      setRefreshKey((k) => k + 1)
      if (activeId) db.notes.get(activeId).then(setActiveNote)
    }
    window.addEventListener('data-updated', handler)
    return () => window.removeEventListener('data-updated', handler)
  }, [activeId])

  const handleSelect = (id) => {
    setActiveTagId(null) // 清除 tag 过滤
    setActiveId(id)
  }

  const handleCreateNew = () => {
    setActiveTagId(null)
    setActiveId(null)
  }

  const handleSaved = () => {
    setRefreshKey((k) => k + 1)
  }

  const handleSync = async () => {
    await getSyncManager().fullSync()
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="h-screen flex flex-col bg-bg-main">
      <header className="px-4 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-semibold text-primary shrink-0">发法牛</h1>
          <span className="text-xs text-gray-400 truncate">{user?.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <button
            onClick={handleSync}
            className="p-1.5 text-gray-500 hover:text-primary"
            title="手动同步"
            aria-label="手动同步"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            to="/trash"
            className="p-1.5 text-gray-500 hover:text-primary"
            title="回收站"
            aria-label="回收站"
          >
            <Trash2 size={16} />
          </Link>
          <Link
            to="/settings"
            className="p-1.5 text-gray-500 hover:text-primary"
            title="设置"
            aria-label="设置"
          >
            <Settings size={16} />
          </Link>
          <button
            onClick={signOut}
            className="p-1.5 text-gray-500 hover:text-danger"
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-[240px] border-r border-gray-200 shrink-0">
          <TagList />
        </aside>
        <section className="flex-1 min-w-0 border-r border-gray-200 relative">
          <NoteList
            activeId={activeId}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
          />
        </section>
        <section className="w-[480px] shrink-0">
          <Editor
            key={activeId || 'new'}
            note={activeNote}
            onSaved={handleSaved}
            onBack={() => setActiveId(null)}
          />
        </section>
      </div>

      <ConflictBanner />
    </div>
  )
}

export default MainApp
