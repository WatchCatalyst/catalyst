import { createHash } from "crypto"
import type { ClassificationResult } from "./market-relevance-classifier"

/**
 * In-memory cache for article classifications
 * Key: Article URL (or hash of title if URL is missing)
 * Value: ClassificationResult
 * 
 * Note: This is a global singleton. In serverless/edge environments,
 * this resets on cold starts, which is fine for MVP.
 * For production, consider using Vercel KV or Redis for persistence.
 */
class ClassificationCache {
  private cache: Map<string, ClassificationResult>

  constructor() {
    this.cache = new Map()
  }

  /**
   * Generate a cache key from URL or title
   */
  private getCacheKey(url?: string, title?: string): string {
    if (url) {
      return url
    }
    
    // Fallback: hash the title if URL is missing
    if (title) {
      return createHash("md5").update(title).digest("hex")
    }
    
    throw new Error("Cannot generate cache key: both URL and title are missing")
  }

  /**
   * Get a classification result from cache
   */
  get(url?: string, title?: string): ClassificationResult | undefined {
    const key = this.getCacheKey(url, title)
    return this.cache.get(key)
  }

  /**
   * Store a classification result in cache
   */
  set(url: string | undefined, title: string | undefined, result: ClassificationResult): void {
    const key = this.getCacheKey(url, title)
    this.cache.set(key, result)
  }

  /**
   * Check if a key exists in cache
   */
  has(url?: string, title?: string): boolean {
    const key = this.getCacheKey(url, title)
    return this.cache.has(key)
  }

  /**
   * Get cache statistics (for debugging/monitoring)
   */
  getStats(): { size: number } {
    return {
      size: this.cache.size,
    }
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clear(): void {
    this.cache.clear()
  }
}

// Global singleton instance
const classificationCache = new ClassificationCache()

export { classificationCache }


