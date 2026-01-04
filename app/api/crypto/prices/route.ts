import { NextResponse } from "next/server"

// Enable route-level caching to prevent rate limits
// CoinGecko free tier: 10-50 calls/minute
// With 2-minute cache: ~30 calls/hour (safe margin for high traffic)
export const revalidate = 120 // Cache for 2 minutes (prices can update frequently)

// In-memory cache with request deduplication for concurrent requests
const cache: {
  data: any | null
  timestamp: number | null
  pending: Promise<any> | null
  cacheKey: string | null
} = {
  data: null,
  timestamp: null,
  pending: null,
  cacheKey: null,
}

const CACHE_TTL_MS = 120 * 1000 // 2 minutes in milliseconds

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
  
  // Create cache key from request params
  const cacheKey = `${symbols}-${limit}`
  
  // Check if we have valid cached data for this request
  const now = Date.now()
  if (cache.data && cache.timestamp && cache.cacheKey === cacheKey && (now - cache.timestamp) < CACHE_TTL_MS) {
    return NextResponse.json(cache.data)
  }

  // If there's already a pending request for the same params, wait for it
  if (cache.pending && cache.cacheKey === cacheKey) {
    try {
      const result = await cache.pending
      return NextResponse.json(result)
    } catch (error) {
      // If pending request failed, we'll continue to make a new one
      cache.pending = null
      cache.cacheKey = null
    }
  }

  // Create a new fetch promise and store it to deduplicate concurrent requests
  const fetchPromise = fetchCryptoPricesFromCoinGecko(symbols, limit, cacheKey)
  cache.pending = fetchPromise
  cache.cacheKey = cacheKey

  try {
    const result = await fetchPromise
    cache.data = result
    cache.timestamp = now
    cache.pending = null
    return NextResponse.json(result)
  } catch (error) {
    cache.pending = null
    cache.cacheKey = null
    console.error("[Crypto Prices API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch crypto prices",
      data: [],
    }, { status: 500 })
  }
}

async function fetchCryptoPricesFromCoinGecko(symbols: string, limit: number, cacheKey: string) {
  try {
    // Use CoinGecko API (FREE, no key required for basic usage)
    // Rate limits: 10-50 calls/minute for free tier
    // With 2-minute caching: ~30 calls/hour per unique request (safe)
    const symbolList = symbols.split(",").map(s => s.trim().toLowerCase())
    
    // Get top cryptocurrencies by market cap
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`
    
    console.log(`[Crypto Prices API] Fetching from CoinGecko... (cacheKey: ${cacheKey})`)
    
    const response = await fetch(url, { 
      next: { revalidate: 120 }, // Cache for 2 minutes (matches route cache)
      headers: {
        'Accept': 'application/json',
      },
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

    return {
      success: true,
      data: filteredPrices,
      timestamp: new Date().toISOString(),
      count: filteredPrices.length,
    }
  } catch (error) {
    console.error("[Crypto Prices API] Error in fetchCryptoPricesFromCoinGecko:", error)
    throw error // Let the GET handler catch and return error response
  }
}




