import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/**
 * Middleware to refresh auth sessions
 * 
 * IMPORTANT: This does NOT block any routes - auth is completely optional.
 * It only refreshes the session cookie if a user is signed in.
 */
export async function middleware(request: NextRequest) {
  // updateSession handles session refresh and returns NextResponse.next() if no auth
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
