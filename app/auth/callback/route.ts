import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * OAuth callback handler for Google Sign-In
 * This route receives the auth code from Google and exchanges it for a session
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Optional: if user came from a specific page, redirect back there
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful sign-in! Redirect to home (or wherever they came from)
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      
      if (isLocalEnv) {
        // Local dev: use origin
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // Production with proxy
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Auth code error - redirect to home with error param
  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`)
}
