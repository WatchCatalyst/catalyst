import { NextResponse } from "next/server"
import type { NewsItem } from "@/app/page"
import { deduplicateArticles } from "@/lib/article-deduplication"
import { getSourceQuality } from "@/lib/source-quality"
import { fetchTheNewsAPIArticles, type TheNewsAPIArticle } from "@/lib/thenewsapi-client"
import { getCachedNews, setCachedNews, clearExpiredCache } from "@/lib/news-cache"
import { classifyArticleForMarkets, type MarketClassification } from "@/lib/market-relevance-classifier"

type NewsItemWithClassification = NewsItem & {
  classification?: MarketClassification
}

function getESTTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") || "all"
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const timeRange = searchParams.get("timeRange") || "all"

  try {
    const cacheTTL = timeRange === "today" ? 5 * 60 * 1000 : 60 * 1000
    const cachedResponse = await getCachedNews(category, page, timeRange)

    if (cachedResponse) {
      console.log("[v0] Serving cached news for category:", category, "Page:", page, "TimeRange:", timeRange)
      return NextResponse.json({
        success: true,
        data: cachedResponse.articles,
        timestamp: cachedResponse.cached_at,
        cached: true,
        expires_at: cachedResponse.expires_at,
        timeRange,
      })
    }

    console.log(
      "[v0] Fetching LIVE real-time news from TheNewsAPI for category:",
      category,
      "Page:",
      page,
      "TimeRange:",
      timeRange,
      "in EST",
    )
    const newsItems = await fetchLiveNews(category, page, timeRange)
    console.log("[v0] Successfully fetched", newsItems.length, "live news items for timeRange:", timeRange)

    await setCachedNews(category, page, newsItems, timeRange, cacheTTL)

    clearExpiredCache().catch((err) => console.error("[v0] Failed to clear expired cache:", err))

    return NextResponse.json({
      success: true,
      data: newsItems,
      timestamp: getESTTime().toISOString(),
      cached: false,
      timeRange,
    })
  } catch (error) {
    console.error("[v0] Error fetching news:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch news",
      data: [],
    })
  }
}

function analyzeNewsSentiment(
  title: string,
  description: string,
): {
  sentiment: "bullish" | "neutral" | "bearish"
  relevanceScore: number
  tradingSignal: string
} {
  const text = `${title} ${description}`.toLowerCase()

  const bullishKeywords = [
    "surge",
    "rally",
    "gain",
    "up",
    "rise",
    "high",
    "bullish",
    "buy",
    "growth",
    "record",
    "soar",
    "boom",
    "profit",
    "win",
    "success",
    "breakthrough",
    "positive",
  ]

  const bearishKeywords = [
    "crash",
    "fall",
    "drop",
    "down",
    "plunge",
    "loss",
    "bearish",
    "sell",
    "decline",
    "sink",
    "tumble",
    "weak",
    "risk",
    "threat",
    "concern",
    "crisis",
    "failure",
  ]

  let bullishScore = 0
  let bearishScore = 0

  bullishKeywords.forEach((keyword) => {
    if (text.includes(keyword)) bullishScore++
  })

  bearishKeywords.forEach((keyword) => {
    if (text.includes(keyword)) bearishScore++
  })

  const sentiment = bearishScore > bullishScore ? "bearish" : bullishScore > bearishScore ? "bullish" : "neutral"

  const keywordDensity = bullishScore + bearishScore
  const titleLength = title.split(" ").length
  const descLength = description.split(" ").length
  const totalLength = titleLength + descLength

  // Start with a more varied base (30-50)
  let baseScore = 30 + Math.floor(Math.random() * 20)

  // Keyword impact (0-25 points, more impactful)
  baseScore += Math.min(keywordDensity * 5, 25)

  // Title quality (0-15 points)
  if (titleLength >= 8 && titleLength <= 15) {
    baseScore += 15
  } else if (titleLength >= 6 && titleLength <= 20) {
    baseScore += 8
  }

  // Description quality (0-15 points)
  if (descLength > 100) {
    baseScore += 15
  } else if (descLength > 50) {
    baseScore += 10
  } else if (descLength > 20) {
    baseScore += 5
  }

  // Content depth bonus (0-10 points)
  if (totalLength > 150) {
    baseScore += 10
  } else if (totalLength > 80) {
    baseScore += 5
  }

  // Sentiment clarity bonus (0-10 points)
  const sentimentStrength = Math.abs(bullishScore - bearishScore)
  if (sentimentStrength >= 3) {
    baseScore += 10
  } else if (sentimentStrength >= 2) {
    baseScore += 5
  }

  // Large random variance for diversity (0-25 points)
  const randomVariance = Math.floor(Math.random() * 25)
  baseScore += randomVariance

  // Ensure score is between 35 and 95
  const relevanceScore = Math.max(35, Math.min(baseScore, 95))

  const signals: Record<string, string> = {
    bullish: "Buy Signal",
    bearish: "Sell Signal",
    neutral: "Hold/Watch",
  }

  return {
    sentiment,
    relevanceScore,
    tradingSignal: signals[sentiment],
  }
}

