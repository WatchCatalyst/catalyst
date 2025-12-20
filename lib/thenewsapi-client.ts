export interface TheNewsAPIArticle {
  uuid: string
  title: string
  description: string
  url: string
  source: string
  published_at: string
  categories?: string[]
  keywords?: string[]
  image_url?: string
}

export async function fetchTheNewsAPIArticles(
  category: string,
  apiKey: string,
  page = 1,
  timeRange = "all", // Add timeRange parameter
): Promise<TheNewsAPIArticle[]> {
  // TheNewsAPI category mapping
  const categoryMap: Record<string, string> = {
    all: "business,tech,politics,sports,general",
    crypto: "tech",
    stocks: "business",
    war: "general,politics",
    technology: "tech",
    politics: "politics",
    sports: "sports",
    animals: "science",
  }

  const theNewsAPICategory = categoryMap[category] || "business,tech"

  let publishedAfter = ""
  let limit = 30 // Reduced from 50 to 30 for faster initial load

  if (timeRange === "today") {
    const estNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
    const todayStart = new Date(estNow)
    todayStart.setHours(0, 0, 0, 0)
    publishedAfter = todayStart.toISOString()
    limit = 30
    console.log("[v0] Today time range: fetching 30 articles from", todayStart.toISOString(), "to now (EST)")
  } else if (timeRange === "1h") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    publishedAfter = oneHourAgo.toISOString()
    limit = 30
  } else if (timeRange === "4h") {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
    publishedAfter = fourHoursAgo.toISOString()
    limit = 30
  }

  console.log(
    "[v0] Fetching from TheNewsAPI category:",
    theNewsAPICategory,
    "Page:",
    page,
    "TimeRange:",
    timeRange,
    "Limit:",
    limit,
  )

  let url = `https://api.thenewsapi.com/v1/news/all?api_token=${apiKey}&categories=${theNewsAPICategory}&language=en&limit=${limit}&page=${page}&exclude_domains=indiatoday.intoday.in&sort=published_at`

  if (publishedAfter) {
    url += `&published_after=${publishedAfter}`
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[v0] TheNewsAPI error ${response.status}:`, errorText)
    throw new Error(`TheNewsAPI error: ${response.status}`)
  }

  const data = await response.json()
  let articles = data.data || []

  // Comprehensive filter to exclude all Indian news
  const indianDomains = [
    ".in",
    "indiatoday",
    "timesofindia",
    "hindustantimes",
    "thehindu",
    "ndtv",
    "indianexpress",
    "economictimes",
    "mint",
    "business-standard",
    "zeebiz",
    "moneycontrol",
    "livemint",
    "firstpost",
  ]

  const indianKeywords = [
    "india",
    "indian",
    "mumbai",
    "delhi",
    "bangalore",
    "chennai",
    "kolkata",
    "hyderabad",
    "pune",
    "rupee",
    "sensex",
    "nifty",
    "bse",
    "nse",
  ]

  const initialCount = articles.length
  articles = articles.filter((article: any) => {
    // Check URL domain
    if (article.url) {
      const url = article.url.toLowerCase()
      if (indianDomains.some((domain) => url.includes(domain))) {
        return false
      }
    }

    // Check source name
    if (article.source) {
      const source = article.source.toLowerCase()
      if (indianDomains.some((domain) => source.includes(domain))) {
        return false
      }
      if (indianKeywords.some((keyword) => source.includes(keyword))) {
        return false
      }
    }

    // Check title for strong Indian indicators
    if (article.title) {
      const title = article.title.toLowerCase()
      // Only filter if title contains multiple Indian indicators (to avoid false positives)
      const indianMatches = indianKeywords.filter((keyword) => title.includes(keyword)).length
      if (indianMatches >= 2) {
        return false
      }
      // Always filter if title mentions rupee, sensex, nifty (market-specific)
      if (title.includes("rupee") || title.includes("sensex") || title.includes("nifty")) {
        return false
      }
    }

    return true
  })

  const filteredCount = initialCount - articles.length
  if (filteredCount > 0) {
    console.log(`[v0] Filtered out ${filteredCount} Indian news articles`)
  }

  console.log("[v0] TheNewsAPI returned", articles.length, "real-time articles (after Indian news filter) for timeRange:", timeRange)

  if (articles.length > 0 && articles[0].published_at) {
    const firstArticleDate = new Date(articles[0].published_at)
    const minutesAgo = Math.round((Date.now() - firstArticleDate.getTime()) / (1000 * 60))
    console.log("[v0] Freshest article is", minutesAgo, "minutes old")
  }

  return articles
}
