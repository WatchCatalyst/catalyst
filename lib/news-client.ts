import type { NewsCategory } from "@/app/page"
import type { TimeRange } from "@/components/time-range-filter"

class NewsClient {
  async fetchNews(category: NewsCategory = "all", page = 1, timeRange: TimeRange = "all") {
    try {
      const response = await fetch(`/api/news?category=${category}&page=${page}&timeRange=${timeRange}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("[v0] NewsClient error:", error)
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
