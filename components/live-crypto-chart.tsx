"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d"

type LiveCryptoChartProps = {
  symbol: "BTC" | "ETH" | "SOL"
  onPriceUpdate?: (price: number, change: number) => void
}

type BinanceKline = [
  number,  // Open time
  string,  // Open
  string,  // High
  string,  // Low
  string,  // Close
  string,  // Volume
  number,  // Close time
  string,  // Quote asset volume
  number,  // Number of trades
  string,  // Taker buy base asset volume
  string,  // Taker buy quote asset volume
  string   // Ignore
]

const TIMEFRAMES: { label: string; value: Timeframe; limit: number }[] = [
  { label: "1m", value: "1m", limit: 500 },
  { label: "5m", value: "5m", limit: 288 },
  { label: "15m", value: "15m", limit: 192 },
  { label: "1H", value: "1h", limit: 168 },
  { label: "4H", value: "4h", limit: 180 },
  { label: "1D", value: "1d", limit: 365 },
]

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
  const lastCandleRef = useRef<CandlestickData | null>(null)

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
        textColor: "#9ca3af",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(0, 212, 255, 0.4)",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: "rgba(0, 212, 255, 0.4)",
          width: 1,
          style: 2,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframe === "1m",
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
    })

    chartRef.current = chart

    // Create candlestick series
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
        
        // Set initial price from last candle
        if (historicalData.length > 0) {
          const lastCandle = historicalData[historicalData.length - 1]
          lastCandleRef.current = lastCandle
          setCurrentPrice(lastCandle.close)
          
          // Calculate 24h change
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
        const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol.toLowerCase()}@kline_${timeframe}`
        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log(`[LiveChart] WebSocket connected for ${symbol} ${timeframe}`)
        }

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

        ws.onerror = (err) => {
          console.error("[LiveChart] WebSocket error:", err)
        }

        ws.onclose = () => {
          console.log("[LiveChart] WebSocket closed")
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
      {/* Header with price and timeframe selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{symbol}/USDT</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-500">LIVE</span>
              </div>
            </div>
            {currentPrice && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-mono">${formatPrice(currentPrice)}</span>
                <span className={`text-sm font-semibold ${priceChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeframe(tf.value)}
              className={`text-xs px-3 ${
                timeframe === tf.value 
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative rounded-lg border border-white/10 bg-black/20 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" style={{ height: "400px" }} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>Data: Binance</span>
        <span>Updates in real-time via WebSocket</span>
      </div>
    </div>
  )
}
