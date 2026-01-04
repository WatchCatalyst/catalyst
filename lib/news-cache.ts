import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export type CachedNewsResponse = {
  articles: any[]
  cached_at: string
  expires_at: string
}

// Cache TTL: 30 seconds for more real-time updates
const CACHE_TTL_MS = 30 * 1000

/**
 * Get cached news from Supabase
 * Uses regular client (anon key) for reads - this is fine with RLS disabled
 */
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
      console.log("[Cache] Miss for category:", category, "page:", page, "timeRange:", timeRange)
      return null
    }

    // Check if cache is still valid
    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (now > expiresAt) {
      console.log("[Cache] Expired for category:", category, "page:", page, "timeRange:", timeRange)
      return null
    }

    console.log("[Cache] Hit for category:", category, "page:", page, "timeRange:", timeRange)
    return {
      articles: data.articles as any[],
      cached_at: data.created_at,
      expires_at: data.expires_at,
    }
  } catch (error) {
    console.error("[Cache] Error reading:", error)
    return null
  }
}

/**
 * Store news in Supabase cache
 * Uses service role client to bypass any RLS issues
 */
export async function setCachedNews(
  category: string,
  page: number,
  articles: any[],
  timeRange = "all",
  cacheTTL = CACHE_TTL_MS,
): Promise<void> {
  try {
    // Use service client for writes (bypasses RLS)
    const supabase = createServiceClient()
    
    if (!supabase) {
      console.warn("[Cache] No service client available - skipping cache write")
      return
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + cacheTTL)
    const cacheKey = `${category}-${page}-${timeRange}`

    // Upsert the cache entry
    const { error } = await supabase.from("news_cache").upsert(
      {
        cache_key: cacheKey,
        category,
        page,
        time_range: timeRange,
        articles,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: "cache_key",
      },
    )

    if (error) {
      console.error("[Cache] Error writing:", error)
    } else {
      console.log(
        "[Cache] Stored",
        articles.length,
        "articles | category:",
        category,
        "| page:",
        page,
        "| TTL:",
        cacheTTL / 1000,
        "seconds",
      )
    }
  } catch (error) {
    console.error("[Cache] Error in setCachedNews:", error)
  }
}

/**
 * Delete a specific cache entry
 * Uses service role client for delete operations
 */
export async function deleteCacheEntry(
  category: string,
  page: number,
  timeRange = "all",
): Promise<void> {
  try {
    const supabase = createServiceClient()
    
    if (!supabase) {
      console.warn("[Cache] No service client available - skipping cache delete")
      return
    }

    const cacheKey = `${category}-${page}-${timeRange}`

    const { error } = await supabase
      .from("news_cache")
      .delete()
      .eq("cache_key", cacheKey)

    if (error) {
      console.error("[Cache] Error deleting cache entry:", error)
    } else {
      console.log("[Cache] Deleted stale cache entry:", cacheKey)
    }
  } catch (error) {
    console.error("[Cache] Error in deleteCacheEntry:", error)
  }
}

/**
 * Clear expired cache entries
 * Uses service role client for delete operations
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const supabase = createServiceClient()
    
    if (!supabase) {
      console.warn("[Cache] No service client available - skipping cache cleanup")
      return
    }

    const now = new Date().toISOString()

    const { error } = await supabase.from("news_cache").delete().lt("expires_at", now)

    if (error) {
      console.error("[Cache] Error clearing expired:", error)
    } else {
      console.log("[Cache] Cleared expired entries")
    }
  } catch (error) {
    console.error("[Cache] Error in clearExpiredCache:", error)
  }
}
