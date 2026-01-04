import { NextResponse } from "next/server"

// Enable route-level caching to prevent multiple concurrent requests
// This ensures all users share the same cached response
export const revalidate = 360 // Cache API route response for 6 minutes (safer for high traffic)

// In-memory cache with request deduplication for concurrent requests
const cache: {
  data: any | null
  timestamp: number | null
  pending: Promise<any> | null
} = {
  data: null,
  timestamp: null,
  pending: null,
}

const CACHE_TTL_MS = 360 * 1000 // 6 minutes in milliseconds

export interface StocktwitsSentiment {
  symbol: string
  name: string
  bullishPercent: number
  bearishPercent: number
  sentiment: "bullish" | "bearish" | "neutral"
  messageCount: number
  watchlistCount: number
  lastUpdated: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get("symbols") || "BTC,ETH,SPY,QQQ,AAPL,TSLA,MSFT,GOOGL,AMZN,NVDA"
  const symbolList = symbols.split(",").map(s => s.trim().toUpperCase())

  // Check if we have valid cached data
  const now = Date.now()
  if (cache.data && cache.timestamp && (now - cache.timestamp) < CACHE_TTL_MS) {
    return NextResponse.json(cache.data)
  }

  // If there's already a pending request, wait for it instead of making a new one
  if (cache.pending) {
    try {
      const result = await cache.pending
      return NextResponse.json(result)
    } catch (error) {
      // If pending request failed, we'll continue to make a new one
      cache.pending = null
    }
  }

  // Create a new fetch promise and store it to deduplicate concurrent requests
  const fetchPromise = fetchSentiments(symbolList)
  cache.pending = fetchPromise

  try {
    const result = await fetchPromise
    cache.data = result
    cache.timestamp = now
    cache.pending = null
    return NextResponse.json(result)
  } catch (error) {
    cache.pending = null
    console.error("[Stocktwits API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch Stocktwits sentiment",
      data: [],
    }, { status: 500 })
  }
}

async function fetchSentiments(symbolList: string[]) {
  try {
    // Stocktwits API is free but has rate limits (200 requests/hour for unauthenticated)
    // With 6-minute cache: 10 symbols × 10 refreshes/hour = 100 calls/hour (safe margin)
    // This protects against concurrent users - all share the same cached response
    const sentiments: StocktwitsSentiment[] = []
    const MAX_SYMBOLS = 10 // Limit to stay within rate limits

    // Note: Stocktwits official API requires OAuth for most endpoints
    // For now, we'll use a simpler approach with their public endpoints
    // If you need more data, consider their official API with OAuth

    for (const symbol of symbolList.slice(0, MAX_SYMBOLS)) {
      try {
        // Try the streams endpoint which is public
        const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`
        
        const response = await fetch(url, {
          next: { revalidate: 360 }, // Cache 6 minutes (matches route cache)
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WatchCatalyst/1.0)',
            'Accept': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const symbolData = data.symbol || {}
          
          // Calculate sentiment from messages
          const messages = data.messages || []
          let bullish = 0
          let bearish = 0
          let totalWithSentiment = 0
          
          // Count sentiment from messages - this is the most reliable method
          messages.forEach((msg: any) => {
            const sentiment = msg.entities?.sentiment
            if (sentiment) {
              // Handle both basic sentiment string and sentiment object
              const basicSentiment = sentiment.basic || sentiment
              
              if (typeof basicSentiment === 'string') {
                if (basicSentiment.toLowerCase() === "bullish") {
                  bullish++
                  totalWithSentiment++
                } else if (basicSentiment.toLowerCase() === "bearish") {
                  bearish++
                  totalWithSentiment++
                }
              }
            }
          })

          // If no sentiment from messages, check symbol-level data
          if (totalWithSentiment === 0) {
            if (symbolData.sentiment) {
              const sent = symbolData.sentiment
              // Handle numeric counts
              if (typeof sent.bullish === 'number' && typeof sent.bearish === 'number') {
                bullish = sent.bullish
                bearish = sent.bearish
                totalWithSentiment = bullish + bearish
              } else if (sent.basic) {
                // Basic sentiment indication
                const basicSent = sent.basic.toLowerCase()
                if (basicSent === "bullish") {
                  bullish = 60
                  bearish = 40
                  totalWithSentiment = 100
                } else if (basicSent === "bearish") {
                  bullish = 40
                  bearish = 60
                  totalWithSentiment = 100
                }
              }
            }
          }

          // Calculate percentages
          let bullishPercent = 0
          let bearishPercent = 0
          
          if (totalWithSentiment > 0) {
            bullishPercent = Math.round((bullish / totalWithSentiment) * 100)
            bearishPercent = Math.round((bearish / totalWithSentiment) * 100)
          } else {
            // Skip symbols with no sentiment data to avoid showing misleading 0%
            console.warn(`[Stocktwits] ${symbol}: ${messages.length} messages but no sentiment data available`)
            continue
          }
          
          let sentiment: "bullish" | "bearish" | "neutral" = "neutral"
          if (bullishPercent > 60) sentiment = "bullish"
          else if (bearishPercent > 60) sentiment = "bearish"

          // NOTE: The Stocktwits streams API only returns a sample of recent messages (~30)
          // It does NOT provide total message counts. This is a limitation of their free API.
          // For total counts, you'd need their paid Firestream API or authenticated endpoints.
          
          // For "people watching", check multiple possible field names from the API response
          const watchlistCount = symbolData.watchlist_count || 
                                symbolData.watchers_count || 
                                symbolData.watchlistCount ||
                                0

          sentiments.push({
            symbol,
            name: symbolData.title || symbolData.name || symbol,
            bullishPercent,
            bearishPercent,
            sentiment,
            messageCount: messages.length, // Sample size from API response (typically 30), not total message volume
            watchlistCount,
            lastUpdated: new Date().toISOString(),
          })
        } else {
          const errorText = await response.text().catch(() => '')
          console.error(`[Stocktwits API] HTTP ${response.status} for ${symbol}:`, errorText)
          
          // If rate limited, add a delay
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        console.error(`[Stocktwits API] Error fetching ${symbol}:`, error)
        // Continue to next symbol even if one fails
      }
      
      // Add delay between requests to avoid rate limits (200ms between symbols)
      if (symbolList.indexOf(symbol) < Math.min(symbolList.length - 1, MAX_SYMBOLS - 1)) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return {
      success: true,
      data: sentiments,
      timestamp: new Date().toISOString(),
      count: sentiments.length,
    }
  } catch (error) {
    console.error("[Stocktwits API] Error in fetchSentiments:", error)
    throw error // Let the GET handler catch and return error response
  }
}




