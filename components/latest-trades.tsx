"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPoliticianTrades, getInsiderTrades, type AlphaTrade } from "@/lib/alpha-service"

export function LatestTrades() {
  const [trades, setTrades] = useState<AlphaTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [tradeType, setTradeType] = useState<"senate" | "insider">("senate")

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true)
        
        if (tradeType === "senate") {
          const politicianTrades = await getPoliticianTrades()
          setTrades(politicianTrades)
        } else {
          const insiderTrades = await getInsiderTrades()
          setTrades(insiderTrades)
        }
      } catch (error) {
        console.error("[LatestTrades] Error fetching trades:", error)
        setTrades([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [tradeType])

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`
      }
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    } catch {
      return "Unknown"
    }
  }

  // Show most recent 10 trades
  const displayTrades = trades.slice(0, 10)

  const handleTradeClick = (ticker: string) => {
    if (ticker && ticker !== "N/A") {
      // Trigger watchlist-symbol-clicked event to filter news feed
      const event = new CustomEvent("watchlist-symbol-clicked", { detail: { symbol: ticker } })
      window.dispatchEvent(event)
    }
  }

  return (
    <div className="bg-card/50 rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">ALPHA TRACKER</h3>
        </div>

        <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as "senate" | "insider")}>
          <TabsList>
            <TabsTrigger value="senate" className="text-xs">
              🏛️ Senate
            </TabsTrigger>
            <TabsTrigger value="insider" className="text-xs">
              💼 Insiders
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : displayTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No trades available at this time.
          </div>
        ) : (
          displayTrades.map((trade, index) => {
            const displayTime = formatDate(trade.date)
            const isBuy = trade.type === "Buy"

            return (
              <div
                key={`${trade.source}-${trade.ticker}-${trade.person}-${index}`}
                className="p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => handleTradeClick(trade.ticker)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Symbol and Person */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground font-mono">
                        {trade.ticker !== "N/A" ? trade.ticker : "N/A"}
                      </span>
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          isBuy
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {trade.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={trade.person}>
                      {trade.person}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{displayTime}</p>
                  </div>

                  {/* Right: Amount */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                      {trade.amount}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
