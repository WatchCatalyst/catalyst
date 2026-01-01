import { NextResponse } from "next/server"

export interface AnalystRating {
  symbol: string
  name: string
  rating: string // "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"
  ratingScore: number // 1-5 (1=Strong Sell, 5=Strong Buy)
  targetPrice?: number
  currentPrice?: number
  date: string
  analyst?: string
  firm?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol") || ""
  const limit = parseInt(searchParams.get("limit") || "50")
  
  const FMP_KEY = process.env.FMP_API_KEY

  if (!FMP_KEY) {
    console.error("[Analyst Ratings API] FMP_API_KEY not configured")
    return NextResponse.json({
      success: false,
      error: "API key not configured",
      data: [],
    }, { status: 500 })
  }

  try {
    // Try multiple endpoints
    const endpoints = [
      `https://financialmodelingprep.com/stable/ratings${symbol ? `?symbol=${symbol.toUpperCase()}` : ""}${symbol ? "&" : "?"}apikey=${FMP_KEY}`,
      `https://financialmodelingprep.com/api/v3/ratings${symbol ? `?symbol=${symbol.toUpperCase()}` : ""}${symbol ? "&" : "?"}apikey=${FMP_KEY}`,
    ]

    let ratings: AnalystRating[] = []
    let lastError: Error | null = null

    for (const endpoint of endpoints) {
      try {
        console.log(`[Analyst Ratings API] Trying: ${endpoint.replace(FMP_KEY, "***")}`)
        const response = await fetch(endpoint, { next: { revalidate: 600 } }) // Cache 10 minutes

        if (response.ok) {
          const data = await response.json()
          
          if (Array.isArray(data)) {
            ratings = data.map((item: any) => {
              // Normalize rating to consistent format
              const ratingText = (item.rating || item.recommendation || "").toLowerCase()
              let ratingScore = 3 // Default neutral
              let rating = "Hold"

              if (ratingText.includes("strong buy") || ratingText === "5") {
                rating = "Strong Buy"
                ratingScore = 5
              } else if (ratingText.includes("buy") || ratingText === "4") {
                rating = "Buy"
                ratingScore = 4
              } else if (ratingText.includes("hold") || ratingText === "3") {
                rating = "Hold"
                ratingScore = 3
              } else if (ratingText.includes("sell") || ratingText === "2") {
                rating = "Sell"
                ratingScore = 2
              } else if (ratingText.includes("strong sell") || ratingText === "1") {
                rating = "Strong Sell"
                ratingScore = 1
              }

              return {
                symbol: item.symbol || "",
                name: item.companyName || item.name || "",
                rating,
                ratingScore,
                targetPrice: item.targetPrice || item.priceTarget || item.target,
                currentPrice: item.currentPrice || item.price,
                date: item.date || item.ratingDate || item.publishedDate || "",
                analyst: item.analystName || item.analyst,
                firm: item.ratingDetailsDCFRecommendation || item.firm || item.company || "",
              }
            })
            
            console.log(`[Analyst Ratings API] ✅ SUCCESS! Got ${ratings.length} ratings`)
            break
          }
        } else {
          const errorText = await response.text()
          console.warn(`[Analyst Ratings API] Endpoint failed ${response.status}:`, errorText.substring(0, 200))
          lastError = new Error(`FMP API error: ${response.status}`)
        }
      } catch (error) {
        console.error(`[Analyst Ratings API] Endpoint error:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    if (ratings.length === 0 && lastError) {
      console.warn("[Analyst Ratings API] ⚠️ All endpoints failed")
      return NextResponse.json({
        success: false,
        error: lastError.message,
        data: [],
        message: "Analyst ratings may not be available on your FMP plan",
      }, { status: 404 })
    }

    // Sort by date (most recent first), then by rating impact
    ratings.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return Math.abs(b.ratingScore - 3) - Math.abs(a.ratingScore - 3) // Prioritize strong buys/sells
    })

    return NextResponse.json({
      success: true,
      data: ratings.slice(0, limit),
      timestamp: new Date().toISOString(),
      count: ratings.length,
    })
  } catch (error) {
    console.error("[Analyst Ratings API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch analyst ratings",
      data: [],
    }, { status: 500 })
  }
}




