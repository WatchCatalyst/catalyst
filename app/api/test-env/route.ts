import { NextResponse } from "next/server"

/**
 * Test endpoint to verify environment variables are accessible
 * DELETE THIS AFTER TESTING - it exposes sensitive info!
 */
export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || "missing"
  
  return NextResponse.json({
    hasUrl,
    hasAnonKey,
    urlValue,
    anonKeyPrefix: `${anonKeyPrefix}...`,
    message: hasUrl && hasAnonKey ? "Environment variables are set" : "Missing environment variables"
  })
}
