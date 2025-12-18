"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from 'lucide-react'
import type { NewsItem } from "@/app/page"
import { detectTickers } from "@/lib/ticker-detection"

type TrendingTopicsProps = {
  news: NewsItem[]
}

export function TrendingTopics({ news }: TrendingTopicsProps) {
  // Extract and count all tickers
  const tickerCounts = new Map<string, { count: number; type: string }>()
  
  news.forEach(article => {
    const text = `${article.title} ${article.summary}`
    const tickers = detectTickers(text)
    tickers.forEach(ticker => {
      const current = tickerCounts.get(ticker.symbol) || { count: 0, type: ticker.type }
      tickerCounts.set(ticker.symbol, { 
        count: current.count + 1, 
        type: ticker.type 
      })
    })
  })

  // Sort by count and get top 8
  const trending = Array.from(tickerCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  if (trending.length === 0) return null

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-bright" />
          Trending Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {trending.map(([symbol, data]) => {
          const tradingViewUrl = data.type === "crypto" 
            ? `https://www.tradingview.com/symbols/${symbol}USD/`
            : `https://www.tradingview.com/symbols/${symbol}/`
          
          return (
            <a
              key={symbol}
              href={tradingViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm group-hover:text-accent-bright transition-colors">
                  ${symbol}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {data.type}
                </Badge>
              </div>
              <Badge variant="secondary" className="text-xs">
                {data.count} mentions
              </Badge>
            </a>
          )
        })}
      </CardContent>
    </Card>
  )
}