async function fetchLiveNews(category: string, page = 1, timeRange = "all"): Promise<NewsItemWithClassification[]> {
  const THENEWSAPI_KEY = process.env.THENEWSAPI_KEY

  if (!THENEWSAPI_KEY) {
    console.log("[v0] THENEWSAPI_KEY not configured. Please add it to environment variables.")
    return []
  }

  console.log("[v0] Using TheNewsAPI for real-time news")
  return await fetchFromTheNewsAPI(category, THENEWSAPI_KEY, page, timeRange)
}

async function fetchFromTheNewsAPI(
  category: string,
  apiKey: string,
  page: number,
  timeRange = "all",
): Promise<NewsItemWithClassification[]> {
  const articles = await fetchTheNewsAPIArticles(category, apiKey, page, timeRange)

  const newsItems: NewsItemWithClassification[] = articles.map((article: TheNewsAPIArticle, index: number) => {
    const analysis = analyzeNewsSentiment(article.title || "", article.description || "")

    let keywords: string[] = []
    if (Array.isArray(article.keywords)) {
      keywords = article.keywords
    } else if (typeof article.keywords === "string") {
      // Handle case where keywords might be a comma-separated string
      keywords = (article.keywords as string).split(",").map((k) => k.trim())
    }

    const detectedCategory = mapTheNewsAPICategory(article.categories || [], category)
    const actualTimestamp = article.published_at ? new Date(article.published_at) : new Date()
    const minutesOld = Math.round((Date.now() - actualTimestamp.getTime()) / (1000 * 60))

    console.log(`[v0] Article "${article.title?.substring(0, 50)}..." is ${minutesOld} minutes old`)

    const sourceQuality = getSourceQuality(article.source || "Unknown")

    const classification = classifyArticleForMarkets({
      title: article.title || "",
      summary: article.description || "",
      keywords: keywords,
    })

    console.log(
      `[v0] Market classification for "${article.title?.substring(0, 30)}...": score=${classification.score}, topics=${classification.topics.join(", ")}`,
    )

    return {
      id: article.uuid || `thenewsapi-${Date.now()}-${index}`,
      title: article.title || "Untitled",
      summary: article.description || "No description available",
      category: detectedCategory,
      sentiment: analysis.sentiment,
      relevanceScore: classification.score, // Use classification score instead of sentiment-based score
      tradingSignal: analysis.tradingSignal,
      source: article.source || "TheNewsAPI Source",
      timestamp: actualTimestamp.toISOString(),
      url: article.url || "#",
      sourceQuality: sourceQuality.score,
      sourceTier: sourceQuality.tier,
      keywords: keywords.filter((k: string) => k && k.length > 3),
      classification, // Attach full classification to article
    }
  })

  const dedupedArticles = deduplicateArticles(newsItems)
  console.log("[v0] TheNewsAPI: Deduplication removed", newsItems.length - dedupedArticles.length, "duplicates")

  const relevantArticles = dedupedArticles.filter((article: NewsItemWithClassification) => {
    if (!article.classification) return true
    return article.classification.isRelevant
  })

  console.log(
    "[v0] Market relevance filter removed",
    dedupedArticles.length - relevantArticles.length,
    "irrelevant articles",
  )

  const limitedArticles = limitSportsArticles(relevantArticles)
  console.log("[v0] Final article count:", limitedArticles.length, "market-relevant articles")

  return limitedArticles
}

function limitSportsArticles(articles: NewsItemWithClassification[]): NewsItemWithClassification[] {
  const sportsArticles: NewsItemWithClassification[] = []
  const nonSportsArticles: NewsItemWithClassification[] = []

  // Separate sports from non-sports articles
  articles.forEach((article) => {
    if (article.category === "sports") {
      sportsArticles.push(article)
    } else {
      nonSportsArticles.push(article)
    }
  })

  // If no sports articles, return as is
  if (sportsArticles.length === 0) {
    return articles
  }

  // Sort sports articles by relevance score (highest first) and recency
  const sortedSportsArticles = sportsArticles.sort((a, b) => {
    const scoreA = a.relevanceScore || 0
    const scoreB = b.relevanceScore || 0

    // First by relevance score
    if (scoreB !== scoreA) {
      return scoreB - scoreA
    }

    // Then by timestamp (most recent first)
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })

  // Take only 2-5 sports articles (random between 2-5)
  const maxSportsArticles = Math.floor(Math.random() * 4) + 2 // Random between 2-5
  const limitedSportsArticles = sortedSportsArticles.slice(0, maxSportsArticles)

  console.log(`[v0] Limited sports articles from ${sportsArticles.length} to ${limitedSportsArticles.length}`)

  // Combine limited sports with all non-sports articles
  return [...nonSportsArticles, ...limitedSportsArticles]
}

function mapTheNewsAPICategory(theNewsAPICategories: string[], requestedCategory: string): string {
  if (requestedCategory !== "all") {
    return requestedCategory
  }

  const categoryText = theNewsAPICategories.join(" ").toLowerCase()

  if (categoryText.includes("business")) return "stocks"
  if (categoryText.includes("tech")) return "technology"
  if (categoryText.includes("politics")) return "politics"
  if (categoryText.includes("sports")) return "sports"
  if (categoryText.includes("general")) return "war"
  if (categoryText.includes("science")) return "animals"

  return "technology"
}
