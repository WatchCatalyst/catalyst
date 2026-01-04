/**
 * Clean US Market News Feed
 * Uses EODHD + FMP APIs with Supabase caching
 */

import type { NewsItem } from "@/app/page"
import { fetchEODHDNews } from "@/lib/eodhd-client"
import { getCachedNews, setCachedNews, deleteCacheEntry } from "@/lib/news-cache"

// Simple hash function to generate deterministic IDs from strings
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to positive hex string
  return 'art-' + Math.abs(hash).toString(16)
}

// Blacklist of article IDs to exclude (articles that are stuck or problematic)
const BLACKLISTED_ARTICLE_IDS = new Set([
  'art-19abdbd7', // Bitcoin (BTC) Price Prediction 2026 - stuck article
])

// FMP News fetcher as backup
async function fetchFMPNews(apiKey: string, limit: number = 50): Promise<any[]> {
  try {
    // FMP stock news endpoint - usually more up-to-date
    const url = `https://financialmodelingprep.com/api/v3/stock_news?limit=${limit}&apikey=${apiKey}`
    console.log(`[FMP News] Fetching from: ${url.replace(apiKey, '***')}`)
    
    const response = await fetch(url, { cache: 'no-store' })
    
    if (!response.ok) {
      console.error(`[FMP News] Error ${response.status}`)
      return []
    }
    
    const data = await response.json()
    console.log(`[FMP News] Got ${Array.isArray(data) ? data.length : 0} articles`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("[FMP News] Failed:", error)
    return []
  }
}

export async function getUSMarketNewsFeed(limit: number = 25, offset: number = 0, bustCache: boolean = false): Promise<NewsItem[]> {
  const EODHD_KEY = process.env.EODHD_API_KEY
  const FMP_KEY = process.env.FMP_API_KEY

  console.log("[US Feed] Starting feed fetch...", { 
    hasEODHDKey: !!EODHD_KEY,
    hasFMPKey: !!FMP_KEY,
    limit,
    offset,
    bustCache
  })

  if (!EODHD_KEY && !FMP_KEY) {
    console.warn("[US Feed] No news API keys configured")
    return []
  }

  // Calculate page number from offset for cache key
  const page = Math.floor(offset / limit)
  const cacheCategory = "all"
  const cacheTimeRange = "7d"

  try {
    // Check Supabase cache first (unless cache busting)
    if (!bustCache) {
      const cached = await getCachedNews(cacheCategory, page, cacheTimeRange)
      
      if (cached && cached.articles.length > 0) {
        // Re-filter cached articles by date to remove stale ones
        const currentTime = new Date()
        const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000)
        const freshCachedArticles = cached.articles.filter((article: NewsItem) => {
          try {
            const articleDate = new Date(article.timestamp)
            return articleDate >= sevenDaysAgo
          } catch (e) {
            return false // Exclude articles with invalid dates
          }
        })
        
        // Also filter blacklisted articles from cache
        const filteredCached = freshCachedArticles.filter(article => !BLACKLISTED_ARTICLE_IDS.has(article.id))
        
        if (filteredCached.length > 0) {
          console.log(`[US Feed] ✅ Cache hit! Returning ${filteredCached.length} fresh cached articles (filtered from ${cached.articles.length}, blacklist removed ${freshCachedArticles.length - filteredCached.length})`)
          return filteredCached as NewsItem[]
        } else {
          console.log(`[US Feed] ⚠️ Cache hit but all articles are stale or blacklisted - deleting cache and fetching fresh data`)
          // Delete the stale cache entry so it gets refreshed
          await deleteCacheEntry(cacheCategory, page, cacheTimeRange)
        }
      }
    } else {
      console.log("[US Feed] 🔄 Cache bust requested - skipping cache")
    }
    
    console.log("[US Feed] Fetching fresh data...")

    let eodhdArticles: any[] = []
    
    // Only fetch from EODHD if key is available
    if (EODHD_KEY) {
      try {
        // Fetch general news (no symbol filter, no date filter - let EODHD return latest)
        eodhdArticles = await fetchEODHDNews(
          EODHD_KEY,
          undefined, // No symbols - general financial news
          limit,
          undefined, // No from date
          undefined, // No to date
          offset
        )
        console.log(`[US Feed] EODHD returned ${eodhdArticles.length} raw articles`)
      } catch (eodhError) {
        console.error("[US Feed] EODHD fetch failed:", eodhError)
        // Continue to FMP even if EODHD fails
      }
    } else {
      console.log("[US Feed] EODHD key not configured, skipping")
    }
    
    // Also fetch from FMP as backup/supplement for fresher news
    let fmpArticles: any[] = []
    if (FMP_KEY) {
      try {
        fmpArticles = await fetchFMPNews(FMP_KEY, limit)
        console.log(`[US Feed] FMP returned ${fmpArticles.length} articles`)
      } catch (fmpError) {
        console.error("[US Feed] FMP fetch failed:", fmpError)
      }
    } else {
      console.log("[US Feed] FMP key not configured, skipping")
    }
    
    // Combine both sources
    const combinedRaw = [...eodhdArticles, ...fmpArticles]
    console.log(`[US Feed] Combined total: ${combinedRaw.length} raw articles`)
    
    if (combinedRaw.length === 0) {
      console.warn(`[US Feed] No articles from any source`)
      return []
    }
    
    // Map all articles to NewsItem format (handles both EODHD and FMP formats)
    console.log(`[US Feed] Mapping ${combinedRaw.length} articles...`)
    const articles: NewsItem[] = combinedRaw.map((article: any) => {
      // Handle both EODHD and FMP date formats
      // Don't default to current time - if no date, use a very old date so it gets filtered out
      const rawDate = article.date || article.publishedDate || article.published_at || article.time
      const date = rawDate || new Date(0).toISOString() // Use epoch if no date (will be filtered out)
      const title = article.title || article.headline || "Untitled"
      // FMP uses 'text', EODHD uses 'content'
      const content = article.content || article.text || article.description || article.summary || title
      // FMP uses 'url', EODHD uses 'link'
      const link = article.url || article.link || article.source_url || "#"
      const symbols = article.symbols || []
      const symbol = Array.isArray(symbols) && symbols.length > 0 ? symbols[0] : (article.symbol || article.ticker)
      const tags = article.tags || article.tag || article.categories || ""
      // FMP provides 'site' as source name
      const sourceName = article.site || article.source || extractSource(link) || "News"
      
      // Map sentiment if available
      const rawSentiment = article.sentiment
      let sentiment: "bullish" | "bearish" | "neutral" = "neutral"
      if (rawSentiment) {
        const sentLower = String(rawSentiment).toLowerCase()
        if (sentLower.includes('bull') || sentLower.includes('positive')) sentiment = "bullish"
        else if (sentLower.includes('bear') || sentLower.includes('negative')) sentiment = "bearish"
      }
      
      // Generate DETERMINISTIC ID based on URL or title+date (NOT random!)
      // This ensures same article = same ID across refreshes
      const idSource = link !== "#" ? link : `${title}-${date}`
      const stableId = hashString(idSource)
      
      return {
        id: stableId,
        title: title,
        summary: content,
        category: mapCategory(tags || symbol),
        sentiment: sentiment,
        relevanceScore: symbol ? 85 : 70,
        source: sourceName,
        timestamp: date,
        url: link,
        keywords: extractKeywords(tags),
      }
    })
    
    console.log(`[US Feed] Mapped ${articles.length} articles from EODHD`)
    
    // Cleanup and dedupe
    let cleanedArticles = dedupeArticles(articles)
    cleanedArticles = sortByPublishedTime(cleanedArticles)
    
    // Filter out blacklisted articles
    const nonBlacklisted = cleanedArticles.filter(article => {
      if (BLACKLISTED_ARTICLE_IDS.has(article.id)) {
        console.log(`[US Feed] 🚫 Excluding blacklisted article: ${article.id} - "${article.title}"`)
        return false
      }
      return true
    })
    
    // Filter to last 7 days
    const currentTime = new Date()
    const sevenDaysAgo = new Date(currentTime.getTime() - 7 * 24 * 60 * 60 * 1000)
    const filteredArticles = nonBlacklisted.filter(article => {
      try {
        const articleDate = new Date(article.timestamp)
        // Exclude invalid dates (epoch or NaN)
        if (isNaN(articleDate.getTime()) || articleDate.getTime() === 0) {
          console.log(`[US Feed] Excluding article with invalid date: ${article.title}`)
          return false
        }
        const isRecent = articleDate >= sevenDaysAgo
        if (!isRecent) {
          console.log(`[US Feed] Excluding stale article: ${article.title} (${articleDate.toISOString()})`)
        } else {
          // Log article details for debugging
          const ageMs = currentTime.getTime() - articleDate.getTime()
          const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
          if (ageHours < 1) {
            console.log(`[US Feed] ⚠️ Article "${article.title}" (${article.id}) has timestamp ${articleDate.toISOString()} - showing as "Just now" but may be old`)
          }
        }
        return isRecent
      } catch (e) {
        console.log(`[US Feed] Excluding article with date parse error: ${article.title}`, e)
        return false // Exclude if date parsing fails
      }
    })
    
    console.log(`[US Feed] Final article count: ${filteredArticles.length} (after 7d filter)`)
    
    // Store in Supabase cache (30-second TTL for real-time updates)
    if (filteredArticles.length > 0) {
      await setCachedNews(cacheCategory, page, filteredArticles, cacheTimeRange, 30 * 1000)
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
