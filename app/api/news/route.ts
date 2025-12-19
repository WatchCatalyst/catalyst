import { NextResponse } from "next/server"
import type { NewsItem } from "@/app/page"
import { deduplicateArticles } from "@/lib/article-deduplication"
import { getSourceQuality } from "@/lib/source-quality"
import { fetchTheNewsAPIArticles, type TheNewsAPIArticle } from "@/lib/thenewsapi-client"
import { getCachedNews, setCachedNews, clearExpiredCache } from "@/lib/news-cache"
import { classifyArticle, type ClassificationResult } from "@/lib/market-relevance-classifier"

type NewsItemWithClassification = NewsItem & {
  classification?: ClassificationResult
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

  console.log(`[v0] Processing ${articles.length} articles with LLM classification...`)

  // Process classifications in parallel chunks (8 at a time to avoid rate limits)
  const CHUNK_SIZE = 8
  const classificationResults: ClassificationResult[] = []

  for (let i = 0; i < articles.length; i += CHUNK_SIZE) {
    const chunk = articles.slice(i, i + CHUNK_SIZE)
    const chunkClassifications = await Promise.all(
      chunk.map(async (article: TheNewsAPIArticle) => {
        try {
          return await classifyArticle({
            title: article.title || "",
            description: article.description || "",
            content: article.description || "", // Use description as content snippet
            url: article.url, // Pass URL for cache key
          })
        } catch (error) {
          console.error(`[v0] Classification failed for article "${article.title?.substring(0, 30)}...":`, error)
          // Return a default rejection if classification fails
          return {
            isRelevant: false,
            topics: [],
            score: 0,
            reasons: ["Classification failed"],
            tradingSignal: "Hold/Watch" as const,
          }
        }
      }),
    )
    classificationResults.push(...chunkClassifications)
    
    // Small delay between chunks to be respectful of rate limits
    if (i + CHUNK_SIZE < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  const relevantCount = classificationResults.filter((r) => r.isRelevant).length
  const filteredCount = articles.length - relevantCount
  console.log(
    `[v0] LLM classification complete. Relevant: ${relevantCount}/${articles.length} (filtered out ${filteredCount} local/noise articles)`,
  )

  // Additional filter to exclude Indian news (double-check in case some slipped through)
  const isIndianArticle = (article: TheNewsAPIArticle): boolean => {
    const indianDomains = [".in", "indiatoday", "timesofindia", "hindustantimes", "thehindu", "ndtv"]
    const text = `${article.url || ""} ${article.source || ""} ${article.title || ""}`.toLowerCase()
    return indianDomains.some((domain) => text.includes(domain))
  }

  // Build news items with classifications
  const newsItems: NewsItemWithClassification[] = articles
    .map((article: TheNewsAPIArticle, index: number) => {
      const classification = classificationResults[index]
      
      // Skip non-relevant articles (completely discard them)
      if (!classification.isRelevant) {
        // Double-check: if isRelevant is false, score should be 0 (log if not for debugging)
        if (classification.score > 0) {
          console.warn(
            `[v0] ⚠️ Article marked as irrelevant but has score > 0: "${article.title?.substring(0, 50)}..." (score: ${classification.score})`,
          )
        }
        return null // This article will be filtered out and NOT returned to frontend
      }

      // Skip Indian articles
      if (isIndianArticle(article)) {
        return null
      }

      const analysis = analyzeNewsSentiment(article.title || "", article.description || "")

      let keywords: string[] = []
      if (Array.isArray(article.keywords)) {
        keywords = article.keywords
      } else if (typeof article.keywords === "string") {
        keywords = (article.keywords as string).split(",").map((k) => k.trim())
      }

      const detectedCategory = mapTheNewsAPICategory(article.categories || [], category)
      const actualTimestamp = article.published_at ? new Date(article.published_at) : new Date()

      const sourceQuality = getSourceQuality(article.source || "Unknown")

      console.log(
        `[v0] ✓ Relevant article "${article.title?.substring(0, 40)}...": score=${classification.score}, signal=${classification.tradingSignal}`,
      )

      return {
        id: article.uuid || `thenewsapi-${Date.now()}-${index}`,
        title: article.title || "Untitled",
        summary: article.description || "No description available",
        category: detectedCategory,
        sentiment: analysis.sentiment,
        relevanceScore: classification.score,
        tradingSignal: classification.tradingSignal,
        source: article.source || "TheNewsAPI Source",
        timestamp: actualTimestamp.toISOString(),
        url: article.url || "#",
        sourceQuality: sourceQuality.score,
        sourceTier: sourceQuality.tier,
        keywords: keywords.filter((k: string) => k && k.length > 3),
        topics: classification.topics,
        reasons: classification.reasons,
        classification, // Attach full classification to article
      }
    })
    .filter((item): item is NewsItemWithClassification => item !== null)

  console.log(`[v0] Filtered to ${newsItems.length} relevant articles after LLM classification`)

  const dedupedArticles = deduplicateArticles(newsItems)
  console.log("[v0] Deduplication removed", newsItems.length - dedupedArticles.length, "duplicates")

  const limitedArticles = limitSportsArticles(dedupedArticles)
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
