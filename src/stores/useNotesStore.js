/**
 * 笔记列表 store
 * - 缓存当前过滤后的 notes
 * - 监听 data-updated 自动刷新
 */
import { create } from 'zustand'
import { notesRepo } from '@/repositories/notesRepo'

export const useNotesStore = create((set, get) => ({
  notes: [],
  loaded: false,
  activeTagId: null, // null = 全部
  statusFilter: 'all', // all | pending | completed
  searchQuery: '',

  load: async () => {
    const { activeTagId } = get()
    let notes
    if (activeTagId) {
      notes = await notesRepo.getByTag(activeTagId)
    } else {
      notes = await notesRepo.getAll()
    }
    set({ notes, loaded: true })
  },

  setActiveTagId: (id) => {
    set({ activeTagId: id, loaded: false })
    get().load()
  },

  setStatusFilter: (s) => set({ statusFilter: s }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  resetFilters: () => {
    set({ activeTagId: null, statusFilter: 'all', searchQuery: '' })
    get().load()
  },
}))
