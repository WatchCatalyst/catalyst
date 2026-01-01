/**
 * EODHD API Client
 * Financial news, earnings, IPOs, and splits data
 */

export interface EODHDNewsArticle {
  date?: string
  published_at?: string
  publishedDate?: string
  time?: string
  title?: string
  headline?: string
  content?: string
  text?: string
  description?: string
  summary?: string
  link?: string
  url?: string
  source_url?: string
  symbol?: string
  ticker?: string
  tags?: string
  tag?: string
  categories?: string
  type?: string
  [key: string]: any // Allow any additional fields
}

export interface EODHDNewsResponse {
  date?: string
  symbol?: string
  news?: EODHDNewsArticle[]
}

/**
 * Fetch financial news from EODHD API
 * @param apiKey - EODHD API key
 * @param symbols - Optional: filter by ticker symbols (e.g., ["AAPL", "TSLA"])
 * @param limit - Maximum number of articles to return (default: 100)
 * @param from - Optional: start date in YYYY-MM-DD format
 * @param to - Optional: end date in YYYY-MM-DD format
 */
export async function fetchEODHDNews(
  apiKey: string,
  symbols?: string[], // Optional: filter by ticker symbols
  limit: number = 100,
  from?: string, // ISO date string (YYYY-MM-DD)
  to?: string, // ISO date string (YYYY-MM-DD)
  offset: number = 0 // Offset for pagination
): Promise<EODHDNewsArticle[]> {
  try {
    // EODHD News endpoint format
    // https://eodhd.com/api/news?api_token=YOUR_API_KEY&s=AAPL.US&limit=100&offset=0&fmt=json
    let url = `https://eodhd.com/api/news?api_token=${apiKey}&limit=${limit}&offset=${offset}&fmt=json`
    
    // Add symbol filter if provided (can filter by multiple symbols)
    if (symbols && symbols.length > 0) {
      // EODHD supports comma-separated symbols or single symbol
      // Format: AAPL.US, TSLA.US or just AAPL (EODHD will handle it)
      const symbolParam = symbols.map(s => s.includes('.') ? s : `${s}.US`).join(',')
      url += `&s=${symbolParam}`
    }
    
    // Add date filters if provided
    if (from) {
      url += `&from=${from}`
    }
    if (to) {
      url += `&to=${to}`
    }
    
    console.log(`[EODHD] Fetching news from: ${url.replace(apiKey, '***')}`)
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: 'no-store', // Don't cache to ensure fresh data
    })
    
    console.log(`[EODHD] Response status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[EODHD] API error ${response.status}:`, errorText)
      throw new Error(`EODHD API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`[EODHD] Response type: ${Array.isArray(data) ? 'Array' : typeof data}`)
    console.log(`[EODHD] Response keys:`, Object.keys(data).slice(0, 10))
    if (Array.isArray(data) && data.length > 0) {
      console.log(`[EODHD] First article sample:`, JSON.stringify(data[0], null, 2).substring(0, 300))
    }
    
    // EODHD returns array of news articles or object with news array
    let articles: EODHDNewsArticle[] = []
    if (Array.isArray(data)) {
      articles = data
    } else if (data.news && Array.isArray(data.news)) {
      articles = data.news
    } else if (data.data && Array.isArray(data.data)) {
      articles = data.data
    } else if (typeof data === 'object' && data !== null) {
      // Try to find any array property
      const keys = Object.keys(data)
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          articles = data[key]
          console.log(`[EODHD] Found articles in property: ${key}`)
          break
        }
      }
    }
    
    console.log(`[EODHD] Received ${articles.length} news articles`)
    if (articles.length === 0 && data) {
      console.warn(`[EODHD] No articles found in response. Response structure:`, Object.keys(data))
    }
    return articles
  } catch (error) {
    console.error("[EODHD] Failed to fetch news:", error)
    throw error
  }
}

/**
 * Fetch earnings calendar from EODHD
 */
export async function fetchEODHDEarnings(
  apiKey: string,
  from?: string,
  to?: string,
  symbols?: string[]
): Promise<any[]> {
  try {
    let url = `https://eodhd.com/api/calendar/earnings?api_token=${apiKey}`
    
    if (from) url += `&from=${from}`
    if (to) url += `&to=${to}`
    if (symbols && symbols.length > 0) {
      const symbolParam = symbols.map(s => s.includes('.') ? s : `${s}.US`).join(',')
      url += `&s=${symbolParam}`
    }
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      throw new Error(`EODHD Earnings API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : (data.data || [])
  } catch (error) {
    console.error("[EODHD] Failed to fetch earnings:", error)
    throw error
  }
}

/**
 * Fetch IPOs calendar from EODHD
 */
export async function fetchEODHDIPOs(
  apiKey: string,
  from?: string,
  to?: string
): Promise<any[]> {
  try {
    let url = `https://eodhd.com/api/calendar/ipos?api_token=${apiKey}`
    
    if (from) url += `&from=${from}`
    if (to) url += `&to=${to}`
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      throw new Error(`EODHD IPOs API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : (data.data || [])
  } catch (error) {
    console.error("[EODHD] Failed to fetch IPOs:", error)
    throw error
  }
}

/**
 * Fetch stock splits calendar from EODHD
 */
export async function fetchEODHDSplits(
  apiKey: string,
  from?: string,
  to?: string,
  symbols?: string[]
): Promise<any[]> {
  try {
    let url = `https://eodhd.com/api/calendar/splits?api_token=${apiKey}`
    
    if (from) url += `&from=${from}`
    if (to) url += `&to=${to}`
    if (symbols && symbols.length > 0) {
      const symbolParam = symbols.map(s => s.includes('.') ? s : `${s}.US`).join(',')
      url += `&s=${symbolParam}`
    }
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    })
    
    if (!response.ok) {
      throw new Error(`EODHD Splits API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : (data.data || [])
  } catch (error) {
    console.error("[EODHD] Failed to fetch splits:", error)
    throw error
  }
}
