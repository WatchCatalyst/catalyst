import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, addRateLimitHeaders, rateLimitResponse, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"
import { validateTicker, validationError } from "@/lib/input-validation"
import { API_KEYS, getFmpUrl } from "@/lib/api-config"

export interface OptionsFlowTrade {
  id: string
  symbol: string
  strike: number
  expiry: string
  type: "call" | "put"
  side: "buy" | "sell"
  premium: number
  volume: number
  openInterest: number
  timestamp: string
  unusual: boolean
  reason?: string // Why it's unusual (large size, low OI, etc.)
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = checkRateLimit(request, RATE_LIMIT_CONFIG.api)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  const { searchParams } = new URL(request.url)
  const symbolParam = searchParams.get("symbol")
  const limit = parseInt(searchParams.get("limit") || "50")
  const minPremium = parseFloat(searchParams.get("minPremium") || "100000") // $100k minimum

  // Validate input
  const symbol = symbolParam ? validateTicker(symbolParam) : null
  if (symbolParam && !symbol) {
    return NextResponse.json(validationError("Invalid symbol format"), { status: 400 })
  }

  try {
    // Try FMP first (if available)
    const fmpKey = API_KEYS.FMP
    if (fmpKey) {
      try {
        // FMP options data endpoint (if available on their plan)
        const url = symbol
          ? getFmpUrl(`/api/v3/options/${symbol}`, {})
          : getFmpUrl("/api/v3/options", {})
        
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        })

        if (response.ok) {
          const data = await response.json()
          
          // Transform FMP data to our format
          if (Array.isArray(data) && data.length > 0) {
            const trades: OptionsFlowTrade[] = data
              .map((item: any, index: number) => {
                const premium = (item.premium || 0) * (item.volume || 0)
                const isUnusual = premium >= minPremium || 
                                 (item.openInterest && item.volume > item.openInterest * 0.1)
                
                return {
                  id: `${item.symbol}-${item.strike}-${item.expiry}-${index}`,
                  symbol: item.symbol || symbol || "UNKNOWN",
                  strike: item.strike || 0,
                  expiry: item.expiry || "",
                  type: (item.type || "call").toLowerCase() as "call" | "put",
                  side: item.side || "buy",
                  premium: premium,
                  volume: item.volume || 0,
                  openInterest: item.openInterest || 0,
                  timestamp: item.timestamp || new Date().toISOString(),
                  unusual: isUnusual,
                  reason: isUnusual 
                    ? premium >= minPremium 
                      ? "Large premium trade" 
                      : "High volume relative to OI"
                    : undefined,
                }
              })
              .filter((trade: OptionsFlowTrade) => trade.premium >= minPremium)
              .sort((a: OptionsFlowTrade, b: OptionsFlowTrade) => b.premium - a.premium)
              .slice(0, limit)

            const response_data = NextResponse.json({ 
              success: true, 
              data: trades,
              count: trades.length,
            })
            addRateLimitHeaders(response_data, rateLimit)
            return response_data
          }
        }
      } catch (fmpError) {
        console.warn("[Options Flow] FMP API error:", fmpError)
        // Fall through to mock data
      }
    }

    // Fallback: Return mock data structure for development/demo
    // In production, you'd integrate with Polygon.io, CBOE, or other options data providers
    const mockTrades: OptionsFlowTrade[] = [
      {
        id: "mock-1",
        symbol: "AAPL",
        strike: 200,
        expiry: "2024-12-20",
        type: "call",
        side: "buy",
        premium: 2500000,
        volume: 5000,
        openInterest: 15000,
        timestamp: new Date().toISOString(),
        unusual: true,
        reason: "Large premium trade",
      },
      {
        id: "mock-2",
        symbol: "TSLA",
        strike: 250,
        expiry: "2024-12-27",
        type: "put",
        side: "buy",
        premium: 1800000,
        volume: 3000,
        openInterest: 8000,
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        unusual: true,
        reason: "High volume relative to OI",
      },
      {
        id: "mock-3",
        symbol: "NVDA",
        strike: 500,
        expiry: "2025-01-17",
        type: "call",
        side: "buy",
        premium: 1200000,
        volume: 2000,
        openInterest: 12000,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        unusual: true,
        reason: "Large premium trade",
      },
    ].filter(trade => !symbol || trade.symbol === symbol.toUpperCase())
     .slice(0, limit)

    const response_data = NextResponse.json({
      success: true,
      data: mockTrades,
      count: mockTrades.length,
      note: "Using mock data. Configure FMP_API_KEY or integrate with options data provider for real data.",
    })
    addRateLimitHeaders(response_data, rateLimit)
    return response_data

  } catch (error: any) {
    console.error("[Options Flow API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch options flow data" },
      { status: 500 }
    )
  }
}
