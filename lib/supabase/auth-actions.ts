"use server"

import { createClient } from "./server"
import { headers } from "next/headers"

/**
 * Sign in with Google OAuth
 * Returns the URL to redirect to for Google sign-in
 */
export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || "http://localhost:3000"
  
  // Handle both localhost and production
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Supabase redirects to Google, then Google redirects back to Supabase's callback
      // Then Supabase redirects to our app's callback route
      redirectTo: `${baseUrl}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error) {
    console.error("Sign in error:", error)
    return { error: error.message, url: null }
  }

  return { error: null, url: data.url }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error("Sign out error:", error)
    return { error: error.message }
  }
  
  return { error: null }
}

/**
 * Get the current user (server-side)
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}
