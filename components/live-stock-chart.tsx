"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts"
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react"

type LiveStockChartProps = {
  symbol: string // e.g., "AAPL", "TSLA", "NVDA"
  onPriceUpdate?: (price: number, change: number) => void
}

const STOCK_COLORS: Record<string, { up: string; down: string; accent: string }> = {
  AAPL: { up: "#22c55e", down: "#ef4444", accent: "emerald" },
  TSLA: { up: "#fbbf24", down: "#ef4444", accent: "amber" },
  NVDA: { up: "#8b5cf6", down: "#ef4444", accent: "violet" },
  MSFT: { up: "#06b6d4", down: "#ef4444", accent: "cyan" },
  GOOGL: { up: "#3b82f6", down: "#ef4444", accent: "blue" },
  META: { up: "#6366f1", down: "#ef4444", accent: "indigo" },
  AMZN: { up: "#f59e0b", down: "#ef4444", accent: "orange" },
}

export function LiveStockChart({ symbol, onPriceUpdate }: LiveStockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [highPrice, setHighPrice] = useState<number | null>(null)
  const [lowPrice, setLowPrice] = useState<number | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const colors = STOCK_COLORS[symbol] || STOCK_COLORS.AAPL

  // Fetch historical data via our API route
  const fetchHistoricalData = useCallback(async () => {
    const url = `/api/chart?symbol=${symbol}`
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const result = await response.json()
      
      if (result.error || !result.data || result.data.length === 0) {
        throw new Error(result.error || "No chart data available")
      }
      
      // The API returns { data: [...] } format
      const chartData = result.data
      
      return chartData.map((candle: any): CandlestickData => ({
        time: candle.time as any,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    } catch (err) {
      console.error("[StockChart] Failed to fetch data:", err)
      throw err
    }
  }, [symbol])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

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
        borderColor: "rgba(255, 255, 255, 0.05)",
        barSpacing: 6,
        rightOffset: 12,
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

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    })

    seriesRef.current = candlestickSeries

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
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Load data and setup polling
  useEffect(() => {
    if (!seriesRef.current) return

    let mounted = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const historicalData = await fetchHistoricalData()
        
        if (!mounted || !seriesRef.current) return

        seriesRef.current.setData(historicalData)
        
        if (historicalData.length > 0) {
          const lastCandle = historicalData[historicalData.length - 1]
          setCurrentPrice(lastCandle.close)
          
          // Calculate high/low from visible period
          const visibleData = historicalData.slice(-30) // Last 30 days
          const high = Math.max(...visibleData.map((c: CandlestickData) => c.high))
          const low = Math.min(...visibleData.map((c: CandlestickData) => c.low))
          setHighPrice(high)
          setLowPrice(low)
          
          // Calculate change from period start to end
          if (historicalData.length > 1) {
            const firstCandle = historicalData[0]
            const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
            setPriceChange(change)
            
            if (onPriceUpdate) {
              onPriceUpdate(lastCandle.close, change)
            }
          }
        }

        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }

        setLoading(false)

        // Poll for updates every 30 seconds (stocks update less frequently than crypto)
        pollIntervalRef.current = setInterval(async () => {
          if (!mounted || !seriesRef.current) return
          
              try {
            const latestData = await fetchHistoricalData()
            if (latestData.length > 0 && seriesRef.current) {
              const lastCandle = latestData[latestData.length - 1]
              // Update the last candle instead of replacing all data
              seriesRef.current.update(lastCandle)
              setCurrentPrice(lastCandle.close)
              
              // Update high/low
              const visibleData = latestData.slice(-30)
              const high = Math.max(...visibleData.map((c: CandlestickData) => c.high))
              const low = Math.min(...visibleData.map((c: CandlestickData) => c.low))
              setHighPrice(high)
              setLowPrice(low)
              
              if (latestData.length > 1) {
                const firstCandle = latestData[0]
                const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100
                setPriceChange(change)
                
                if (onPriceUpdate) {
                  onPriceUpdate(lastCandle.close, change)
                }
              }
            }
          } catch (err) {
            console.error("[StockChart] Poll error:", err)
          }
        }, 30000) // 30 seconds

      } catch (err) {
        if (mounted) {
          setError("Failed to load chart data")
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [symbol, fetchHistoricalData, onPriceUpdate])

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="w-full">
      {/* Header with price and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Left: Price info */}
        <div className="flex items-center gap-6">
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
              <span className="text-xs text-muted-foreground">{symbol}</span>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* High/Low stats */}
          <div className="hidden sm:flex items-center gap-4 pl-6 border-l border-white/10">
            <div>
              <span className="text-xs text-muted-foreground block">Period High</span>
              <span className="text-sm font-mono text-green-400">
                ${highPrice ? formatPrice(highPrice) : "---"}
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Period Low</span>
              <span className="text-sm font-mono text-red-400">
                ${lowPrice ? formatPrice(lowPrice) : "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Daily candles • Last 100 days</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-3" />
            <span className="text-sm text-muted-foreground">Loading chart data...</span>
          </div>
        )}
        
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
        
        <div ref={chartContainerRef} className="w-full" style={{ height: "420px" }} />
        
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-950/50 to-transparent pointer-events-none" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Data: Market Data API</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Updates every 30 seconds
        </span>
      </div>
    </div>
  )
}
