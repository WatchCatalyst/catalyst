import type { NewsCategory } from "@/app/page"
import type { TimeRange } from "@/components/time-range-filter"

class NewsClient {
  async fetchNews(category: NewsCategory = "all", page = 1, timeRange: TimeRange = "all") {
    try {
      // Simplified: always fetch from US feed (category/page params ignored for now)
      console.log("[NewsClient] Fetching from /api/news...")
      const response = await fetch(`/api/news`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.error(`[NewsClient] API error ${response.status}:`, errorText)
        throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[NewsClient] Received ${data.data?.length || 0} articles from API`)
      return data.data || []
    } catch (error) {
      console.error("[NewsClient] Error fetching news:", error)
      return []
    }
  }

}

export const newsClient = new NewsClient()
