"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts"
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react"

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

type LiveCryptoChartProps = {
  symbol: "BTC" | "ETH" | "SOL"
  onPriceUpdate?: (price: number, change: number) => void
}

const TIMEFRAMES: { label: string; value: Timeframe; limit: number }[] = [
  { label: "1m", value: "1m", limit: 500 },
  { label: "5m", value: "5m", limit: 288 },
  { label: "15m", value: "15m", limit: 192 },
  { label: "1H", value: "1h", limit: 168 },
  { label: "4H", value: "4h", limit: 180 },
  { label: "1D", value: "1d", limit: 365 },
]

const SYMBOL_COLORS: Record<string, { up: string; down: string; accent: string }> = {
  BTC: { up: "#f7931a", down: "#ef4444", accent: "orange" },
  ETH: { up: "#38bdf8", down: "#ef4444", accent: "sky" },
  SOL: { up: "#2dd4bf", down: "#ef4444", accent: "teal" },
}

export function LiveCryptoChart({ symbol, onPriceUpdate }: LiveCryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>("15m")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [highPrice, setHighPrice] = useState<number | null>(null)
  const [lowPrice, setLowPrice] = useState<number | null>(null)
  const lastCandleRef = useRef<CandlestickData | null>(null)

  const colors = SYMBOL_COLORS[symbol] || SYMBOL_COLORS.BTC
  const binanceSymbol = `${symbol.toUpperCase()}USDT`

  // Fetch historical data via our API route (avoids CORS)
  const fetchHistoricalData = useCallback(async (tf: Timeframe) => {
    const url = `/api/crypto-chart?symbol=${symbol}&interval=${tf}`
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "No data returned")
      }
      
      return result.data.map((candle: any): CandlestickData => ({
        time: candle.time as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    } catch (err) {
      console.error("[LiveChart] Failed to fetch historical data:", err)
      throw err
    }
  }, [symbol])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6b7280",
        fontFamily: "'JetBrains Mono', monospace",
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1f2937",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#1f2937",
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === "1m",
        borderColor: "rgba(255, 255, 255, 0.05)",
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.05)",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    chartRef.current = chart

    // Create candlestick series with symbol-specific colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [timeframe])

  // Load data and connect WebSocket
  useEffect(() => {
    if (!seriesRef.current) return

    let ws: WebSocket | null = null
    let mounted = true

    async function loadDataAndConnect() {
      setLoading(true)
      setError(null)

      try {
        // Fetch historical data
        const historicalData = await fetchHistoricalData(timeframe)
        
        if (!mounted || !seriesRef.current) return

        seriesRef.current.setData(historicalData)
        
        // Calculate stats from data
        if (historicalData.length > 0) {
          const lastCandle = historicalData[historicalData.length - 1]
          lastCandleRef.current = lastCandle
          setCurrentPrice(lastCandle.close)
          
          // Calculate high/low from visible data
          const high = Math.max(...historicalData.map((c: CandlestickData) => c.high))
          const low = Math.min(...historicalData.map((c: CandlestickData) => c.low))
          setHighPrice(high)
          setLowPrice(low)
          
          // Calculate change
          const firstCandle = historicalData[0]
          const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
          setPriceChange(change)
          
          if (onPriceUpdate) {
            onPriceUpdate(lastCandle.close, change)
          }
        }

        // Fit content
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }

        setLoading(false)

        // Connect to Binance WebSocket for real-time updates
        // Try Binance.US first for US users
        const wsUrls = [
          `wss://stream.binance.us:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`,
          `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`,
        ]

        for (const wsUrl of wsUrls) {
          try {
            ws = new WebSocket(wsUrl)
            wsRef.current = ws

            await new Promise<void>((resolve, reject) => {
              ws!.onopen = () => {
                console.log(`[LiveChart] WebSocket connected: ${wsUrl}`)
                resolve()
              }
              ws!.onerror = () => reject(new Error("WebSocket failed"))
              setTimeout(() => reject(new Error("WebSocket timeout")), 5000)
            })

            break // Successfully connected
          } catch (err) {
            console.warn(`[LiveChart] WebSocket failed for ${wsUrl}`)
            ws?.close()
            ws = null
          }
        }

        if (ws) {
          ws.onmessage = (event) => {
            if (!mounted || !seriesRef.current) return

            try {
              const data = JSON.parse(event.data)
              const kline = data.k

              if (!kline) return

              const candle: CandlestickData = {
                time: (kline.t / 1000) as any,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
              }

              // Update the chart
              seriesRef.current.update(candle)
              lastCandleRef.current = candle
              setCurrentPrice(candle.close)

              // Update price change
              if (onPriceUpdate) {
                onPriceUpdate(candle.close, priceChange)
              }
            } catch (err) {
              console.error("[LiveChart] WebSocket message error:", err)
            }
          }

          ws.onclose = () => {
            console.log("[LiveChart] WebSocket closed")
          }
        }

      } catch (err) {
        if (mounted) {
          setError("Failed to load chart data")
          setLoading(false)
        }
      }
    }

    loadDataAndConnect()

    return () => {
      mounted = false
      if (ws) {
        ws.close()
        wsRef.current = null
      }
    }
  }, [timeframe, binanceSymbol, symbol, fetchHistoricalData, onPriceUpdate, priceChange])

  // Format price based on symbol
  const formatPrice = (price: number) => {
    if (symbol === "BTC") {
      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else if (symbol === "ETH") {
      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else {
      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
  }

  return (
    <div className="w-full">
      {/* Header with price and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Left: Price info */}
        <div className="flex items-center gap-6">
          {/* Main price */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
                ${currentPrice ? formatPrice(currentPrice) : "---"}
              </span>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                priceChange >= 0 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-red-500/10 text-red-400"
              }`}>
                {priceChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-semibold font-mono">
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{symbol}/USDT</span>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* High/Low stats */}
          <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-white/10">
            <div>
              <span className="text-xs text-muted-foreground block">24h High</span>
              <span className="text-sm font-mono text-green-400">
                ${highPrice ? formatPrice(highPrice) : "---"}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">24h Low</span>
              <span className="text-sm font-mono text-red-400">
                ${lowPrice ? formatPrice(lowPrice) : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Timeframe selector */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                timeframe === tf.value 
                  ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-3" />
            <span className="text-sm text-muted-foreground">Loading chart data...</span>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <p className="text-red-500 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Chart */}
        <div ref={chartContainerRef} className="w-full" style={{ height: "420px" }} />
        
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-950/50 to-transparent pointer-events-none" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Data: Binance</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Real-time updates via WebSocket
        </span>
      </div>
    </div>
  )
}
