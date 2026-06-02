/**
 * StatusFilter —— 全部 / 未处理 / 已处理
 */
const StatusFilter = ({ value, onChange }) => {
  const tabs = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '未处理' },
    { value: 'completed', label: '已处理' },
  ]
  return (
    <div className="flex bg-bg-main rounded p-0.5 text-xs">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex-1 py-1 rounded ${
            value === t.value
              ? 'bg-white text-primary font-medium shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default StatusFilter
