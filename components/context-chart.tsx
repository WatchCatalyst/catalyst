"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts"
import { getChartData } from "@/lib/chart-service"
import type { NewsItem } from "@/app/page"

type ContextChartProps = {
  symbol: string
  articles: NewsItem[]
}

export function ContextChart({ symbol, articles }: ContextChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!symbol) return
    
    if (!chartContainerRef.current) return

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#D1D5DB",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: "#374151" },
        horzLines: { color: "#374151" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Create candlestick series
    // lightweight-charts v5.0+ uses addSeries(CandlestickSeries, options)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981", // Green
      downColor: "#EF4444", // Red
      borderVisible: false,
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    })

    seriesRef.current = candlestickSeries

    // Fetch and set chart data
    async function loadChartData() {
      try {
        setLoading(true)
        setError(null)

        const chartData = await getChartData(symbol)

        if (chartData.length === 0) {
          setError("No chart data available")
          setLoading(false)
          return
        }

        // Convert our format to lightweight-charts format
        // lightweight-charts expects time as a number (Unix timestamp in seconds) or string in 'YYYY-MM-DD' format
        const formattedData: CandlestickData[] = chartData.map((item) => ({
          time: item.time as any, // lightweight-charts accepts YYYY-MM-DD string
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }))

        candlestickSeries.setData(formattedData)

        // Create markers from articles
        const markers: any[] = []

        articles.forEach((article) => {
          const articleDate = new Date(article.timestamp)
          const articleDateStr = articleDate.toISOString().split("T")[0] // YYYY-MM-DD

          // Find the closest candle for this date
          const candleIndex = chartData.findIndex((candle) => candle.time === articleDateStr)

          if (candleIndex >= 0) {
            const candle = chartData[candleIndex]
            const sentiment = article.sentiment || "neutral"

            // Determine marker color and shape based on sentiment
            let color: string
            let shape: "arrowUp" | "arrowDown" | "circle"
            let position: "aboveBar" | "belowBar" | "inBar"

            if (sentiment === "bullish") {
              color = "#10B981" // Green
              shape = "arrowUp"
              position = "belowBar"
            } else if (sentiment === "bearish") {
              color = "#EF4444" // Red
              shape = "arrowDown"
              position = "aboveBar"
            } else {
              color = "#F59E0B" // Yellow/Amber for neutral
              shape = "circle"
              position = "inBar"
            }

            // Truncate title for marker text
            const titleText = article.title.length > 30 ? article.title.substring(0, 27) + "..." : article.title

            markers.push({
              time: articleDateStr,
              position: position,
              color: color,
              shape: shape,
              text: titleText,
            })
          }
        })

        // Set markers on the series (check if method exists)
        if (markers.length > 0) {
          // Try series method first (lightweight-charts v4+)
          if (typeof candlestickSeries.setMarkers === 'function') {
            candlestickSeries.setMarkers(markers)
          } else if (typeof (chart as any).setMarkers === 'function') {
            // Fallback to chart-level markers (older versions)
            (chart as any).setMarkers(markers.map(m => ({ ...m, series: candlestickSeries })))
          } else {
            // If neither method exists, log a warning but don't crash
            console.warn('[ContextChart] setMarkers method not available on series or chart')
          }
        }

        // Fit content to view
        chart.timeScale().fitContent()

        setLoading(false)
      } catch (err: any) {
        console.error("[ContextChart] Failed to load chart data:", err)
        console.error("[ContextChart] Error details:", {
          message: err?.message,
          stack: err?.stack,
          name: err?.name
        })
        setError(`Failed to load chart data: ${err?.message || "Unknown error"}`)
        setLoading(false)
      }
    }

    loadChartData()

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
  }, [symbol, articles])

  if (!symbol) {
    return null
  }

  return (
    <div className="w-full bg-zinc-950/50 rounded-lg border border-white/10 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">
          {symbol} Price Chart with News Events
        </h3>
      </div>
      {/* Always render the chart container so ref is available */}
      <div ref={chartContainerRef} className="w-full" style={{ height: "400px" }}>
        {loading && (
          <div className="h-full flex items-center justify-center absolute inset-0">
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center absolute inset-0">
            <div className="text-sm text-danger">{error}</div>
          </div>
        )}
      </div>
    </div>
  )
}

