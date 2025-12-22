"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react"
import type { NewsItem } from "@/app/page"

type MarketOverviewProps = {
  news: NewsItem[]
}

export function MarketOverview({ news }: MarketOverviewProps) {
  // Calculate sentiment distribution
  const sentimentCounts = news.reduce(
    (acc, item) => {
      acc[item.sentiment] = (acc[item.sentiment] || 0) + 1
      return acc
    },
    { bullish: 0, bearish: 0, neutral: 0 } as Record<string, number>,
  )

  const total = news.length || 1
  const bullishPct = Math.round((sentimentCounts.bullish / total) * 100)
  const bearishPct = Math.round((sentimentCounts.bearish / total) * 100)
  const neutralPct = 100 - bullishPct - bearishPct

  // Determine overall market mood
  let mood = "Neutral"
  let moodColor = "text-muted-foreground"
  let MoodIcon = Minus

  if (bullishPct > bearishPct + 10) {
    mood = "Bullish"
    moodColor = "text-success"
    MoodIcon = TrendingUp
  } else if (bearishPct > bullishPct + 10) {
    mood = "Bearish"
    moodColor = "text-danger"
    MoodIcon = TrendingDown
  }

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
      {/* Market Mood Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-2 md:p-4 h-full flex flex-col justify-between min-h-[80px] md:min-h-[100px]">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground">
            <Activity className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide truncate">Mood</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2 mt-2 md:mt-3">
            <MoodIcon className={`h-4 w-4 md:h-5 md:w-5 shrink-0 ${moodColor}`} />
            <span className={`text-sm md:text-xl lg:text-2xl font-bold ${moodColor} truncate`}>{mood}</span>
          </div>
          <div className="flex gap-0.5 mt-2 md:mt-3 h-1 md:h-1.5 w-full rounded-full overflow-hidden bg-muted">
            <div className="bg-success transition-all" style={{ width: `${bullishPct}%` }} />
            <div className="bg-muted-foreground/30 transition-all" style={{ width: `${neutralPct}%` }} />
            <div className="bg-danger transition-all" style={{ width: `${bearishPct}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Bullish Sentiment Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-2 md:p-4 h-full flex flex-col justify-between min-h-[80px] md:min-h-[100px]">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide truncate">Bullish</span>
          </div>
          <div className="mt-2 md:mt-3">
            <span className="text-sm md:text-xl lg:text-2xl font-bold text-success truncate block">{bullishPct}%</span>
          </div>
          <div className="flex items-center gap-1 mt-2 md:mt-3 text-muted-foreground">
            <span className="text-[10px] md:text-xs font-medium truncate">{sentimentCounts.bullish} articles</span>
          </div>
        </CardContent>
      </Card>

      {/* Bearish Sentiment Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-2 md:p-4 h-full flex flex-col justify-between min-h-[80px] md:min-h-[100px]">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground">
            <TrendingDown className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide truncate">Bearish</span>
          </div>
          <div className="mt-2 md:mt-3">
            <span className="text-sm md:text-xl lg:text-2xl font-bold text-danger truncate block">{bearishPct}%</span>
          </div>
          <div className="flex items-center gap-1 mt-2 md:mt-3 text-muted-foreground">
            <span className="text-[10px] md:text-xs font-medium truncate">{sentimentCounts.bearish} articles</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
