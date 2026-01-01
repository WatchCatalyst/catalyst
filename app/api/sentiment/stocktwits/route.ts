import { NextResponse } from "next/server"

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

  try {
    // Stocktwits API is free but has rate limits
    // We'll fetch sentiment for each symbol
    const sentiments: StocktwitsSentiment[] = []

    // Note: Stocktwits official API requires OAuth for most endpoints
    // For now, we'll use a simpler approach with their public endpoints
    // If you need more data, consider their official API with OAuth

    for (const symbol of symbolList.slice(0, 10)) { // Limit to 10 symbols to avoid rate limits
      try {
        // Stocktwits public sentiment endpoint (unofficial, may change)
        const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`
        
        const response = await fetch(url, {
          next: { revalidate: 300 }, // Cache 5 minutes
          headers: {
            'User-Agent': 'WatchCatalyst/1.0',
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          // Calculate sentiment from messages
          const messages = data.messages || []
          let bullish = 0
          let bearish = 0
          
          messages.forEach((msg: any) => {
            if (msg.entities?.sentiment) {
              if (msg.entities.sentiment.basic === "bullish") bullish++
              else if (msg.entities.sentiment.basic === "bearish") bearish++
            }
          })

          const total = bullish + bearish || 1
          const bullishPercent = Math.round((bullish / total) * 100)
          const bearishPercent = Math.round((bearish / total) * 100)
          
          let sentiment: "bullish" | "bearish" | "neutral" = "neutral"
          if (bullishPercent > 60) sentiment = "bullish"
          else if (bearishPercent > 60) sentiment = "bearish"

          sentiments.push({
            symbol,
            name: data.symbol?.title || symbol,
            bullishPercent,
            bearishPercent,
            sentiment,
            messageCount: messages.length,
            watchlistCount: data.symbol?.watchlist_count || 0,
            lastUpdated: new Date().toISOString(),
          })
        }
      } catch (error) {
        console.error(`[Stocktwits API] Error fetching ${symbol}:`, error)
        // Continue to next symbol
      }
    }

    return NextResponse.json({
      success: true,
      data: sentiments,
      timestamp: new Date().toISOString(),
      count: sentiments.length,
    })
  } catch (error) {
    console.error("[Stocktwits API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch Stocktwits sentiment",
      data: [],
    }, { status: 500 })
  }
}




