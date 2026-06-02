import { Search, X } from 'lucide-react'

const SearchBar = ({ value, onChange, placeholder = '搜索笔记...' }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-main rounded border border-gray-200">
    <Search size={14} className="text-gray-400" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 outline-none text-sm bg-transparent"
    />
    {value && (
      <button onClick={() => onChange('')} className="text-gray-400 hover:text-gray-600">
        <X size={14} />
      </button>
    )}
  </div>
)

export default SearchBar
