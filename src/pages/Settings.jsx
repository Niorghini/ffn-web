/**
 * Settings 页面：自动归档策略、手动同步、登出
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, LogOut } from 'lucide-react'
import { getArchiveAfterDays, setArchiveAfterDays, runArchive } from '@/lib/autoArchive'
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

  useEffect(() => {
    getArchiveAfterDays().then(setDays)
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

  return (
    <div className="min-h-screen bg-bg-main">
      <header className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold">设置</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <section className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-3">账号</h2>
          <div className="text-sm text-gray-600 mb-3">{user?.email}</div>
          <div className="text-xs text-gray-400">
            {lastSyncAt && `上次同步 ${new Date(lastSyncAt).toLocaleString('zh-CN')}`}
          </div>
        </section>

        <section className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-3">同步</h2>
          <button
            onClick={handleSync}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            立即同步
          </button>
        </section>

        <section className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-1">自动归档</h2>
          <p className="text-xs text-gray-500 mb-3">已处理笔记超过指定天数后自动归档（仍可恢复）</p>
          <div className="space-y-2">
            {OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="archive-days"
                  checked={days === opt.value}
                  onChange={() => handleChange(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {saved && <div className="text-xs text-primary mt-2">已保存</div>}
          <button
            onClick={handleRunArchive}
            className="mt-3 text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
          >
            立即执行一次归档
          </button>
        </section>

        <section className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-3">数据</h2>
          <Link
            to="/trash"
            className="text-sm text-primary hover:underline block mb-2"
          >
            回收站（30 天内可恢复）
          </Link>
        </section>

        <section className="bg-white rounded border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-800 mb-3 text-danger">危险操作</h2>
          <button
            onClick={signOut}
            className="text-sm px-3 py-1.5 border border-danger text-danger rounded hover:bg-danger-bg flex items-center gap-1.5"
          >
            <LogOut size={14} />
            退出登录
          </button>
        </section>

        <div className="text-center text-xs text-gray-400 pt-6">发法牛 v1.2</div>
      </div>
    </div>
  )
}

export default Settings
