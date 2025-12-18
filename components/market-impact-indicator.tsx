import { Card, CardContent } from "@/components/ui/card"
import { Zap, AlertTriangle, TrendingUp, Info, Activity } from "lucide-react"
import type { NewsItem } from "@/app/page"
import { calculateMarketImpact } from "@/lib/market-impact"

type MarketImpactIndicatorProps = {
  news: NewsItem
}

export function MarketImpactIndicator({ news }: MarketImpactIndicatorProps) {
  const impact = calculateMarketImpact(news)

  const getIcon = () => {
    switch (impact.level) {
      case "critical":
        return <Zap className="h-5 w-5 fill-current" />
      case "high":
        return <AlertTriangle className="h-5 w-5" />
      case "medium":
        return <TrendingUp className="h-5 w-5" />
      case "low":
        return <Info className="h-5 w-5" />
    }
  }

  const factors = []

  // Add impact factors
  if ((news.sourceQuality || 60) >= 90) {
    factors.push("Premium source")
  }
  if (news.relevanceScore >= 80) {
    factors.push("High relevance")
  }
  if (news.sentiment !== "neutral") {
    factors.push(`${news.sentiment.charAt(0).toUpperCase() + news.sentiment.slice(1)} sentiment`)
  }
  if (["crypto", "stocks", "war"].includes(news.category)) {
    factors.push("High-impact category")
  }
  if (news.tradingSignal) {
    factors.push("Trading signal present")
  }

  return (
    <Card className={`${impact.color.bg} ${impact.color.border} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`${impact.color.text} mt-0.5`}>{getIcon()}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-sm font-semibold ${impact.color.text} capitalize`}>{impact.level} Market Impact</h4>
              <span className={`text-xs font-bold ${impact.color.text}`}>{impact.score}/100</span>
            </div>

            <p className="text-xs text-muted-foreground mb-3">{impact.description}</p>

            {factors.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Impact Factors
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {factors.map((factor, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-foreground">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Impact Score Bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${impact.color.bg} transition-all duration-500`}
                  style={{ width: `${impact.score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
