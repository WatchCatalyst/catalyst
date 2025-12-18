"use client"

import { Building2, Sparkles, GitBranch, Briefcase, TrendingUp } from "lucide-react"
import type { ScoreBreakdown } from "@/lib/market-impact"

type EdgeScoreBreakdownProps = {
  score: number
  breakdown: ScoreBreakdown
}

export function EdgeScoreBreakdown({ score, breakdown }: EdgeScoreBreakdownProps) {
  const getScoreBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return "bg-red-500"
    if (percentage >= 60) return "bg-orange-500"
    if (percentage >= 40) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const factors = [
    {
      key: "sourceWeight",
      icon: Building2,
      title: "Source Weight",
      data: breakdown.sourceWeight,
    },
    {
      key: "surpriseFactor",
      icon: Sparkles,
      title: "Surprise Factor",
      data: breakdown.surpriseFactor,
    },
    {
      key: "crossAssetEffect",
      icon: GitBranch,
      title: "Cross-Asset Effect",
      data: breakdown.crossAssetEffect,
    },
    {
      key: "portfolioOverlap",
      icon: Briefcase,
      title: "Portfolio Overlap",
      data: breakdown.portfolioOverlap,
    },
  ]

  return (
    <div className="w-72 p-3 space-y-3">
      {/* Header with total score */}
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

      {/* Score factors */}
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

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getScoreBarColor(data.score, data.maxScore)}`}
                style={{ width: `${(data.score / data.maxScore) * 100}%` }}
              />
            </div>

            {/* Label and description */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-medium text-accent-bright">{data.label}</span>
              <span className="text-[10px] text-muted-foreground text-right leading-tight">{data.description}</span>
            </div>

            {/* Historical note for cross-asset */}
            {key === "crossAssetEffect" && (data as any).historicalNote && (
              <div className="mt-1 p-1.5 bg-accent-bright/5 rounded border border-accent-bright/10">
                <p className="text-[10px] text-accent-bright/80 italic leading-tight">{(data as any).historicalNote}</p>
              </div>
            )}

            {/* Overlapping assets for portfolio */}
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

      {/* Footer explanation */}
      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-tight">
          EdgeScore combines source authority, surprise vs consensus, cross-market effects, and your portfolio exposure.
        </p>
      </div>
    </div>
  )
}
