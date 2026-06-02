/**
 * 标签 store
 */
import { create } from 'zustand'
import { tagsRepo } from '@/repositories/tagsRepo'

export const useTagsStore = create((set, get) => ({
  tags: [],
  counts: new Map(),
  loaded: false,

  load: async () => {
    const [tags, counts] = await Promise.all([
      tagsRepo.getAll(),
      tagsRepo.countsByTag(),
    ])
    set({ tags, counts, loaded: true })
  },
}))
