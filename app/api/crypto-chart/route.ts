import { NextRequest, NextResponse } from "next/server"

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

const TIMEFRAME_LIMITS: Record<Timeframe, number> = {
  "1m": 500,
  "5m": 288,
  "15m": 192,
  "1h": 168,
  "4h": 180,
  "1d": 365,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.toUpperCase() || "BTC"
  const interval = (searchParams.get("interval") as Timeframe) || "15m"

  // Validate symbol
  const validSymbols = ["BTC", "ETH", "SOL"]
  if (!validSymbols.includes(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 })
  }

  // Validate interval
  const validIntervals: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"]
  if (!validIntervals.includes(interval)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 })
  }

  const binanceSymbol = `${symbol}USDT`
  const limit = TIMEFRAME_LIMITS[interval]

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 10 }, // Cache for 10 seconds
    })

    if (!response.ok) {
      console.error(`[Crypto Chart API] Binance error: ${response.status}`)
      return NextResponse.json(
        { error: `Binance API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid response from Binance" }, { status: 500 })
    }

    // Transform Binance kline data to our format
    const candles = data.map((kline: any[]) => ({
      time: Math.floor(kline[0] / 1000), // Convert ms to seconds
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    }))

    return NextResponse.json({
      success: true,
      symbol: binanceSymbol,
      interval,
      data: candles,
    })
  } catch (error) {
    console.error("[Crypto Chart API] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    )
  }
}
