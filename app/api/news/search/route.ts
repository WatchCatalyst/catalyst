import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const category = searchParams.get("category") || "all"

  if (!query) {
    return NextResponse.json({ success: false, error: "Search query is required" }, { status: 400 })
  }

  try {
    // In production, this would search across:
    // - Your news database
    // - External APIs with the search term
    // - Cached RSS feeds
    // - Social media mentions

    console.log("[v0] Searching news for:", query, "in category:", category)

    // Mock search results for demonstration
    const searchResults = [
      {
        id: crypto.randomUUID(),
        title: `Breaking: ${query.toUpperCase()} Shows Strong Market Movement`,
        summary: `Latest developments related to ${query} indicate significant trading opportunities as market participants react to breaking news.`,
        category: category === "all" ? "crypto" : category,
        sentiment: "bullish",
        relevanceScore: 88,
        tradingSignal: "Active - High Relevance",
        source: "Market Intelligence",
        timestamp: new Date(),
        url: "#",
        matchedKeywords: [query.toLowerCase()],
      },
    ]

    return NextResponse.json({
      success: true,
      data: searchResults,
      query,
      count: searchResults.length,
    })
  } catch (error) {
    console.error("[v0] Error searching news:", error)
    return NextResponse.json({ success: false, error: "Failed to search news" }, { status: 500 })
  }
}
