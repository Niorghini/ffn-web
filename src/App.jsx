/**
 * App 壳（M2 阶段）：
 * - 初始化 auth
 * - 未登录：显示 Login
 * - 已登录：启动 SyncManager + 显示三栏临时主界面（M5 会重写）
 * - 监听 data-updated 刷新待同步计数
 */
import { useEffect, useState } from 'react'
import { openDb, wasLegacyCleaned, markLegacyCleaned, db } from '@/lib/db'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSyncStore } from '@/stores/useSyncStore'
import { startSync, stopSync, getSyncManager } from '@/lib/syncInstance'
import Login from '@/pages/Login'
import NoteList from '@/components/NoteList'
import Editor from '@/components/Editor'
import Toast from '@/components/Toast'
import { LogOut, RefreshCw } from 'lucide-react'

function MainApp() {
  const [activeId, setActiveId] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, signOut } = useAuthStore()
  const { status, pending, online, lastSyncAt } = useSyncStore()

  useEffect(() => {
    if (!activeId) {
      setActiveNote(null)
      return
    }
    const load = async () => {
      const n = await db.notes.get(activeId)
      setActiveNote(n)
    }
    load()
  }, [activeId, refreshKey])

  useEffect(() => {
    const handler = () => {
      setRefreshKey((k) => k + 1)
      useSyncStore.getState().refreshPending()
    }
    window.addEventListener('data-updated', handler)
    return () => window.removeEventListener('data-updated', handler)
  }, [])

  const handleSync = async () => {
    await getSyncManager().fullSync()
    setRefreshKey((k) => k + 1)
  }

  const syncBadge = (() => {
    if (!online) return { color: 'bg-gray-300', text: '离线' }
    if (status === 'syncing') return { color: 'bg-yellow-400', text: '同步中' }
    if (status === 'error') return { color: 'bg-red-500', text: '同步失败' }
    if (pending > 0) return { color: 'bg-orange-400', text: `${pending} 条待同步` }
    return { color: 'bg-primary', text: '已同步' }
  })()

  return (
    <div className="h-screen flex flex-col bg-bg-main">
      <header className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-primary">发法牛 v1.2</h1>
          <span className="text-xs text-gray-400">{user?.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`inline-block w-2 h-2 rounded-full ${syncBadge.color}`} />
            <span>{syncBadge.text}</span>
            {lastSyncAt && (
              <span className="text-gray-400">
                · 上次 {new Date(lastSyncAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <button
            onClick={handleSync}
            className="p-1.5 text-gray-500 hover:text-primary"
            title="手动同步"
            aria-label="手动同步"
          >
            <RefreshCw size={16} />
          </button>
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
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[40%] max-w-md border-r border-gray-200 bg-bg-card">
          <NoteList activeId={activeId} onSelect={setActiveId} refreshKey={refreshKey} />
        </aside>
        <main className="flex-1 bg-white">
          <Editor key={activeId || 'new'} note={activeNote} onSaved={() => setRefreshKey((k) => k + 1)} />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, initialized, init } = useAuthStore()
  const [showLegacyToast, setShowLegacyToast] = useState(false)
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    openDb()
      .then(() => {
        if (!wasLegacyCleaned()) {
          setShowLegacyToast(true)
          markLegacyCleaned()
        }
        setDbReady(true)
      })
      .catch((err) => {
        console.error('DB open failed:', err)
        setDbReady(true)
      })
    init()
  }, [init])

  // 登录态切换时启动/停止同步
  useEffect(() => {
    if (!user) {
      stopSync()
      return
    }
    startSync().catch((err) => console.error('Sync start failed:', err))
  }, [user])

  if (!dbReady || !initialized) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-sm">
        加载中...
      </div>
    )
  }

  return (
    <>
      {user ? <MainApp /> : <Login />}
      {showLegacyToast && (
        <Toast
          message="检测到 v0.7.0 本地数据，已自动清理。新版数据采用新结构。"
          duration={6000}
          onClose={() => setShowLegacyToast(false)}
        />
      )}
    </>
  )
}
