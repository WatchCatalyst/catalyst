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
 * Fetch politician trades (Senate) - uses our working API endpoint
 */
export async function getPoliticianTrades(): Promise<AlphaTrade[]> {
  try {
    // Use our own API endpoint that works with Quiver/FMP
    const response = await fetch('/api/congress/trades?chamber=senate', {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // Cache 5 minutes
    })

    if (!response.ok) {
      console.warn("[alpha-service] Congress trades API returned:", response.status)
      return []
    }

    const data = await response.json()

    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
      console.log("[alpha-service] ✅ Got Senate trades from API:", data.data.length)
      return data.data.slice(0, 30).map((trade: any) => ({
        ticker: trade.ticker || "N/A",
        person: trade.representative || trade.owner || "Unknown Senator",
        type: trade.type === "buy" ? "Buy" : "Sell",
        amount: trade.amount || "Unknown",
        date: trade.transactionDate || trade.disclosureDate || new Date().toISOString(),
        source: "Senate" as const,
      }))
    }

    console.warn("[alpha-service] No Senate trades in API response")
    return []
  } catch (error) {
    console.error("[alpha-service] Error fetching Senate trades:", error)
    return []
  }
}

/**
 * Fetch insider trades (Corporate Insiders) - uses FMP API if available
 */
export async function getInsiderTrades(): Promise<AlphaTrade[]> {
  // Try FMP API (if available and has insider trading access)
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
          console.log("[alpha-service] ✅ Got Insider trades from FMP:", data.length)
          return data.map((trade: any) => ({
            ticker: trade.symbol || trade.ticker || "N/A",
            person: trade.reportingName || trade.name || trade.insider || "Unknown Insider",
            type: mapTransactionType(trade.transactionType || trade.type || "Purchase"),
            amount: formatAmount(trade.shares || trade.value || trade.price),
            date: trade.filingDate || trade.transactionDate || new Date().toISOString(),
            source: "Insider" as const,
          }))
        }
      } else if (response.status === 403 || response.status === 401) {
        console.warn("[alpha-service] FMP Insider trading not available on your plan")
      }
    } catch (error) {
      console.warn("[alpha-service] FMP Insider trades failed:", error)
    }
  }

  // If no FMP or no access, return empty array (better than showing broken links)
  console.warn("[alpha-service] No Insider trades available - FMP API key not configured or plan doesn't include insider trading")
  return []
}

