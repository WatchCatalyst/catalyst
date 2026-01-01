import { createClient } from "@supabase/supabase-js"

/**
 * Create a Supabase client with Service Role key
 * This bypasses RLS and should ONLY be used for server-side operations
 * like caching news data.
 * 
 * NEVER expose this client to the browser!
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("[Supabase Service] Missing SUPABASE_SERVICE_ROLE_KEY or URL - cache writes will fail")
    return null
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
