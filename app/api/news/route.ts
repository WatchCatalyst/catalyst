import { NextResponse } from "next/server"
import type { NewsItem } from "@/app/page"
import { getUSMarketNewsFeed } from "@/lib/news-feed-us"

// Disable Next.js caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "25", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const bustCache = searchParams.get("bust") // Cache buster from frontend
    
    console.log(`[US Feed API] Starting fetch... limit=${limit}, offset=${offset}, bust=${bustCache}`)
    const newsItems = await getUSMarketNewsFeed(limit, offset, !!bustCache)
    
    console.log(`[US Feed API] Returning ${newsItems.length} articles`)

    const response = NextResponse.json({
      success: true,
      data: newsItems,
      timestamp: new Date().toISOString(),
      cached: false,
      count: newsItems.length,
      hasMore: newsItems.length === limit,
    })
    
    // Prevent ALL caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error("[US Feed API] Error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: [],
      count: 0,
    }, { status: 500 })
  }
}
