import { NextResponse } from "next/server"

export interface CryptoPrice {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap: number
  rank: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get("symbols") || "BTC,ETH,SOL,BNB,ADA,DOT,AVAX,MATIC,LINK,UNI" // Top 10 by default
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    // Use CoinGecko API (FREE, no key required for basic usage)
    // Try multiple endpoints
    const symbolList = symbols.split(",").map(s => s.trim().toLowerCase())
    
    // First, get top cryptocurrencies by market cap
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    
    console.log(`[Crypto Prices API] Fetching from CoinGecko...`)
    
    const response = await fetch(url, { 
      next: { revalidate: 60 } // Cache 1 minute (crypto prices change fast)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[Crypto Prices API] CoinGecko error ${response.status}:`, errorText.substring(0, 200))
      
      // Fallback: Try individual coin lookup if market endpoint fails
      if (response.status === 429) {
        return NextResponse.json({
          success: false,
          error: "Rate limit exceeded. CoinGecko free tier allows 10-50 calls/minute.",
          data: [],
        }, { status: 429 })
      }
      
      return NextResponse.json({
        success: false,
        error: `CoinGecko API error: ${response.status}`,
        data: [],
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.warn("[Crypto Prices API] Invalid response format")
      return NextResponse.json({
        success: false,
        error: "Invalid response format",
        data: [],
      }, { status: 500 })
    }

    const prices: CryptoPrice[] = data.map((item: any, index: number) => ({
      id: item.id || item.symbol || "",
      symbol: (item.symbol || "").toUpperCase(),
      name: item.name || "",
      price: item.current_price || item.price || 0,
      change24h: item.price_change_24h || 0,
      changePercent24h: item.price_change_percentage_24h || 0,
      volume24h: item.total_volume || 0,
      marketCap: item.market_cap || 0,
      rank: index + 1,
    }))

    // If specific symbols requested, filter to those
    let filteredPrices = prices
    if (symbols && symbols !== "BTC,ETH,SOL,BNB,ADA,DOT,AVAX,MATIC,LINK,UNI") {
      const requestedSymbols = symbolList.map(s => s.toUpperCase())
      filteredPrices = prices.filter(p => 
        requestedSymbols.includes(p.symbol) || 
        requestedSymbols.includes(p.id.toUpperCase())
      )
    }

    console.log(`[Crypto Prices API] ✅ Got ${filteredPrices.length} crypto prices`)

    return NextResponse.json({
      success: true,
      data: filteredPrices,
      timestamp: new Date().toISOString(),
      count: filteredPrices.length,
    })
  } catch (error) {
    console.error("[Crypto Prices API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch crypto prices",
      data: [],
    }, { status: 500 })
  }
}




