import { NextResponse } from "next/server"
import type { NewsItem } from "@/app/page"
import { getUSMarketNewsFeed } from "@/lib/news-feed-us"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "25", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    
    console.log(`[US Feed API] Starting fetch... limit=${limit}, offset=${offset}`)
    const newsItems = await getUSMarketNewsFeed(limit, offset)
    
    console.log(`[US Feed API] Returning ${newsItems.length} articles`)

    return NextResponse.json({
      success: true,
      data: newsItems,
      timestamp: new Date().toISOString(),
      cached: false,
      count: newsItems.length,
      hasMore: newsItems.length === limit, // If we got exactly the limit, there might be more
    })
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
