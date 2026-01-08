/**
 * Chart Service for fetching candlestick/OHLC data
 * Uses Finnhub for stocks and Binance for crypto
 */

export type CandlestickData = {
  time: string // Date string in 'YYYY-MM-DD' format
  open: number
  high: number
  low: number
  close: number
}

/**
 * Check if a symbol is crypto
 */
function isCrypto(symbol: string): boolean {
  const cryptoSymbols = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX",
    "LINK", "UNI", "ATOM", "ALGO", "LTC", "BCH", "ETC", "XLM", "FIL", "TRX",
  ]
  return cryptoSymbols.includes(symbol.toUpperCase())
}

/**
 * Fetch stock candlestick data from Finnhub via our API route
 */
async function fetchStockChartData(symbol: string): Promise<CandlestickData[]> {
  try {
    // Use our server-side API route which handles Finnhub API key securely
    const response = await fetch(
      `/api/chart?symbol=${symbol.toUpperCase()}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      console.error(`[chart-service] API error for ${symbol}: ${response.status}`)
      return []
    }

    const result = await response.json()

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.warn(`[chart-service] Invalid or empty data from API for ${symbol}`)
      return []
    }

    return result.data
  } catch (error) {
    console.error(`[chart-service] Failed to fetch stock chart data for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch crypto candlestick data from Binance Public API (free, no key required)
 */
async function fetchBinanceCandles(symbol: string): Promise<CandlestickData[]> {
  // Format symbol: "BTC" -> "BTCUSDT", "SOL" -> "SOLUSDT"
  const formattedSymbol = `${symbol.toUpperCase()}USDT`
  const url = `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=1d&limit=100`
  
  console.log("🔍 Attempting Binance Fetch:", url)

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Binance HTTP Error:", response.status, response.statusText)
      console.error(`[chart-service] Binance API error for ${symbol} (${formattedSymbol}): ${response.status} ${response.statusText}`)
      console.error("Response body:", errorText.substring(0, 200))
      return []
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      console.error(`[chart-service] Invalid response format from Binance for ${symbol} (${formattedSymbol}):`, data)
      return []
    }

    if (data.length === 0) {
      console.warn(`[chart-service] Empty data from Binance for ${symbol} (${formattedSymbol})`)
      return []
    }

    // Binance returns: [[timestamp, open, high, low, close, volume, ...], ...]
    // Map to our format
    const result: CandlestickData[] = data.map((d: any[]) => {
      if (!Array.isArray(d) || d.length < 5) {
        console.warn(`[chart-service] Invalid candle data format:`, d)
        return null
      }
      return {
        time: new Date(d[0]).toISOString().split('T')[0], // YYYY-MM-DD
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }
    }).filter((item): item is CandlestickData => item !== null)

    if (result.length === 0) {
      console.warn(`[chart-service] No valid candles after parsing for ${symbol} (${formattedSymbol})`)
      return []
    }

    console.log(`✅ Binance Fetch Success: ${symbol} -> ${result.length} candles`)
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`❌ [chart-service] Binance request timeout for ${symbol} (${formattedSymbol})`)
    } else {
      console.error(`❌ [chart-service] Failed to fetch crypto chart data from Binance for ${symbol} (${formattedSymbol}):`, error)
    }
    return []
  }
}

/**
 * Get chart data for a symbol (stocks or crypto)
 * Uses Next.js API route to avoid CORS issues
 */
export async function getChartData(symbol: string): Promise<CandlestickData[]> {
  if (!symbol) {
    return []
  }

  try {
    const url = `/api/chart?symbol=${encodeURIComponent(symbol)}`
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error(`[chart-service] API route error for ${symbol}:`, response.status)
      return []
    }

    const result = await response.json()
    
    if (!result.data || !Array.isArray(result.data)) {
      return []
    }

    return result.data
  } catch (error: any) {
    console.error(`[chart-service] getChartData failed for ${symbol}:`, error)
    return []
  }
}

