"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Activity, Bitcoin, BarChart3 } from "lucide-react"
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

      {/* Top Sector Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-2 md:p-4 h-full flex flex-col justify-between min-h-[80px] md:min-h-[100px]">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground">
            <BarChart3 className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide truncate">Sector</span>
          </div>
          <div className="mt-2 md:mt-3">
            <span className="text-sm md:text-xl lg:text-2xl font-bold text-foreground truncate block">Tech</span>
          </div>
          <div className="flex items-center gap-1 mt-2 md:mt-3 text-success">
            <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium truncate">Active</span>
          </div>
        </CardContent>
      </Card>

      {/* Crypto Sentiment Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="p-2 md:p-4 h-full flex flex-col justify-between min-h-[80px] md:min-h-[100px]">
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground">
            <Bitcoin className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium uppercase tracking-wide truncate">Crypto</span>
          </div>
          <div className="mt-2 md:mt-3">
            <span className="text-sm md:text-xl lg:text-2xl font-bold text-foreground truncate block">Mixed</span>
          </div>
          <div className="flex items-center gap-1 mt-2 md:mt-3 text-amber-500">
            <Minus className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
            <span className="text-[10px] md:text-xs font-medium truncate">Volatile</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
