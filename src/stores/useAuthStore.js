/**
 * 认证 store
 * - user / session
 * - 监听 supabase.auth.onAuthStateChange 自动刷新
 */
import { create } from 'zustand'
import {
  signIn as svcSignIn,
  signUp as svcSignUp,
  signOut as svcSignOut,
  getCurrentSession,
  onAuthStateChange,
} from '@/lib/auth'

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  initialized: false,
  error: null,
  loading: false,

  init: async () => {
    if (get().initialized) return
    const session = await getCurrentSession()
    set({ user: session?.user ?? null, session, initialized: true })
    onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { session } = await svcSignIn(email, password)
      set({ session, user: session?.user, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
      throw e
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { session } = await svcSignUp(email, password)
      set({ session, user: session?.user, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
      throw e
    }
  },

  signOut: async () => {
    await svcSignOut()
    set({ user: null, session: null })
  },

  clearError: () => set({ error: null }),
}))
