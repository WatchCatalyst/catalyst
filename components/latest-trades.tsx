"use client"

import { useState, useEffect } from "react"
import { ExternalLink } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Trade {
  id: string
  representative: string
  ticker: string
  assetDescription: string
  type: "buy" | "sell"
  transactionDate: string
  disclosureDate: string
  amount: string
  owner: string
  party?: string
  chamber: "house" | "senate"
}

export function LatestTrades() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [assetType, setAssetType] = useState<"stocks" | "all">("all")

  useEffect(() => {
    async function fetchTrades() {
      try {
        setLoading(true)
        const response = await fetch(`/api/congress/trades?chamber=all`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setTrades(result.data)
        } else {
          // API returned empty or no data - use fallback sample data for demo
          console.warn("[LatestTrades] API returned no trades, using fallback data")
          setTrades(getFallbackTrades())
        }
      } catch (error) {
        console.error("[LatestTrades] Error fetching trades:", error)
        // Use fallback data on error too
        setTrades(getFallbackTrades())
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()
  }, [])

  // Fallback sample data for when API is unavailable
  function getFallbackTrades(): Trade[] {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    
    return [
      {
        id: "fallback-1",
        representative: "Jefferson Shreve",
        ticker: "BMO:US",
        assetDescription: "Bank of Montreal",
        type: "buy",
        transactionDate: yesterday.toISOString(),
        disclosureDate: yesterday.toISOString(),
        amount: "5,000,001 - 25,000,000",
        owner: "Representative",
        party: "Republican",
        chamber: "house",
      },
      {
        id: "fallback-2",
        representative: "Jefferson Shreve",
        ticker: "N/A",
        assetDescription: "JP Morgan Chase",
        type: "buy",
        transactionDate: yesterday.toISOString(),
        disclosureDate: yesterday.toISOString(),
        amount: "5,000,001 - 25,000,000",
        owner: "Representative",
        party: "Republican",
        chamber: "house",
      },
      {
        id: "fallback-3",
        representative: "Markwayne Mullin",
        ticker: "N/A",
        assetDescription: "City of Corsicana",
        type: "buy",
        transactionDate: threeDaysAgo.toISOString(),
        disclosureDate: threeDaysAgo.toISOString(),
        amount: "50,001 - 100,000",
        owner: "Senator",
        party: "Republican",
        chamber: "senate",
      },
      {
        id: "fallback-4",
        representative: "John Fetterman",
        ticker: "GXO:US",
        assetDescription: "GXO Logistics Inc",
        type: "buy",
        transactionDate: threeDaysAgo.toISOString(),
        disclosureDate: threeDaysAgo.toISOString(),
        amount: "1,001 - 15,000",
        owner: "Senator",
        party: "Democrat",
        chamber: "senate",
      },
      {
        id: "fallback-5",
        representative: "Scott Peters",
        ticker: "N/A",
        assetDescription: "Allocate Alpha",
        type: "buy",
        transactionDate: threeDaysAgo.toISOString(),
        disclosureDate: threeDaysAgo.toISOString(),
        amount: "15,001 - 50,000",
        owner: "Representative",
        party: "Democrat",
        chamber: "house",
      },
    ]
  }

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
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
    } catch {
      return "Unknown"
    }
  }

  const formatAmount = (amount: string): string => {
    if (!amount || typeof amount !== "string") return "Unknown"
    
    const lower = amount.toLowerCase().trim()
    
    // Handle ranges like "1,000,001 - 5,000,000" or "$1M-$5M"
    if (lower.includes("million") || lower.includes("m")) {
      // Try to extract range
      const millionMatch = lower.match(/(\d+)m.*?(\d+)m|(\d+).*?million.*?(\d+).*?million/i)
      if (millionMatch) {
        const min = millionMatch[1] || millionMatch[3]
        const max = millionMatch[2] || millionMatch[4]
        return `${min}M-${max}M`
      }
      // Single value
      const singleMatch = lower.match(/(\d+)[\s]*m/i)
      if (singleMatch) {
        const val = singleMatch[1]
        return `${val}M-${parseInt(val) * 5}M`
      }
      return "1M-5M"
    }
    
    if (lower.includes("thousand") || lower.includes("k")) {
      const thousandMatch = lower.match(/(\d+)k.*?(\d+)k|(\d+).*?thousand.*?(\d+).*?thousand/i)
      if (thousandMatch) {
        const min = thousandMatch[1] || thousandMatch[3]
        const max = thousandMatch[2] || thousandMatch[4]
        return `${min}K-${max}K`
      }
      const singleMatch = lower.match(/(\d+)[\s]*k/i)
      if (singleMatch) {
        const val = parseInt(singleMatch[1])
        if (val >= 50) return "50K-100K"
        if (val >= 15) return "15K-50K"
        return "1K-15K"
      }
      return "1K-100K"
    }
    
    // Try to parse numbers directly
    const numbers = amount.match(/[\d,]+/g)
    if (numbers && numbers.length >= 2) {
      const num1 = parseInt(numbers[0].replace(/,/g, ""))
      const num2 = parseInt(numbers[1].replace(/,/g, ""))
      if (num2 >= 1000000) {
        return `${Math.floor(num1 / 1000000)}M-${Math.floor(num2 / 1000000)}M`
      }
      if (num2 >= 1000) {
        return `${Math.floor(num1 / 1000)}K-${Math.floor(num2 / 1000)}K`
      }
    }
    
    return amount
  }

  const getAffiliation = (trade: Trade): string => {
    const party = trade.party || "Unknown"
    const chamber = trade.chamber === "senate" ? "Senate" : "House"
    
    // Try to extract state from representative name if available
    // Some names might have state abbreviations at the end
    const nameParts = trade.representative.split(" ")
    const possibleState = nameParts[nameParts.length - 1]
    
    // Simple heuristic: if last part is 2 uppercase letters, it might be a state
    if (possibleState && possibleState.length === 2 && possibleState === possibleState.toUpperCase()) {
      return `${party} | ${chamber} | ${possibleState}`
    }
    
    return `${party} | ${chamber}`
  }

  // Filter trades based on asset type
  const filteredTrades = assetType === "stocks"
    ? trades.filter(trade => {
        const ticker = trade.ticker?.trim().toUpperCase()
        return ticker && ticker !== "N/A" && ticker.length > 0 && ticker.length < 10
      })
    : trades

  // Show most recent 10 trades
  const displayTrades = filteredTrades.slice(0, 10)

  return (
    <div className="bg-card/50 rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">LATEST TRADES</h3>
          <a
            href="https://www.capitoltrades.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-accent-bright transition-colors flex items-center gap-1"
          >
            View all <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <Tabs value={assetType} onValueChange={(v) => setAssetType(v as "stocks" | "all")}>
          <TabsList>
            <TabsTrigger value="stocks" className="text-xs">
              Stocks
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              All Assets
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-accent-bright border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Loading trades...</p>
          </div>
        ) : displayTrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {trades.length === 0 
              ? "No trades available at this time."
              : assetType === "stocks"
                ? `No stock trades found. ${trades.length} total trades available in "All Assets".`
                : "No trades found."}
          </div>
        ) : (
          displayTrades.map((trade) => {
            const formattedAmount = formatAmount(trade.amount)
            const affiliation = getAffiliation(trade)
            const displayTime = formatDate(trade.transactionDate)
            const assetName = trade.assetDescription || "Unknown Asset"
            const displayAssetName = assetName.length > 25 ? `${assetName.substring(0, 22)}...` : assetName

            return (
              <div
                key={trade.id}
                className="p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-semibold uppercase ${
                      trade.type === "buy" ? "text-teal-400" : "text-red-400"
                    }`}
                  >
                    {trade.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{displayTime}</span>
                </div>

                <div className="mb-2">
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {displayAssetName}
                  </p>
                  {trade.ticker && trade.ticker !== "N/A" && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {trade.ticker}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground mb-0.5 truncate">
                      {trade.representative}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {affiliation}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <span className="text-teal-400 text-base leading-none">💰</span>
                    <span className="text-teal-400 text-base leading-none">💰</span>
                    <span className="text-teal-400 text-base leading-none">💰</span>
                    <span className="text-xs font-medium text-foreground ml-1.5 whitespace-nowrap">
                      {formattedAmount}
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
