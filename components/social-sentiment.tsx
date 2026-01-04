"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, MessageSquare, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StocktwitsSentiment {
  symbol: string
  name: string
  bullishPercent: number
  bearishPercent: number
  sentiment: "bullish" | "bearish" | "neutral"
  messageCount: number
  watchlistCount: number
  lastUpdated: string
}

export function SocialSentiment() {
  const [sentiments, setSentiments] = useState<StocktwitsSentiment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSentiment() {
      try {
        const response = await fetch("/api/sentiment/stocktwits?symbols=BTC,ETH,SPY,QQQ,AAPL,TSLA,MSFT,GOOGL,AMZN,NVDA")
        const data = await response.json()
        
        if (data.success) {
          setSentiments(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch social sentiment:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSentiment()
    // Refresh every 6 minutes (matches server cache - prevents unnecessary requests)
    const interval = setInterval(fetchSentiment, 360000)
    return () => clearInterval(interval)
  }, [])

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "bullish") return "text-green-500"
    if (sentiment === "bearish") return "text-red-500"
    return "text-yellow-500"
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Social Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sentiments.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Social Sentiment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sentiment data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Social Sentiment (Stocktwits)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {sentiments.map((item) => {
            const isBullish = item.sentiment === "bullish"
            
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{item.symbol}</span>
                    {isBullish ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : item.sentiment === "bearish" ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : null}
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 ${
                        isBullish 
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : item.sentiment === "bearish"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-green-500">Bullish</span>
                        <span className="font-medium">{item.bullishPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all" 
                          style={{ width: `${item.bullishPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-red-500">Bearish</span>
                        <span className="font-medium">{item.bearishPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-500 transition-all" 
                          style={{ width: `${item.bearishPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}




