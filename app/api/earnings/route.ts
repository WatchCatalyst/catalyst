import { NextResponse } from "next/server"

export interface EarningsEvent {
  date: string
  symbol: string
  name: string
  eps?: number
  epsEstimated?: number
  time: string // "bmo" (before market open) or "amc" (after market close)
  revenue?: number
  revenueEstimated?: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get("from") || new Date().toISOString().split("T")[0]
  const toDate = searchParams.get("to") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 30 days ahead
  
  const FMP_KEY = process.env.FMP_API_KEY

  if (!FMP_KEY) {
    console.error("[Earnings API] FMP_API_KEY not configured")
    return NextResponse.json({
      success: false,
      error: "API key not configured",
      data: [],
    }, { status: 500 })
  }

  try {
    // Try stable endpoint first
    const endpoints = [
      `https://financialmodelingprep.com/stable/earnings-calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_KEY}`,
      `https://financialmodelingprep.com/api/v3/earnings_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_KEY}`,
    ]

    let earnings: EarningsEvent[] = []
    let lastError: Error | null = null

    for (const endpoint of endpoints) {
      try {
        console.log(`[Earnings API] Trying endpoint: ${endpoint.replace(FMP_KEY, "***")}`)
        const response = await fetch(endpoint, { next: { revalidate: 300 } }) // Cache 5 minutes

        if (response.ok) {
          const data = await response.json()
          
          if (Array.isArray(data)) {
            earnings = data.map((item: any) => ({
              date: item.date || item.earningDate,
              symbol: item.symbol || item.symbol || "",
              name: item.name || item.company || "",
              eps: item.eps,
              epsEstimated: item.epsEstimated || item.epsEstimate,
              time: item.time || (item.earningDate ? "amc" : "bmo"),
              revenue: item.revenue,
              revenueEstimated: item.revenueEstimated || item.revenueEstimate,
            }))
            
            console.log(`[Earnings API] ✅ SUCCESS! Got ${earnings.length} earnings events`)
            break
          }
        } else {
          const errorText = await response.text()
          console.warn(`[Earnings API] Endpoint failed ${response.status}:`, errorText.substring(0, 200))
          lastError = new Error(`FMP API error: ${response.status}`)
        }
      } catch (error) {
        console.error(`[Earnings API] Endpoint error:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    if (earnings.length === 0 && lastError) {
      console.warn("[Earnings API] ⚠️ All endpoints failed")
      return NextResponse.json({
        success: false,
        error: lastError.message,
        data: [],
        message: "Earnings calendar may not be available on your FMP plan",
      }, { status: 404 })
    }

    // Sort by date (soonest first)
    earnings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      success: true,
      data: earnings.slice(0, 50), // Return next 50 earnings
      timestamp: new Date().toISOString(),
      count: earnings.length,
    })
  } catch (error) {
    console.error("[Earnings API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch earnings",
      data: [],
    }, { status: 500 })
  }
}




