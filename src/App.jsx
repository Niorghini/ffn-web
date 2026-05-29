import React from 'react'
import { MemosProvider, useMemos } from './hooks/useMemos'
import Editor from './components/Editor'
import MemoList from './components/MemoList'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import MigrationBanner from './components/MigrationBanner'
import { Loader2 } from 'lucide-react'
import logoUrl from '/logo.png'

function AppContent() {
  const { isLoading, isMigrating } = useMemos()

  if (isLoading || isMigrating) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#0077B6] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {isMigrating ? '正在迁移数据...' : '加载中...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-main">
      <MigrationBanner />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 头部 */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <img
                src={logoUrl}
                alt="ffn"
                className="h-12"
              />
              <p className="text-sm text-gray-400">发布的想法都很牛！</p>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：编辑器 + 列表 */}
          <div className="flex-1 space-y-6">
            <Editor />
            <SearchBar />
            <MemoList />
          </div>

          {/* 右侧：侧边栏 */}
          <div className="lg:w-80 space-y-4">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <MemosProvider>
      <AppContent />
    </MemosProvider>
  )
}