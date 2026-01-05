"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

/**
 * Hook to access the current user state
 * Returns { user, loading, error, refresh }
 * 
 * User is null if not signed in (optional auth - site works without sign-in)
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        // Don't treat "no user" as an error - it's expected for optional auth
        if (error.message !== "Auth session missing!") {
          setError(error.message)
        }
        setUser(null)
      } else {
        setUser(user)
        setError(null)
      }
    } catch (err) {
      console.error("Failed to get user:", err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    refresh()

    // Listen for auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user)
          setError(null)
        } else if (event === "SIGNED_OUT") {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [refresh])

  return { user, loading, error, refresh }
}
