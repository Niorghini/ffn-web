/**
 * 认证封装
 * - signUp / signIn / signOut
 * - getCurrentUser / getCurrentSession
 * - onAuthStateChange 订阅
 */
import { supabase } from './supabase'

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

export const onAuthStateChange = (handler) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    handler(event, session)
  })
}
