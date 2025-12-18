"use client"

import { useState, useEffect } from "react"
import { Building2, TrendingUp, TrendingDown, Search, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CongressTrade } from "@/app/api/congress/trades/route"

interface CongressTrackerProps {
  portfolio?: Array<{ symbol: string; type: string }>
}

export function CongressTracker({ portfolio = [] }: CongressTrackerProps) {
  const [trades, setTrades] = useState<CongressTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChamber, setSelectedChamber] = useState<"all" | "senate" | "house">("all")

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true)
        const response = await fetch(`/api/congress/trades?chamber=${selectedChamber}`)
        const data = await response.json()

        if (data.success) {
          setTrades(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch congress trades:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [selectedChamber])

  const isInPortfolio = (ticker: string) => {
    return portfolio.some((asset) => asset.symbol.toUpperCase() === ticker.toUpperCase())
  }

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch =
      searchQuery === "" ||
      trade.representative.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.assetDescription.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="bg-card/50 rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent-bright" />
            <h3 className="font-semibold text-sm">Capitol Trades</h3>
            <Badge variant="secondary" className="text-xs">
              Live
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <a
              href="https://www.capitoltrades.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              View All <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Tabs value={selectedChamber} onValueChange={(v) => setSelectedChamber(v as any)} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">
                All
              </TabsTrigger>
              <TabsTrigger value="senate" className="text-xs h-7">
                Senate
              </TabsTrigger>
              <TabsTrigger value="house" className="text-xs h-7">
                House
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-accent-bright border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Loading congressional trades...</p>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">No trades found</div>
        ) : (
          filteredTrades.map((trade) => (
            <div
              key={trade.id}
              className={`p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${
                isInPortfolio(trade.ticker) ? "bg-accent-bright/5 border-l-2 border-l-accent-bright" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{trade.representative}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize flex-shrink-0">
                      {trade.chamber}
                    </Badge>
                    {trade.party && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0 h-4 rounded ${
                          trade.party === "Republican"
                            ? "bg-red-500/10 text-red-500"
                            : trade.party === "Democrat"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {trade.party.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-foreground">${trade.ticker}</span>
                    <span className="text-xs text-muted-foreground truncate">{trade.assetDescription}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge
                    variant={trade.type === "buy" ? "default" : "destructive"}
                    className="text-[10px] px-2 py-0 h-5 gap-1"
                  >
                    {trade.type === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trade.type.toUpperCase()}
                  </Badge>
                  {isInPortfolio(trade.ticker) && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 bg-accent-bright/10 text-accent-bright border-accent-bright/30"
                    >
                      Portfolio
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{trade.amount}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Traded: {formatDate(trade.transactionDate)}</span>
                  <span className="text-muted-foreground">Filed: {formatDate(trade.disclosureDate)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
