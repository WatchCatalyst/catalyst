import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    // Check if crypto or stock
    const cryptoSymbols = [
      "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX",
      "LINK", "UNI", "ATOM", "ALGO", "LTC", "BCH", "ETC", "XLM", "FIL", "TRX",
    ]
    const isCrypto = cryptoSymbols.includes(symbol.toUpperCase())

    if (isCrypto) {
      // Fetch from Binance.US (required for US IPs)
      const formattedSymbol = `${symbol.toUpperCase()}USD`
      const url = `https://api.binance.us/api/v3/klines?symbol=${formattedSymbol}&interval=1d&limit=100`

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[API] Binance.US error for ${symbol}:`, response.status, response.statusText)
        return NextResponse.json(
          { error: `Binance.US API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }

      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ error: "Empty data from Binance" }, { status: 404 })
      }

      // Map Binance format to our format
      const result = data.map((d: any[]) => ({
        time: new Date(d[0]).toISOString().split('T')[0], // YYYY-MM-DD
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }))

      return NextResponse.json({ data: result })
    } else {
      // Fetch from Finnhub for stocks
      const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY

      if (!apiKey) {
        return NextResponse.json(
          { error: "Finnhub API key not configured" },
          { status: 500 }
        )
      }

      const endTime = Math.floor(Date.now() / 1000)
      const startTime = endTime - 100 * 24 * 60 * 60 // 100 days ago

      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${startTime}&to=${endTime}&token=${apiKey}`

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Finnhub API error: ${response.status}` },
          { status: response.status }
        )
      }

      const data = await response.json()

      if (data.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) {
        return NextResponse.json({ error: "Empty data from Finnhub" }, { status: 404 })
      }

      const result = []
      for (let i = 0; i < data.c.length; i++) {
        const timestamp = data.t[i] * 1000
        const date = new Date(timestamp)
        const timeStr = date.toISOString().split("T")[0]

        result.push({
          time: timeStr,
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
        })
      }

      return NextResponse.json({ data: result })
    }
  } catch (error: any) {
    console.error(`❌ [API] Chart fetch error for ${symbol}:`, error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch chart data" },
      { status: 500 }
    )
  }
}

