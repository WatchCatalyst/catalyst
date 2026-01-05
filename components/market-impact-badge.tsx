"use client"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Zap, AlertTriangle, TrendingUp, Info, Building2, Sparkles, GitBranch, Briefcase } from "lucide-react"
import type { NewsItem } from "@/app/page"
import { calculateMarketImpact, type MarketImpactLevel, type ScoreBreakdown } from "@/lib/market-impact"

type MarketImpactBadgeProps = {
  news: NewsItem
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  portfolioTickers?: string[]
}

function EdgeScoreBreakdown({ score, breakdown }: { score: number; breakdown: ScoreBreakdown }) {
  const getScoreBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "bg-red-500"
    if (percentage >= 60) return "bg-orange-500"
    if (percentage >= 40) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const factors = [
    { key: "sourceWeight", icon: Building2, title: "Source Weight", data: breakdown.sourceWeight },
    { key: "surpriseFactor", icon: Sparkles, title: "Surprise Factor", data: breakdown.surpriseFactor },
    { key: "crossAssetEffect", icon: GitBranch, title: "Cross-Asset Effect", data: breakdown.crossAssetEffect },
    { key: "portfolioOverlap", icon: Briefcase, title: "Portfolio Overlap", data: breakdown.portfolioOverlap },
  ]

  return (
    <div className="w-72 p-3 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-bright" />
          <span className="font-semibold text-sm">EdgeScore Breakdown</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="space-y-3">
        {factors.map(({ key, icon: Icon, title, data }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{title}</span>
              </div>
              <span className="text-xs font-semibold text-foreground">
                +{data.score}/{data.maxScore}
              </span>
            </div>

            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getScoreBarColor(data.score, data.maxScore)}`}
                style={{ width: `${(data.score / data.maxScore) * 100}%` }}
              />
            </div>

            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-medium text-accent-bright">{data.label}</span>
              <span className="text-[10px] text-muted-foreground text-right leading-tight">{data.description}</span>
            </div>

            {key === "crossAssetEffect" && (data as any).historicalNote && (
              <div className="mt-1 p-1.5 bg-accent-bright/5 rounded border border-accent-bright/10">
                <p className="text-[10px] text-accent-bright/80 italic leading-tight">{(data as any).historicalNote}</p>
              </div>
            )}

            {key === "portfolioOverlap" && (data as any).overlappingAssets && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(data as any).overlappingAssets.slice(0, 5).map((ticker: string) => (
                  <span
                    key={ticker}
                    className="text-[10px] px-1.5 py-0.5 bg-accent-bright/10 text-accent-bright rounded font-mono"
                  >
                    ${ticker}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-tight">
          EdgeScore combines source authority, surprise vs consensus, cross-market effects, and your portfolio exposure.
        </p>
      </div>
    </div>
  )
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
