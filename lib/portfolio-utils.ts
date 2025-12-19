import type { NewsItem } from "@/app/page"
import { detectTickers } from "./ticker-detection"

export type PortfolioAsset = {
  symbol: string
  type: "crypto" | "stock"
  quantity?: number
  avgPrice?: number
  notes?: string
}

// Company name to ticker mapping for better matching
const COMPANY_NAME_MAP: Record<string, string[]> = {
  AAPL: ["apple", "apple inc", "apple computer"],
  MSFT: ["microsoft", "msft"],
  GOOGL: ["google", "alphabet"],
  GOOG: ["google", "alphabet"],
  AMZN: ["amazon"],
  TSLA: ["tesla", "tesla motors"],
  META: ["facebook", "meta platforms", "meta"],
  NVDA: ["nvidia"],
  AMD: ["advanced micro devices", "amd"],
  INTC: ["intel"],
  BTC: ["bitcoin"],
  ETH: ["ethereum"],
  SOL: ["solana"],
  BNB: ["binance", "binance coin"],
  XRP: ["ripple", "xrp"],
  ADA: ["cardano"],
  DOGE: ["dogecoin", "doge"],
  MATIC: ["polygon", "matic"],
  DOT: ["polkadot"],
  AVAX: ["avalanche"],
}

/**
 * Check if an article is relevant to any asset in the user's portfolio
 * @param article - The news article to check
 * @param portfolio - Array of portfolio assets (symbols)
 * @returns true if article mentions any portfolio holding
 */
export function isPortfolioMatch(article: NewsItem, portfolio: PortfolioAsset[]): boolean {
  if (portfolio.length === 0) return false

  // Combine all text fields for searching
  const searchText = `${article.title} ${article.summary || ""} ${(article.keywords || []).join(" ")}`.toUpperCase()

  // Check each portfolio asset
  for (const asset of portfolio) {
    const symbol = asset.symbol.toUpperCase()

    // Direct ticker match (with $ prefix or standalone)
    if (searchText.includes(`$${symbol}`) || searchText.includes(` ${symbol} `) || searchText.includes(` ${symbol},`)) {
      return true
    }

    // Company name mapping match
    const companyNames = COMPANY_NAME_MAP[symbol] || []
    for (const name of companyNames) {
      if (searchText.includes(name.toUpperCase())) {
        return true
      }
    }

    // Ticker detection fallback (handles various formats)
    const detectedTickers = detectTickers(`${article.title} ${article.summary || ""}`)
    if (detectedTickers.some((t) => t.symbol.toUpperCase() === symbol)) {
      return true
    }
  }

  return false
}

