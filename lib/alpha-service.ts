/**
 * Alpha Tracker Service
 * Fetches real insider and politician trading data from FMP API
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
 * Fetch politician trades (Senate) from FMP API
 */
export async function getPoliticianTrades(): Promise<AlphaTrade[]> {
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    console.warn("[alpha-service] FMP API key not configured. Politician trades will not be available.")
    return []
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/senate-trading?limit=30&apikey=${apiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      if (response.status === 403) {
        console.warn("[alpha-service] FMP Free Tier limit hit - upgrades required for this data")
        return []
      }
      console.error(`[alpha-service] FMP API error for Senate trades: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      console.warn("[alpha-service] Invalid response format from FMP Senate API")
      return []
    }

    return data.map((trade: any) => ({
      ticker: trade.symbol || trade.ticker || "N/A",
      person: trade.senator || trade.representative || trade.firstName + " " + trade.lastName || "Unknown",
      type: mapTransactionType(trade.transaction || trade.type || "Purchase"),
      amount: formatAmount(trade.amount || trade.price),
      date: trade.transactionDate || trade.filingDate || new Date().toISOString(),
      source: "Senate" as const,
    }))
  } catch (error) {
    console.error("[alpha-service] Failed to fetch politician trades:", error)
    return []
  }
}

/**
 * Fetch insider trades (Corporate Insiders) from FMP API
 */
export async function getInsiderTrades(): Promise<AlphaTrade[]> {
  const apiKey = process.env.FMP_API_KEY

  if (!apiKey) {
    console.warn("[alpha-service] FMP API key not configured. Insider trades will not be available.")
    return []
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v4/insider-trading?limit=30&apikey=${apiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      if (response.status === 403) {
        console.warn("[alpha-service] FMP Free Tier limit hit - upgrades required for this data")
        return []
      }
      console.error(`[alpha-service] FMP API error for Insider trades: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      console.warn("[alpha-service] Invalid response format from FMP Insider API")
      return []
    }

    return data.map((trade: any) => ({
      ticker: trade.symbol || trade.ticker || "N/A",
      person: trade.reportingName || trade.name || trade.insider || "Unknown Insider",
      type: mapTransactionType(trade.transactionType || trade.type || "Purchase"),
      amount: formatAmount(trade.shares || trade.value || trade.price),
      date: trade.filingDate || trade.transactionDate || new Date().toISOString(),
      source: "Insider" as const,
    }))
  } catch (error) {
    console.error("[alpha-service] Failed to fetch insider trades:", error)
    return []
  }
}

