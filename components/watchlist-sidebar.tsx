"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { getMarketPrices, type PriceData } from "@/lib/price-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type PortfolioAsset = {
  symbol: string
  type: "crypto" | "stock"
}

export function WatchlistSidebar() {
  const [prices, setPrices] = useState<PriceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = async () => {
    try {
      // Load portfolio from localStorage
      const savedPortfolio = localStorage.getItem("watchcatalyst-portfolio")
      if (!savedPortfolio) {
        setPrices([])
        setIsLoading(false)
        return
      }

      const rawData = JSON.parse(savedPortfolio)
      if (!Array.isArray(rawData) || rawData.length === 0) {
        setPrices([])
        setIsLoading(false)
        return
      }

      // Handle both legacy format (strings) and new format (objects)
      // Extract symbols from objects: { symbol: "AAPL", type: "stock" } -> "AAPL"
      // Or keep strings as-is: "AAPL" -> "AAPL"
      const symbols = rawData
        .map((item: any) => {
          if (typeof item === "string") {
            return item // Legacy format: array of strings
          }
          if (item && typeof item === "object" && item.symbol) {
            return item.symbol // New format: array of objects with symbol property
          }
          return null // Invalid item, filter out
        })
        .filter((symbol): symbol is string => Boolean(symbol)) // Remove nulls

      if (symbols.length === 0) {
        setPrices([])
        setIsLoading(false)
        return
      }

      const priceData = await getMarketPrices(symbols)
      setPrices(priceData)
      setError(null)
    } catch (err) {
      console.error("[WatchlistSidebar] Failed to fetch prices:", err)
      setError("Failed to load prices")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch prices on mount and set up polling every 60 seconds
  useEffect(() => {
    fetchPrices()

    const intervalId = setInterval(() => {
      fetchPrices()
    }, 60000) // 60 seconds

    // Also listen for portfolio updates
    const handlePortfolioUpdate = () => {
      fetchPrices()
    }
    window.addEventListener("portfolio-updated", handlePortfolioUpdate as EventListener)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("portfolio-updated", handlePortfolioUpdate as EventListener)
    }
  }, [])

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`
    }
    // For very small prices (like some crypto), show more decimals
    return `$${price.toFixed(6)}`
  }

  // Format change percentage
  const formatChange = (change: number): string => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}%`
  }

  // Empty state
  if (!isLoading && prices.length === 0 && !error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Add symbols to your watchlist to see live prices here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Your Portfolio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && prices.length === 0 ? (
          <div className="text-xs text-muted-foreground">Loading prices...</div>
        ) : error ? (
          <div className="text-xs text-danger">{error}</div>
        ) : (
          prices.map((priceData) => {
            const isPositive = priceData.change >= 0
            const changeColor = isPositive ? "text-success" : "text-danger"

            return (
              <div
                key={priceData.symbol}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => {
                  // Optional: Filter news feed by symbol
                  // This could trigger a search or filter action
                  const event = new CustomEvent("watchlist-symbol-clicked", { detail: { symbol: priceData.symbol } })
                  window.dispatchEvent(event)
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground font-mono">${priceData.symbol}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-foreground">{formatPrice(priceData.price)}</span>
                  <div className={`flex items-center gap-0.5 ${changeColor}`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className={`text-xs font-medium ${changeColor}`}>{formatChange(priceData.change)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {prices.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Updates every 60s
          </div>
        )}
      </CardContent>
    </Card>
  )
}

