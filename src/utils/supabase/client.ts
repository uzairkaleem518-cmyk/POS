import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from './info'

const supabaseUrl = `https://${projectId}.supabase.co`

const createClient = (): SupabaseClient => {
  return createSupabaseClient(supabaseUrl, publicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}
