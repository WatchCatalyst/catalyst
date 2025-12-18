import { NextResponse } from "next/server"

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get("ticker") || ""
  const chamber = searchParams.get("chamber") || "all" // all, house, senate

  const FMP_KEY = process.env.FMP_API_KEY

  if (!FMP_KEY) {
    console.error("[v0] FMP_API_KEY not configured")
    return NextResponse.json({
      success: false,
      error: "API key not configured",
      data: [],
    })
  }

  try {
    const trades: CongressTrade[] = []

    // Fetch Senate trades
    if (chamber === "all" || chamber === "senate") {
      try {
        const senateUrl = `https://financialmodelingprep.com/api/v4/senate-trading${ticker ? `?symbol=${ticker}` : ""}${ticker ? "&" : "?"}apikey=${FMP_KEY}`
        console.log("[v0] Fetching Senate trades...")

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
          console.warn("[v0] Senate API failed:", senateResponse.status, errorText.substring(0, 200))
        }
      } catch (err) {
        console.error("[v0] Senate fetch error:", err)
      }
    }

    // Fetch House trades
    if (chamber === "all" || chamber === "house") {
      try {
        const houseUrl = `https://financialmodelingprep.com/api/v4/senate-disclosure${ticker ? `?symbol=${ticker}` : ""}${ticker ? "&" : "?"}apikey=${FMP_KEY}`
        console.log("[v0] Fetching House trades...")

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
          console.warn("[v0] House API failed:", houseResponse.status, errorText.substring(0, 200))
        }
      } catch (err) {
        console.error("[v0] House fetch error:", err)
      }
    }

    // Sort by transaction date (most recent first)
    trades.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())

    console.log("[v0] Total congress trades fetched:", trades.length)

    return NextResponse.json({
      success: true,
      data: trades.slice(0, 30), // Return top 30 most recent trades
      timestamp: new Date().toISOString(),
      count: trades.length,
      message: trades.length === 0 
        ? "No trades found. This may indicate the API key doesn't have access to congressional trades data, or you need a legacy FMP subscription."
        : undefined,
    })
  } catch (error) {
    console.error("[v0] Congress trades API error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch congressional trades",
      data: [],
      message: "Check console logs for detailed error information. Ensure FMP_API_KEY is set and has access to congressional trades.",
    })
  }
}
