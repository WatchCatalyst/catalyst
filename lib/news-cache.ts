import { createClient } from "@/lib/supabase/server"

export type CachedNewsResponse = {
  articles: any[]
  cached_at: string
  expires_at: string
}

// Cache TTL: 1 minute
const CACHE_TTL_MS = 60 * 1000

export async function getCachedNews(
  category: string,
  page: number,
  timeRange = "all",
): Promise<CachedNewsResponse | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("news_cache")
      .select("articles, created_at, expires_at")
      .eq("category", category)
      .eq("page", page)
      .eq("time_range", timeRange)
      .maybeSingle()

    if (error || !data) {
      console.log("[v0] Cache miss for category:", category, "page:", page, "timeRange:", timeRange)
      return null
    }

    // Check if cache is still valid
    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (now > expiresAt) {
      console.log("[v0] Cache expired for category:", category, "page:", page, "timeRange:", timeRange)
      return null
    }

    console.log("[v0] Cache hit for category:", category, "page:", page, "timeRange:", timeRange)
    return {
      articles: data.articles as any[],
      cached_at: data.created_at,
      expires_at: data.expires_at,
    }
  } catch (error) {
    console.error("[v0] Error reading from cache:", error)
    return null
  }
}

export async function setCachedNews(
  category: string,
  page: number,
  articles: any[],
  timeRange = "all",
  cacheTTL = 60 * 1000,
): Promise<void> {
  try {
    const supabase = await createClient()

    const now = new Date()
    const expiresAt = new Date(now.getTime() + cacheTTL)

    const cacheKey = `${category}-${page}-${timeRange}`

    // Upsert the cache entry
    const { error } = await supabase.from("news_cache").upsert(
      {
        cache_key: cacheKey,
        category,
        page,
        time_range: timeRange, // Add time_range column
        articles,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: "cache_key",
      },
    )

    if (error) {
      console.error("[v0] Error writing to cache:", error)
    } else {
      console.log(
        "[v0] Cached",
        articles.length,
        "articles for category:",
        category,
        "page:",
        page,
        "timeRange:",
        timeRange,
        "TTL:",
        cacheTTL / 1000,
        "seconds",
      )
    }
  } catch (error) {
    console.error("[v0] Error setting cache:", error)
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()

    const { error } = await supabase.from("news_cache").delete().lt("expires_at", now)

    if (error) {
      console.error("[v0] Error clearing expired cache:", error)
    } else {
      console.log("[v0] Cleared expired cache entries")
    }
  } catch (error) {
    console.error("[v0] Error in clearExpiredCache:", error)
  }
}
