/**
 * Price service for fetching live market prices
 * Uses CoinGecko for crypto (free API) and Finnhub for stocks
 */

export type PriceData = {
  symbol: string
  price: number
  change: number // 24h change percentage
}

// Common crypto symbols that should use CoinGecko
const CRYPTO_SYMBOLS = new Set([
  "BTC",
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "ADA",
  "DOGE",
  "MATIC",
  "DOT",
  "AVAX",
  "LINK",
  "UNI",
  "ATOM",
  "ALGO",
  "LTC",
  "BCH",
  "ETC",
  "XLM",
  "FIL",
  "TRX",
  "EOS",
  "AAVE",
  "MKR",
  "COMP",
  "YFI",
  "SUSHI",
  "SNX",
  "CRV",
  "1INCH",
  "GRT",
])

// Removed STOCK_BASE_PRICES - now using real Finnhub API data

/**
 * Check if a symbol is crypto
 */
function isCrypto(symbol: string): boolean {
  return CRYPTO_SYMBOLS.has(symbol.toUpperCase())
}

/**
 * Fetch crypto prices from CoinGecko
 */
async function fetchCryptoPrices(symbols: string[]): Promise<PriceData[]> {
  // CoinGecko uses lowercase IDs, map symbols to IDs
  const symbolToId: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    BNB: "binancecoin",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    MATIC: "matic-network",
    DOT: "polkadot",
    AVAX: "avalanche-2",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
    ALGO: "algorand",
    LTC: "litecoin",
    BCH: "bitcoin-cash",
    ETC: "ethereum-classic",
    XLM: "stellar",
    FIL: "filecoin",
    TRX: "tron",
    EOS: "eos",
    AAVE: "aave",
    MKR: "maker",
    COMP: "compound-governance-token",
    YFI: "yearn-finance",
    SUSHI: "sushi",
    SNX: "synthetix-network-token",
    CRV: "curve-dao-token",
    "1INCH": "1inch",
    GRT: "the-graph",
  }

  const ids = symbols.map((s) => symbolToId[s.toUpperCase()]).filter(Boolean)

  if (ids.length === 0) {
    return []
  }

  // Create abort controller for timeout (better compatibility than AbortSignal.timeout)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    // Map back to symbols
    const idToSymbol: Record<string, string> = {}
    Object.entries(symbolToId).forEach(([symbol, id]) => {
      idToSymbol[id] = symbol
    })

    return Object.entries(data)
      .map(([id, priceData]: [string, any]) => {
        const symbol = idToSymbol[id]
        if (!symbol || !priceData.usd) return null

        return {
          symbol,
          price: priceData.usd,
          change: priceData.usd_24h_change || 0,
        }
      })
      .filter((item): item is PriceData => item !== null)
  } catch (error) {
    clearTimeout(timeoutId)
    console.error("[price-service] Failed to fetch crypto prices:", error)
    // Return empty array on error, caller can handle it
    return []
  }
}

/**
 * Fetch stock price from Finnhub API
 * @param symbol Stock symbol (e.g., "AAPL", "TSLA")
 * @returns PriceData or null if fetch fails
 */
async function fetchFinnhubPrice(symbol: string): Promise<PriceData | null> {
  const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY

  if (!apiKey) {
    console.warn("[price-service] Finnhub API key not configured. Stock prices will not be available.")
    return null
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Rate limit or API error
      if (response.status === 429) {
        console.warn(`[price-service] Finnhub rate limit reached for ${symbol}`)
      } else {
        console.error(`[price-service] Finnhub API error for ${symbol}: ${response.status}`)
      }
      return null
    }

    const data = await response.json()

    // Finnhub returns { c: current, dp: percent_change, ... }
    // Check if we have valid data
    if (data.c == null || data.dp == null) {
      console.warn(`[price-service] Invalid data from Finnhub for ${symbol}:`, data)
      return null
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.c, // current price
      change: data.dp, // percent change (already in percentage format)
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[price-service] Timeout fetching price for ${symbol}`)
    } else {
      console.error(`[price-service] Failed to fetch price for ${symbol}:`, error)
    }
    return null
  }
}

/**
 * Fetch stock prices from Finnhub
 * Fetches sequentially with small delay to respect rate limits
 * @param symbols Array of stock symbols
 * @returns Array of PriceData (only successful fetches)
 */
async function fetchStockPrices(symbols: string[]): Promise<PriceData[]> {
  if (symbols.length === 0) {
    return []
  }

  const results: PriceData[] = []

  // Fetch sequentially with small delay to avoid rate limits
  for (const symbol of symbols) {
    const priceData = await fetchFinnhubPrice(symbol)
    if (priceData) {
      results.push(priceData)
    }

    // Small delay between requests to respect rate limits (especially for free tier)
    if (symbols.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 200)) // 200ms delay
    }
  }

  return results
}

/**
 * Get market prices for a list of symbols
 * @param symbols Array of asset symbols (e.g., ["BTC", "ETH", "AAPL"])
 * @returns Promise with price data array
 */
export async function getMarketPrices(symbols: string[]): Promise<PriceData[]> {
  if (symbols.length === 0) {
    return []
  }

  // Separate crypto and stocks
  const cryptoSymbols: string[] = []
  const stockSymbols: string[] = []

  symbols.forEach((symbol) => {
    if (isCrypto(symbol)) {
      cryptoSymbols.push(symbol)
    } else {
      stockSymbols.push(symbol)
    }
  })

  // Fetch crypto prices from CoinGecko
  const cryptoPrices = await fetchCryptoPrices(cryptoSymbols)

  // Fetch stock prices from Finnhub
  const stockPrices = await fetchStockPrices(stockSymbols)

  // Combine and return
  return [...cryptoPrices, ...stockPrices]
}

