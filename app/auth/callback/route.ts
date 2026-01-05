import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * OAuth callback handler for Google Sign-In
 * This route receives the auth code from Google and exchanges it for a session
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const errorParam = searchParams.get("error")
  const next = searchParams.get("next") ?? "/"

  // If Google returned an error, log it and redirect
  if (errorParam) {
    console.error("OAuth error from Google:", errorParam)
    return NextResponse.redirect(`${origin}/?auth_error=${errorParam}`)
  }

  if (code) {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables")
      return NextResponse.redirect(`${origin}/?auth_error=missing_env_vars`)
    }
    
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Supabase exchangeCodeForSession error:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`)
    }
    
    if (data?.session) {
      // Successful sign-in! Redirect to home
      // Use the origin from the request URL (works for both localhost and production)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code provided - redirect to home with error
  console.error("No auth code provided in callback")
  return NextResponse.redirect(`${origin}/?auth_error=no_code`)
}
