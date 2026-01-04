/**
 * Centralized API Configuration
 * 
 * This file centralizes all API configurations, endpoints, and environment variable references.
 * Use this file to manage API keys and endpoints in one place.
 */

// ============================================================================
// API KEY CONFIGURATION
// ============================================================================

export const API_KEYS = {
  /** EODHD - Financial news, earnings, IPOs, splits ($19.99/month) */
  EODHD: process.env.EODHD_API_KEY || "",
  
  /** Financial Modeling Prep - Financial data ($29/month Starter plan) */
  FMP: process.env.FMP_API_KEY || "",
  
  /** Finnhub - Stock prices & charts (Free tier or $9/month Starter) */
  FINNHUB: process.env.NEXT_PUBLIC_FINNHUB_API_KEY || "",
  
  /** Quiver Quantitative - Congressional trades, insider trading ($10/month Hobbyist) */
  QUIVER: process.env.QUIVER_API_KEY || "",
  
  /** OpenAI via Vercel AI Gateway - AI analysis (Pay-as-you-go) */
  // No explicit key needed - uses Vercel AI Gateway by default
} as const

// ============================================================================
// API BASE URLS
// ============================================================================

export const API_BASE_URLS = {
  EODHD: "https://eodhd.com",
  FMP: "https://financialmodelingprep.com",
  FINNHUB: "https://finnhub.io",
  QUIVER: "https://api.quiverquant.com",
  COINGECKO: "https://api.coingecko.com",
  BINANCE: "https://api.binance.com",
  BINANCE_US: "https://api.binance.us",
  STOCKTWITS: "https://api.stocktwits.com",
} as const

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // EODHD
  EODHD: {
    NEWS: "/api/news",
    EARNINGS: "/api/calendar/earnings",
    IPOS: "/api/calendar/ipos",
    SPLITS: "/api/calendar/splits",
  },
  
  // Financial Modeling Prep (FMP)
  FMP: {
    // Economic Calendar
    ECONOMIC_CALENDAR_STABLE: "/stable/economic-calendar",
    ECONOMIC_CALENDAR_V3: "/api/v3/economic_calendar",
    
    // Earnings
    EARNINGS_CALENDAR_STABLE: "/stable/earnings-calendar",
    EARNINGS_CALENDAR_V3: "/api/v3/earnings_calendar",
    
    // Analyst Ratings
    RATINGS_STABLE: "/stable/ratings",
    RATINGS_V3: "/api/v3/ratings",
    
    // SEC Filings
    SEC_FILINGS: "/api/v3/sec-filings",
    
    // Congressional Trades
    SENATE_TRADING: "/api/v4/senate-trading",
    HOUSE_DISCLOSURE: "/api/v4/senate-disclosure",
    INSIDER_TRADING: "/api/v4/insider-trading",
    
    // Stock News
    STOCK_NEWS_STABLE: "/stable/stock-news",
    STOCK_NEWS_V3: "/api/v3/stock_news",
    NEWS_STABLE: "/stable/news",
    MARKET_NEWS_STABLE: "/stable/market-news",
  },
  
  // Finnhub
  FINNHUB: {
    QUOTE: "/api/v1/quote",
    STOCK_CANDLE: "/api/v1/stock/candle",
  },
  
  // CoinGecko
  COINGECKO: {
    SIMPLE_PRICE: "/api/v3/simple/price",
    COINS_MARKETS: "/api/v3/coins/markets",
  },
  
  // Binance
  BINANCE: {
    KLINES: "/api/v3/klines",
  },
  
  // Stocktwits
  STOCKTWITS: {
    STREAM_SYMBOL: "/api/2/streams/symbol",
  },
  
  // Quiver Quantitative
  QUIVER: {
    LIVE_CONGRESS_TRADING: "/beta/live/congresstrading",
    RECENT_SENATE_TRADING: "/beta/recent/senatetrading",
    RECENT_HOUSE_TRADING: "/beta/recent/housetrading",
    // Alternative endpoint formats to try
    V1_CONGRESS_TRADING: "/v1/congress/trading",
    V1_SENATE_TRADING: "/v1/senatetrading",
    V1_HOUSE_TRADING: "/v1/housetrading",
    HISTORICAL_CONGRESS_TRADING: "/beta/historical/congresstrading",
    HISTORICAL_SENATE_TRADING: "/beta/historical/senatetrading",
    HISTORICAL_HOUSE_TRADING: "/beta/historical/housetrading",
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if an API key is configured
 */
export function isApiKeyConfigured(key: keyof typeof API_KEYS): boolean {
  return !!API_KEYS[key]
}

/**
 * Get full URL for an FMP endpoint
 */
export function getFmpUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URLS.FMP}${endpoint}`)
  if (API_KEYS.FMP) {
    url.searchParams.set("apikey", API_KEYS.FMP)
  }
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

/**
 * Get full URL for a Finnhub endpoint
 */
export function getFinnhubUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URLS.FINNHUB}${endpoint}`)
  if (API_KEYS.FINNHUB) {
    url.searchParams.set("token", API_KEYS.FINNHUB)
  }
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

/**
 * Get full URL for EODHD endpoint
 */
export function getEodhdUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URLS.EODHD}${endpoint}`)
  if (API_KEYS.EODHD) {
    url.searchParams.set("api_token", API_KEYS.EODHD)
  }
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

/**
 * Get full URL for Quiver Quantitative endpoint
 * Note: API key should be passed via Authorization header, but we also support query param as fallback
 */
export function getQuiverUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${API_BASE_URLS.QUIVER}${endpoint}`)
  // Some APIs use query param auth as fallback
  if (API_KEYS.QUIVER && !params?.token && !params?.apikey) {
    // Don't add to URL - use header instead (see fetch calls)
  }
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

// ============================================================================
// API STATUS CHECKS
// ============================================================================

export type ApiStatus = {
  configured: boolean
  name: string
  cost: string
  status: "ok" | "error" | "unknown"
}

/**
 * Get status of all APIs
 */
export function getApiStatuses(): Record<string, ApiStatus> {
  return {
    eodhd: {
      configured: isApiKeyConfigured("EODHD"),
      name: "EODHD",
      cost: "$19.99/month",
      status: isApiKeyConfigured("EODHD") ? "ok" : "error",
    },
    fmp: {
      configured: isApiKeyConfigured("FMP"),
      name: "Financial Modeling Prep",
      cost: "$29/month",
      status: isApiKeyConfigured("FMP") ? "ok" : "error",
    },
    finnhub: {
      configured: isApiKeyConfigured("FINNHUB"),
      name: "Finnhub",
      cost: "Free tier or $9/month",
      status: isApiKeyConfigured("FINNHUB") ? "ok" : "error",
    },
    coingecko: {
      configured: true, // No key required
      name: "CoinGecko",
      cost: "Free (rate limited)",
      status: "ok",
    },
    binance: {
      configured: true, // No key required for public API
      name: "Binance",
      cost: "Free (public API)",
      status: "ok",
    },
    stocktwits: {
      configured: true, // No key required for basic usage
      name: "Stocktwits",
      cost: "Free (rate limited)",
      status: "ok",
    },
    quiver: {
      configured: isApiKeyConfigured("QUIVER"),
      name: "Quiver Quantitative",
      cost: "$10/month (Hobbyist)",
      status: isApiKeyConfigured("QUIVER") ? "ok" : "error",
    },
    openai: {
      configured: true, // Uses Vercel AI Gateway
      name: "OpenAI (via Vercel AI Gateway)",
      cost: "Pay-as-you-go",
      status: "ok",
    },
  }
}
