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
  let limit = 50

  if (timeRange === "today") {
    const estNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
    const todayStart = new Date(estNow)
    todayStart.setHours(0, 0, 0, 0)
    publishedAfter = todayStart.toISOString()
    limit = 50
    console.log("[v0] Today time range: fetching 50 articles from", todayStart.toISOString(), "to now (EST)")
  } else if (timeRange === "1h") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    publishedAfter = oneHourAgo.toISOString()
    limit = 50
  } else if (timeRange === "4h") {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
    publishedAfter = fourHoursAgo.toISOString()
    limit = 50
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

  articles = articles.filter((article: any) => {
    if (!article.url) return true
    return !article.url.includes("indiatoday.intoday.in")
  })

  console.log("[v0] TheNewsAPI returned", articles.length, "real-time articles for timeRange:", timeRange)

  if (articles.length > 0 && articles[0].published_at) {
    const firstArticleDate = new Date(articles[0].published_at)
    const minutesAgo = Math.round((Date.now() - firstArticleDate.getTime()) / (1000 * 60))
    console.log("[v0] Freshest article is", minutesAgo, "minutes old")
  }

  return articles
}
