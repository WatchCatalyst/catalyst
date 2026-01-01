/**
 * Clean US Market News Feed
 * Uses EODHD API with Supabase caching (1-minute TTL)
 */

import type { NewsItem } from "@/app/page"
import { fetchEODHDNews } from "@/lib/eodhd-client"
import { getCachedNews, setCachedNews } from "@/lib/news-cache"

export async function getUSMarketNewsFeed(limit: number = 25, offset: number = 0): Promise<NewsItem[]> {
  const EODHD_KEY = process.env.EODHD_API_KEY

  console.log("[US Feed] Starting feed fetch...", { 
    hasEODHDKey: !!EODHD_KEY,
    limit,
    offset
  })

  if (!EODHD_KEY) {
    console.warn("[US Feed] EODHD API key not configured")
    return []
  }

  // Calculate page number from offset for cache key
  const page = Math.floor(offset / limit)
  const cacheCategory = "all"
  const cacheTimeRange = "7d"

  try {
    // Check Supabase cache first
    const cached = await getCachedNews(cacheCategory, page, cacheTimeRange)
    
    if (cached && cached.articles.length > 0) {
      console.log(`[US Feed] ✅ Cache hit! Returning ${cached.articles.length} cached articles`)
      return cached.articles as NewsItem[]
    }
    
    console.log("[US Feed] Cache miss - fetching fresh data from EODHD...")

    // Fetch news from EODHD with pagination support
    const eodhdArticles = await fetchEODHDNews(
      EODHD_KEY,
      undefined, // No symbol filter - get all financial news
      limit,
      undefined, // No from date - get latest news
      undefined, // No to date
      offset
    )
    
    console.log(`[US Feed] EODHD returned ${eodhdArticles.length} raw articles`)
    
    if (eodhdArticles.length === 0) {
      console.warn(`[US Feed] EODHD returned 0 articles`)
      return []
    }
    
    // Map EODHD articles to NewsItem format
    console.log(`[US Feed] Mapping ${eodhdArticles.length} articles...`)
    const articles: NewsItem[] = eodhdArticles.map((article: any) => {
      const date = article.date || article.published_at || article.publishedDate || article.time || new Date().toISOString()
      const title = article.title || article.headline || "Untitled"
      const content = article.content || article.text || article.description || article.summary || title
      const link = article.link || article.url || article.source_url || "#"
      const symbols = article.symbols || []
      const symbol = Array.isArray(symbols) && symbols.length > 0 ? symbols[0] : (article.symbol || article.ticker)
      const tags = article.tags || article.tag || article.categories || ""
      
      // Map EODHD sentiment if available
      const eodhdSentiment = article.sentiment
      let sentiment: "bullish" | "bearish" | "neutral" = "neutral"
      if (eodhdSentiment) {
        const sentLower = String(eodhdSentiment).toLowerCase()
        if (sentLower.includes('bull') || sentLower.includes('positive')) sentiment = "bullish"
        else if (sentLower.includes('bear') || sentLower.includes('negative')) sentiment = "bearish"
      }
      
      return {
        id: `eodhd-${date}-${Math.random()}`,
        title: title,
        summary: content,
        category: mapCategory(tags),
        sentiment: sentiment,
        relevanceScore: symbol ? 85 : 70,
        source: extractSource(link) || "EODHD",
        timestamp: date,
        url: link,
        keywords: extractKeywords(tags),
      }
    })
    
    console.log(`[US Feed] Mapped ${articles.length} articles from EODHD`)
    
    // Cleanup and dedupe
    let cleanedArticles = dedupeArticles(articles)
    cleanedArticles = sortByPublishedTime(cleanedArticles)
    
    // Filter to last 7 days
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const filteredArticles = cleanedArticles.filter(article => {
      try {
        const articleDate = new Date(article.timestamp)
        return articleDate >= sevenDaysAgo
      } catch (e) {
        return true // Include if date parsing fails
      }
    })
    
    console.log(`[US Feed] Final article count: ${filteredArticles.length} (after 7d filter)`)
    
    // Store in Supabase cache (1-minute TTL)
    if (filteredArticles.length > 0) {
      await setCachedNews(cacheCategory, page, filteredArticles, cacheTimeRange, 60 * 1000)
    }
    
    return filteredArticles
  } catch (error) {
    console.error("[US Feed] EODHD fetch failed:", error)
    
    // Try to return cached data even if expired (better than nothing)
    const staleCache = await getCachedNews(cacheCategory, page, cacheTimeRange)
    if (staleCache && staleCache.articles.length > 0) {
      console.log("[US Feed] Returning stale cache due to error")
      return staleCache.articles as NewsItem[]
    }
    
    return []
  }
}

// Helper functions
function mapCategory(tags: any): "all" | "crypto" | "stocks" | "war" | "technology" | "politics" {
  let tagsStr = ""
  if (Array.isArray(tags)) {
    tagsStr = tags.join(" ").toLowerCase()
  } else if (typeof tags === "string") {
    tagsStr = tags.toLowerCase()
  } else if (tags) {
    tagsStr = String(tags).toLowerCase()
  }
  
  if (tagsStr.includes("crypto") || tagsStr.includes("bitcoin") || tagsStr.includes("ethereum")) return "crypto"
  if (tagsStr.includes("tech") || tagsStr.includes("technology")) return "technology"
  if (tagsStr.includes("stock") || tagsStr.includes("equity") || tagsStr.includes("market")) return "stocks"
  if (tagsStr.includes("war") || tagsStr.includes("conflict")) return "war"
  if (tagsStr.includes("politics") || tagsStr.includes("political")) return "politics"
  return "all"
}

function extractSource(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain.split('.')[0] || "Unknown"
  } catch {
    return "Unknown"
  }
}

function extractKeywords(tags: any): string[] {
  if (!tags) return []
  
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(t => t.length > 2)
  }
  
  if (typeof tags === "string") {
    return tags.split(',').map(t => t.trim()).filter(t => t.length > 2)
  }
  
  return String(tags).split(',').map(t => t.trim()).filter(t => t.length > 2)
}

function dedupeArticles(articles: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const deduped: NewsItem[] = []

  for (const article of articles) {
    let key: string
    
    if (article.url && article.url !== "#") {
      key = article.url
    } else {
      key = article.title.toLowerCase().trim().replace(/[^\w\s]/g, "")
    }

    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(article)
    }
  }

  return deduped
}

function sortByPublishedTime(articles: NewsItem[]): NewsItem[] {
  return [...articles].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA // Newest first
  })
}
