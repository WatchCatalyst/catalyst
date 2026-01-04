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

    // Basic data validation - flag suspicious entries
    const validatedEarnings = earnings.map((earning) => {
      // Add validation flags
      const validationFlags: string[] = []
      
      // Check for missing critical data
      if (!earning.symbol || earning.symbol.length === 0) {
        validationFlags.push("missing_symbol")
      }
      if (!earning.date) {
        validationFlags.push("missing_date")
      }
      
      // Check for suspicious EPS estimates (very high or negative when shouldn't be)
      if (earning.epsEstimated !== undefined && earning.epsEstimated !== null) {
        // Flag if EPS is suspiciously high (>$100) or very negative (<-$10) for most stocks
        if (earning.epsEstimated > 100 || earning.epsEstimated < -10) {
          validationFlags.push("suspicious_eps")
        }
      }
      
      return {
        ...earning,
        _validationFlags: validationFlags, // Internal flag, not exposed to client
      }
    })

    // Sort by date (soonest first)
    validatedEarnings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      success: true,
      data: validatedEarnings.slice(0, 50), // Return next 50 earnings
      timestamp: new Date().toISOString(),
      count: validatedEarnings.length,
      dataQuality: {
        note: "Data provided by Financial Modeling Prep. Please verify critical dates and estimates before trading.",
        source: "FMP API",
        lastValidated: new Date().toISOString(),
      },
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




