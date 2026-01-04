/**
 * Alpha Tracker Service
 * Fetches real insider and politician trading data from multiple sources:
 * 1. FMP API (if available on plan)
 * 2. Capitol Trades API (free tier for Senate trades)
 * 3. SEC EDGAR (free for insider trades)
 */

export interface AlphaTrade {
  ticker: string
  person: string // Senator name or Insider reporting name
  type: "Buy" | "Sell"
  amount: string // Formatted amount (e.g., "$50k" or "$1M-$5M")
  date: string // Transaction date
  source: "Senate" | "Insider"
}

/**
 * Format transaction amount from FMP API
 */
function formatAmount(rawAmount: any): string {
  if (!rawAmount) return "Unknown"

  // Handle different formats from FMP
  const amountStr = String(rawAmount)

  // If it's already a range or formatted string
  if (amountStr.includes("-") || amountStr.includes("M") || amountStr.includes("K")) {
    return amountStr
  }

  // Try to parse as number
  const num = Number(amountStr)
  if (isNaN(num)) return amountStr

  // Format based on size
  if (num >= 1000000) {
    const millions = (num / 1000000).toFixed(1)
    return `$${millions}M`
  }
  if (num >= 1000) {
    const thousands = (num / 1000).toFixed(0)
    return `$${thousands}K`
  }
  return `$${num.toFixed(0)}`
}

/**
 * Map transaction type from FMP API to our format
 */
function mapTransactionType(type: string): "Buy" | "Sell" {
  const lower = (type || "").toLowerCase()
  if (lower.includes("sale") || lower.includes("sell")) {
    return "Sell"
  }
  return "Buy" // Default to Buy for Purchase, Buy, etc.
}

/**
 * Fetch politician trades (Senate) - tries multiple sources
 */
export async function getPoliticianTrades(): Promise<AlphaTrade[]> {
  // Try FMP first (if available)
  const fmpKey = process.env.FMP_API_KEY
  if (fmpKey) {
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v4/senate-trading?limit=30&apikey=${fmpKey}`,
        {
          headers: { Accept: "application/json" },
          next: { revalidate: 300 }, // Cache 5 minutes
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          console.log("[alpha-service] ✅ Got Senate trades from FMP")
          return data.map((trade: any) => ({
            ticker: trade.symbol || trade.ticker || "N/A",
            person: trade.senator || trade.representative || trade.firstName + " " + trade.lastName || "Unknown",
            type: mapTransactionType(trade.transaction || trade.type || "Purchase"),
            amount: formatAmount(trade.amount || trade.price),
            date: trade.transactionDate || trade.filingDate || new Date().toISOString(),
            source: "Senate" as const,
          }))
        }
      }
    } catch (error) {
      console.warn("[alpha-service] FMP Senate trades failed, trying alternatives:", error)
    }
  }

  // Fallback: Try Capitol Trades API (free tier)
  try {
    // Capitol Trades has a public API - using their data endpoint
    const response = await fetch(
      "https://api.capitoltrades.com/trades?pageSize=30&sortBy=transactionDate&sortOrder=desc",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 600 }, // Cache 10 minutes
      },
    )

    if (response.ok) {
      const data = await response.json()
      if (data?.data && Array.isArray(data.data)) {
        console.log("[alpha-service] ✅ Got Senate trades from Capitol Trades")
        return data.data
          .filter((trade: any) => trade.chamber === "senate")
          .slice(0, 30)
          .map((trade: any) => ({
            ticker: trade.ticker || trade.assetTicker || "N/A",
            person: trade.politician?.name || trade.representative || "Unknown Senator",
            type: mapTransactionType(trade.transactionType || trade.type || "Purchase"),
            amount: formatAmount(trade.amount || trade.value),
            date: trade.transactionDate || trade.filingDate || new Date().toISOString(),
            source: "Senate" as const,
          }))
      }
    }
  } catch (error) {
    console.warn("[alpha-service] Capitol Trades API failed:", error)
  }

  console.warn("[alpha-service] No Senate trades available from any source")
  return []
}

/**
 * Fetch insider trades (Corporate Insiders) - tries multiple sources
 */
export async function getInsiderTrades(): Promise<AlphaTrade[]> {
  // Try FMP first (if available)
  const fmpKey = process.env.FMP_API_KEY
  if (fmpKey) {
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v4/insider-trading?limit=30&apikey=${fmpKey}`,
        {
          headers: { Accept: "application/json" },
          next: { revalidate: 300 }, // Cache 5 minutes
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          console.log("[alpha-service] ✅ Got Insider trades from FMP")
          return data.map((trade: any) => ({
            ticker: trade.symbol || trade.ticker || "N/A",
            person: trade.reportingName || trade.name || trade.insider || "Unknown Insider",
            type: mapTransactionType(trade.transactionType || trade.type || "Purchase"),
            amount: formatAmount(trade.shares || trade.value || trade.price),
            date: trade.filingDate || trade.transactionDate || new Date().toISOString(),
            source: "Insider" as const,
          }))
        }
      }
    } catch (error) {
      console.warn("[alpha-service] FMP Insider trades failed, trying alternatives:", error)
    }
  }

  // Fallback: Try OpenInsider (free, but requires scraping) or SEC EDGAR
  // For now, we'll use a simple approach with SEC's public data
  try {
    // SEC EDGAR has a free API for recent insider transactions
    // This is a simplified version - you can enhance it later
    const response = await fetch(
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&company=&dateb=&owner=include&start=0&count=30&output=atom",
      {
        headers: {
          "User-Agent": "WatchCatalyst/1.0 (contact@example.com)", // SEC requires User-Agent
          Accept: "application/atom+xml",
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      },
    )

    if (response.ok) {
      const xmlText = await response.text()
      // Parse XML to extract insider trades
      // This is a basic implementation - can be enhanced
      const entries = xmlText.match(/<entry>[\s\S]*?<\/entry>/g) || []
      
      if (entries.length > 0) {
        console.log("[alpha-service] ✅ Got Insider trades from SEC EDGAR")
        return entries.slice(0, 30).map((entry: string, index: number) => {
          const titleMatch = entry.match(/<title[^>]*>([^<]+)<\/title>/)
          const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/)
          const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/)
          
          // Extract ticker and insider name from title (format: "FORM 4 - COMPANY NAME - INSIDER NAME")
          const title = titleMatch?.[1] || ""
          const parts = title.split(" - ")
          const ticker = parts[1]?.match(/\(([A-Z]+)\)/)?.[1] || "N/A"
          const person = parts[2] || "Unknown Insider"
          
          return {
            ticker,
            person,
            type: "Buy" as const, // SEC Form 4 doesn't specify, default to Buy
            amount: "See Filing",
            date: updatedMatch?.[1] || new Date().toISOString(),
            source: "Insider" as const,
          }
        })
      }
    }
  } catch (error) {
    console.warn("[alpha-service] SEC EDGAR failed:", error)
  }

  console.warn("[alpha-service] No Insider trades available from any source")
  return []
}

