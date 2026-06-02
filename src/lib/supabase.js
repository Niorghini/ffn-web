/**
 * Supabase client 单例
 * - URL + anon key 从 .env.local 读
 * - 单例导出
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 不抛错，方便 UI 阶段先看到登录页
  console.warn('Supabase env not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export const isSupabaseConfigured = () => Boolean(url && anonKey)
