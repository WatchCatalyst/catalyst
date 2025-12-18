"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

type PriceImpact = {
  event: string
  timeframe: string
  priceChange: number
  asset: string
}

type PriceImpactWidgetProps = {
  newsTitle: string
  category: string
}

export function PriceImpactWidget({ newsTitle, category }: PriceImpactWidgetProps) {
  // Simulate historical correlation data
  const getHistoricalImpact = (): PriceImpact[] => {
    const title = newsTitle.toLowerCase()
    
    if (title.includes("rate cut") || title.includes("fed")) {
      return [
        { event: "Last 3 Fed rate cuts", timeframe: "24hrs", priceChange: 8.2, asset: "BTC" },
        { event: "Last 3 Fed rate cuts", timeframe: "24hrs", priceChange: 3.5, asset: "S&P 500" },
      ]
    }
    
    if (title.includes("bitcoin") || title.includes("btc")) {
      return [
        { event: "Similar BTC drops", timeframe: "24hrs", priceChange: -5.3, asset: "BTC" },
        { event: "After recovery", timeframe: "7 days", priceChange: 12.1, asset: "BTC" },
      ]
    }
    
    if (title.includes("earnings") || title.includes("profit")) {
      return [
        { event: "Strong earnings beats", timeframe: "24hrs", priceChange: 6.7, asset: "Stock" },
      ]
    }
    
    return []
  }

  const impacts = getHistoricalImpact()
  
  if (impacts.length === 0) return null

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-bright" />
          Historical Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Similar news events historically moved prices:
        </p>
        {impacts.map((impact, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <div className="flex-1">
              <div className="text-xs font-medium">{impact.event}</div>
              <div className="text-xs text-muted-foreground">
                {impact.timeframe} • {impact.asset}
              </div>
            </div>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                impact.priceChange > 0
                  ? "text-success bg-success/10 border-success/20"
                  : "text-danger bg-danger/10 border-danger/20"
              }`}
            >
              {impact.priceChange > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {impact.priceChange > 0 ? "+" : ""}
              {impact.priceChange}%
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
