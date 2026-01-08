import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, addRateLimitHeaders, rateLimitResponse, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"
import { validateSearchQuery, validateCategory, validationError } from "@/lib/input-validation"

const ALLOWED_CATEGORIES = ["all", "crypto", "stocks", "forex", "commodities", "economy"]

export async function GET(request: NextRequest) {
  // Rate limiting (stricter for search)
  const rateLimit = checkRateLimit(request, RATE_LIMIT_CONFIG.search)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  const { searchParams } = new URL(request.url)
  const queryParam = searchParams.get("q")
  const categoryParam = searchParams.get("category") || "all"

  // Validate input
  const query = validateSearchQuery(queryParam)
  if (!query) {
    return NextResponse.json(validationError("Invalid search query"), { status: 400 })
  }

  const category = validateCategory(categoryParam, ALLOWED_CATEGORIES)
  if (!category) {
    return NextResponse.json(validationError("Invalid category"), { status: 400 })
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

    const response = NextResponse.json({
      success: true,
      data: searchResults,
      query,
      count: searchResults.length,
    })
    addRateLimitHeaders(response, rateLimit)
    return response
  } catch (error) {
    console.error("[v0] Error searching news:", error)
    return NextResponse.json({ success: false, error: "Failed to search news" }, { status: 500 })
  }
}
