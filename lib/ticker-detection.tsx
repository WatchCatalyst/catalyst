export type Ticker = {
  symbol: string
  type: "crypto" | "stock"
  fullMatch: string
}

const CRYPTO_TICKERS = new Set([
  "BTC", "ETH", "SOL", "ADA", "DOT", "DOGE", "SHIB", "XRP", "MATIC", "AVAX",
  "LINK", "UNI", "AAVE", "ATOM", "ALGO", "FTM", "NEAR", "APT", "ARB", "OP"
])

const STOCK_TICKERS = new Set([
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "AMD", "NFLX",
  "DIS", "V", "MA", "JPM", "BAC", "WMT", "PG", "KO", "PEP", "NKE", "COST"
])

export function detectTickers(text: string): Ticker[] {
  const tickerRegex = /\$([A-Z]{1,5})\b/g
  const tickers: Ticker[] = []
  let match

  while ((match = tickerRegex.exec(text)) !== null) {
    const symbol = match[1]
    const type = CRYPTO_TICKERS.has(symbol) ? "crypto" : STOCK_TICKERS.has(symbol) ? "stock" : "stock"
    tickers.push({
      symbol,
      type,
      fullMatch: match[0]
    })
  }

  return tickers
}

export function linkifyTickers(text: string): React.ReactNode[] {
  const tickers = detectTickers(text)
  if (tickers.length === 0) return [text]

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  tickers.forEach((ticker, index) => {
    const tickerIndex = text.indexOf(ticker.fullMatch, lastIndex)
    if (tickerIndex > lastIndex) {
      parts.push(text.substring(lastIndex, tickerIndex))
    }

    const tradingViewUrl = ticker.type === "crypto" 
      ? `https://www.tradingview.com/symbols/${ticker.symbol}USD/`
      : `https://www.tradingview.com/symbols/${ticker.symbol}/`

    parts.push(
      <a
        key={`ticker-${index}`}
        href={tradingViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-bright hover:underline font-semibold"
        onClick={(e) => e.stopPropagation()}
      >
        {ticker.fullMatch}
      </a>
    )

    lastIndex = tickerIndex + ticker.fullMatch.length
  })

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}
