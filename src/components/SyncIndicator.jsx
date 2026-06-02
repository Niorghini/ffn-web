/**
 * SyncIndicator —— 顶部同步状态点 + 文案
 * - 离线：灰
 * - 同步中：黄 spinner
 * - 失败：红
 * - 有 pending：橙
 * - 已同步：绿
 */
import { RefreshCw, AlertCircle, CheckCircle2, WifiOff, Clock } from 'lucide-react'
import { useSyncStore } from '@/stores/useSyncStore'

const SyncIndicator = () => {
  const { status, pending, online, lastSyncAt } = useSyncStore()

  let Icon
  let text
  let colorClass

  if (!online) {
    Icon = WifiOff
    text = '离线'
    colorClass = 'text-gray-400'
  } else if (status === 'syncing') {
    Icon = RefreshCw
    text = '同步中'
    colorClass = 'text-yellow-600 animate-spin'
  } else if (status === 'error') {
    Icon = AlertCircle
    text = '同步失败'
    colorClass = 'text-danger'
  } else if (pending > 0) {
    Icon = Clock
    text = `${pending} 条待同步`
    colorClass = 'text-warning'
  } else {
    Icon = CheckCircle2
    text = '已同步'
    colorClass = 'text-primary'
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon size={14} className={colorClass} />
      <span className={colorClass}>{text}</span>
      {lastSyncAt && online && status !== 'syncing' && (
        <span className="text-gray-400">
          · {new Date(lastSyncAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

export default SyncIndicator
