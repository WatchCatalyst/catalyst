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
  
  // Get the origin from headers or use environment variable for production
  let origin = headersList.get("origin") || headersList.get("x-forwarded-host")
  
  // If no origin in headers, try to construct from host
  if (!origin) {
    const host = headersList.get("host")
    if (host) {
      origin = host.includes("localhost") ? `http://${host}` : `https://${host}`
    } else {
      origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }
  }
  
  // Ensure origin has protocol
  if (!origin.startsWith("http")) {
    origin = origin.includes("localhost") ? `http://${origin}` : `https://${origin}`
  }
  
  const redirectTo = `${origin}/auth/callback`
  
  console.log("OAuth redirectTo:", redirectTo) // Debug log
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
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
