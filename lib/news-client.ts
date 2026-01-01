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

  async analyzeNews(title: string, summary: string, category: string) {
    try {
      const response = await fetch("/api/news/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, summary, category }),
      })

      if (!response.ok) {
        throw new Error(`Failed to analyze news: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error("[v0] NewsClient analysis error:", error)
      return null
    }
  }
}

export const newsClient = new NewsClient()
