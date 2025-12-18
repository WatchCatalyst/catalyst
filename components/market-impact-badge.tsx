"use client"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Zap, AlertTriangle, TrendingUp, Info } from "lucide-react"
import type { NewsItem } from "@/app/page"
import { calculateMarketImpact, type MarketImpactLevel } from "@/lib/market-impact"
import { EdgeScoreBreakdown } from "@/components/edge-score-breakdown"

type MarketImpactBadgeProps = {
  news: NewsItem
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  portfolioTickers?: string[]
}

export function MarketImpactBadge({ news, showLabel = true, size = "md", portfolioTickers }: MarketImpactBadgeProps) {
  const impact = calculateMarketImpact(news, portfolioTickers)

  const getIcon = (level: MarketImpactLevel) => {
    const iconClass = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"

    switch (level) {
      case "critical":
        return <Zap className={`${iconClass} fill-current`} />
      case "high":
        return <AlertTriangle className={iconClass} />
      case "medium":
        return <TrendingUp className={iconClass} />
      case "low":
        return <Info className={iconClass} />
    }
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          className={`${impact.color.bg} ${impact.color.text} ${impact.color.border} border flex items-center gap-1 ${sizeClasses[size]} cursor-pointer hover:opacity-80 transition-opacity`}
        >
          {getIcon(impact.level)}
          {showLabel && <span className="capitalize">{impact.level} Impact</span>}
        </Badge>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-auto p-0 border-border bg-card shadow-xl" sideOffset={8}>
        <EdgeScoreBreakdown score={impact.score} breakdown={impact.breakdown} />
      </PopoverContent>
    </Popover>
  )
}
