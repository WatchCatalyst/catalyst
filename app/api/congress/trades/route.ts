import { NextRequest, NextResponse } from "next/server"
import { API_KEYS, API_BASE_URLS, API_ENDPOINTS, getQuiverUrl } from "@/lib/api-config"
import { checkRateLimit, addRateLimitHeaders, rateLimitResponse, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"
import { validateTicker, validateCategory, sanitizeString } from "@/lib/input-validation"

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface CongressTrade {
  id: string
  representative: string
  ticker: string
  assetDescription: string
  type: "buy" | "sell"
  transactionDate: string
  disclosureDate: string
  amount: string
  owner: string
  party?: string
  chamber: "house" | "senate"
}

const ALLOWED_CHAMBERS = ["all", "house", "senate"]

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = checkRateLimit(request, RATE_LIMIT_CONFIG.api)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt)
  }

  const { searchParams } = new URL(request.url)
  const tickerParam = searchParams.get("ticker") || ""
  const chamberParam = searchParams.get("chamber") || "all"

  // Validate input
  const ticker = tickerParam ? validateTicker(tickerParam) || "" : ""
  const chamber = validateCategory(chamberParam, ALLOWED_CHAMBERS) || "all"

  const QUIVER_KEY = API_KEYS.QUIVER
  const FMP_KEY = API_KEYS.FMP

  try {
    const trades: CongressTrade[] = []

    // Try Quiver Quantitative API first (preferred - cheaper and more reliable)
    if (QUIVER_KEY) {
      try {
        // Helper function to try multiple endpoint formats
        const tryQuiverEndpoint = async (endpoints: string[], chamberType: "senate" | "house") => {
          for (const endpoint of endpoints) {
            try {
              const url = `${API_BASE_URLS.QUIVER}${endpoint}`
              console.log(`[v0] Trying Quiver ${chamberType} endpoint: ${url}`)
              
              const response = await fetch(url, {
                headers: {
                  "Authorization": `Bearer ${QUIVER_KEY}`,
                },
                // Use shorter cache for more real-time updates (2 minutes)
                next: { revalidate: 120 },
                cache: 'no-store', // Don't cache the fetch itself
              })

              if (response.ok) {
                const data = await response.json()
                console.log(`[v0] Quiver ${chamberType} success! Received:`, Array.isArray(data) ? data.length : typeof data)
                
                // Log first item structure to debug field names
                if (Array.isArray(data) && data.length > 0) {
                  console.log(`[v0] Quiver ${chamberType} first item keys:`, Object.keys(data[0]))
                  console.log(`[v0] Quiver ${chamberType} first item sample:`, JSON.stringify(data[0]).substring(0, 300))
                  return data
                } else if (typeof data === 'object' && data !== null) {
                  // Some APIs return objects with a data array
                  if (Array.isArray(data.data)) {
                    console.log(`[v0] Quiver ${chamberType} found data.data array with ${data.data.length} items`)
                    if (data.data.length > 0) {
                      console.log(`[v0] Quiver ${chamberType} first item keys:`, Object.keys(data.data[0]))
                    }
                    return data.data
                  }
                  if (Array.isArray(data.trades)) {
                    console.log(`[v0] Quiver ${chamberType} found data.trades array with ${data.trades.length} items`)
                    return data.trades
                  }
                  if (Array.isArray(data.results)) {
                    console.log(`[v0] Quiver ${chamberType} found data.results array with ${data.results.length} items`)
                    return data.results
                  }
                  console.warn(`[v0] Quiver ${chamberType} response is object but no array found. Keys:`, Object.keys(data))
                }
              } else {
                const errorText = await response.text().catch(() => "")
                console.warn(`[v0] Quiver ${chamberType} endpoint ${endpoint} failed:`, response.status, errorText.substring(0, 100))
              }
            } catch (err) {
              console.warn(`[v0] Quiver ${chamberType} endpoint ${endpoint} error:`, err)
            }
          }
          return null
        }

        // Try Senate trades with multiple endpoint formats
        if (chamber === "all" || chamber === "senate") {
          const senateEndpoints = [
            "/beta/recent/senatetrading",
            "/v1/recent/senatetrading",
            "/beta/live/congresstrading?chamber=senate",
            "/v1/congress/trading?chamber=senate",
            "/beta/historical/senatetrading",
          ]
          const senateData = await tryQuiverEndpoint(senateEndpoints, "senate")
          
          if (senateData && Array.isArray(senateData)) {
            const senateTrades = senateData.slice(0, 20).map((trade: any, index: number) => ({
              id: `quiver-senate-${trade.Ticker || trade.ticker || trade.symbol || "unknown"}-${index}`,
              representative: trade.Representative || trade.representative || trade.Name || trade.name || trade.Senator || trade.senator || "Unknown Senator",
              ticker: trade.Ticker || trade.ticker || trade.Symbol || trade.symbol || "N/A",
              assetDescription: trade.Asset || trade.asset || trade.AssetDescription || trade.assetDescription || trade.Description || trade.description || "Unknown Asset",
              type: ((trade.Transaction || trade.transaction || trade.Type || trade.type || trade.TransactionType || trade.transactionType || "").toLowerCase().includes("sale") || 
                     (trade.Transaction || trade.transaction || trade.Type || trade.type || trade.TransactionType || trade.transactionType || "").toLowerCase().includes("sell")) 
                    ? "sell" as const 
                    : "buy" as const,
              transactionDate: trade.TransactionDate || trade.transactionDate || trade.Date || trade.date || trade.Transaction || trade.transaction || new Date().toISOString(),
              disclosureDate: trade.DisclosureDate || trade.disclosureDate || trade.FilingDate || trade.filingDate || trade.TransactionDate || trade.transactionDate || new Date().toISOString(),
              amount: trade.Amount || trade.amount || trade.Range || trade.range || trade.Value || trade.value || trade.Size || trade.size || "Unknown",
              owner: trade.Owner || trade.owner || "Senator",
              party: trade.Party || trade.party || undefined,
              chamber: "senate" as const,
            }))
            trades.push(...senateTrades)
            console.log(`[v0] Mapped ${senateTrades.length} Senate trades from Quiver`)
          }
        }

        // Try House trades with multiple endpoint formats
        if (chamber === "all" || chamber === "house") {
          const houseEndpoints = [
            "/beta/recent/housetrading",
            "/v1/recent/housetrading",
            "/beta/live/congresstrading?chamber=house",
            "/v1/congress/trading?chamber=house",
            "/beta/historical/housetrading",
          ]
          const houseData = await tryQuiverEndpoint(houseEndpoints, "house")
          
          if (houseData && Array.isArray(houseData)) {
            const houseTrades = houseData.slice(0, 20).map((trade: any, index: number) => ({
              id: `quiver-house-${trade.Ticker || trade.ticker || trade.symbol || "unknown"}-${index}`,
              representative: trade.Representative || trade.representative || trade.Name || trade.name || "Unknown Rep",
              ticker: trade.Ticker || trade.ticker || trade.Symbol || trade.symbol || "N/A",
              assetDescription: trade.Asset || trade.asset || trade.AssetDescription || trade.assetDescription || trade.Description || trade.description || "Unknown Asset",
              type: ((trade.Transaction || trade.transaction || trade.Type || trade.type || trade.TransactionType || trade.transactionType || "").toLowerCase().includes("sale") || 
                     (trade.Transaction || trade.transaction || trade.Type || trade.type || trade.TransactionType || trade.transactionType || "").toLowerCase().includes("sell")) 
                    ? "sell" as const 
                    : "buy" as const,
              transactionDate: trade.TransactionDate || trade.transactionDate || trade.Date || trade.date || trade.Transaction || trade.transaction || new Date().toISOString(),
              disclosureDate: trade.DisclosureDate || trade.disclosureDate || trade.FilingDate || trade.filingDate || trade.TransactionDate || trade.transactionDate || new Date().toISOString(),
              amount: trade.Amount || trade.amount || trade.Range || trade.range || trade.Value || trade.value || trade.Size || trade.size || "Unknown",
              owner: trade.Owner || trade.owner || "Representative",
              party: trade.Party || trade.party || undefined,
              chamber: "house" as const,
            }))
            trades.push(...houseTrades)
            console.log(`[v0] Mapped ${houseTrades.length} House trades from Quiver`)
          }
        }
      } catch (err) {
        console.error("[v0] Quiver API fetch error:", err)
      }
    }

    // Fallback to FMP API if Quiver didn't return data or isn't configured
    if (trades.length === 0 && FMP_KEY) {
      // Fetch Senate trades
      if (chamber === "all" || chamber === "senate") {
        try {
          const senateUrl = `https://financialmodelingprep.com/api/v4/senate-trading${ticker ? `?symbol=${ticker}` : ""}${ticker ? "&" : "?"}apikey=${FMP_KEY}`
          console.log("[v0] Fetching Senate trades from FMP...")

          const senateResponse = await fetch(senateUrl, { next: { revalidate: 300 } })

          if (senateResponse.ok) {
            const senateData = await senateResponse.json()
            console.log("[v0] Senate trades received:", senateData?.length || 0)

            if (Array.isArray(senateData)) {
              const senateTrades = senateData.slice(0, 20).map((trade: any, index: number) => ({
                id: `senate-${trade.ticker || "unknown"}-${index}`,
                representative: trade.senator || trade.firstName + " " + trade.lastName || "Unknown Senator",
                ticker: trade.ticker || trade.assetName || "N/A",
                assetDescription: trade.assetDescription || trade.assetName || "Unknown Asset",
                type: (trade.transactionType?.toLowerCase().includes("sale") ? "sell" : "buy") as "buy" | "sell",
                transactionDate: trade.transactionDate || trade.dateRecieved || new Date().toISOString(),
                disclosureDate: trade.disclosureDate || trade.dateRecieved || new Date().toISOString(),
                amount: trade.amount || trade.range || "Unknown",
                owner: trade.owner || "Senator",
                party: trade.party || undefined,
                chamber: "senate" as const,
              }))
              trades.push(...senateTrades)
            }
          } else {
            const errorText = await senateResponse.text().catch(() => "Unable to read error")
            console.warn("[v0] FMP Senate API failed:", senateResponse.status, errorText.substring(0, 200))
          }
        } catch (err) {
          console.error("[v0] FMP Senate fetch error:", err)
        }
      }

      // Fetch House trades
      if (chamber === "all" || chamber === "house") {
        try {
          const houseUrl = `https://financialmodelingprep.com/api/v4/senate-disclosure${ticker ? `?symbol=${ticker}` : ""}${ticker ? "&" : "?"}apikey=${FMP_KEY}`
          console.log("[v0] Fetching House trades from FMP...")

          const houseResponse = await fetch(houseUrl, { next: { revalidate: 300 } })

          if (houseResponse.ok) {
            const houseData = await houseResponse.json()
            console.log("[v0] House trades received:", houseData?.length || 0)

            if (Array.isArray(houseData)) {
              const houseTrades = houseData.slice(0, 20).map((trade: any, index: number) => ({
                id: `house-${trade.ticker || "unknown"}-${index}`,
                representative: trade.representative || trade.firstName + " " + trade.lastName || "Unknown Rep",
                ticker: trade.ticker || trade.assetName || "N/A",
                assetDescription: trade.assetDescription || trade.assetName || "Unknown Asset",
                type: (trade.type?.toLowerCase().includes("sale") ? "sell" : "buy") as "buy" | "sell",
                transactionDate: trade.transactionDate || trade.disclosureDate || new Date().toISOString(),
                disclosureDate: trade.disclosureDate || trade.transactionDate || new Date().toISOString(),
                amount: trade.amount || trade.range || "Unknown",
                owner: trade.owner || "Representative",
                party: undefined,
                chamber: "house" as const,
              }))
              trades.push(...houseTrades)
            }
          } else {
            const errorText = await houseResponse.text().catch(() => "Unable to read error")
            console.warn("[v0] FMP House API failed:", houseResponse.status, errorText.substring(0, 200))
          }
        } catch (err) {
          console.error("[v0] FMP House fetch error:", err)
        }
      }
    } else if (!QUIVER_KEY && !FMP_KEY) {
      console.log("[v0] Neither QUIVER_API_KEY nor FMP_API_KEY configured - congressional trades require an API key")
    }

    // Sort by transaction date (most recent first)
    trades.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())

    console.log("[v0] Total congress trades fetched:", trades.length)
    if (trades.length > 0) {
      console.log("[v0] First trade sample:", JSON.stringify(trades[0]).substring(0, 400))
    }

    const responseData = {
      success: true,
      data: trades.slice(0, 30), // Return top 30 most recent trades
      timestamp: new Date().toISOString(),
      count: trades.length,
      message: trades.length === 0 
        ? "No congressional trades available at this time."
        : undefined,
    }
    
    console.log("[v0] API Response - success:", responseData.success, "count:", responseData.count, "data length:", responseData.data.length)
    
    const response = NextResponse.json(responseData)
    
    // Add rate limit headers
    addRateLimitHeaders(response, rateLimit)
    
    // Set cache control headers for client-side caching (2 minutes)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=60')
    response.headers.set('X-Data-Timestamp', new Date().toISOString())
    
    return response
  } catch (error) {
    console.error("[v0] Congress trades API error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch congressional trades",
      data: [],
      message: "Unable to fetch congressional trades at this time.",
    })
  }
}
