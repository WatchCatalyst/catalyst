"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, TrendingDown, Clock, Target, Lightbulb } from "lucide-react"
import { newsClient } from "@/lib/news-client"
import type { NewsItem } from "@/app/page"
import { MarketImpactIndicator } from "@/components/market-impact-indicator"

type AIAnalysis = {
  sentiment: "bullish" | "bearish" | "neutral"
  relevanceScore: number
  tradingSignal: string
  keyInsights: string[]
  affectedAssets: string[]
  timeframe: "immediate" | "short-term" | "medium-term" | "long-term"
}

type AIAnalysisDialogProps = {
  news: NewsItem
  trigger?: React.ReactNode
}

export function AIAnalysisDialog({ news, trigger }: AIAnalysisDialogProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      console.log("[v0] Starting AI analysis for:", news.title)
      const result = await newsClient.analyzeNews(news.title, news.summary, news.category)

      if (result) {
        console.log("[v0] AI analysis received:", result)
        setAnalysis(result)
      } else {
        setError("Unable to analyze this article. Please try again.")
      }
    } catch (error) {
      console.error("[v0] Error analyzing news:", error)
      setError("Failed to generate analysis. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !analysis && !isAnalyzing) {
      handleAnalyze()
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-5 w-5 text-success" />
      case "bearish":
        return <TrendingDown className="h-5 w-5 text-danger" />
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case "immediate":
        return "bg-danger/10 text-danger border-danger/20"
      case "short-term":
        return "bg-warning/10 text-warning border-warning/20"
      case "medium-term":
        return "bg-accent-bright/10 text-accent-bright border-accent-bright/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Sparkles className="h-4 w-4 text-accent-bright" />
            AI Analysis
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-accent-bright" />
            AI Trading Analysis
          </DialogTitle>
          <div className="pt-4 pb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Analyzing Article
            </span>
            <DialogDescription className="text-base mt-1 text-foreground font-medium border-l-2 border-accent-bright/50 pl-3 py-1">
              {news.title}
            </DialogDescription>
          </div>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="py-12 text-center">
            <Sparkles className="h-8 w-8 animate-pulse mx-auto mb-4 text-accent-bright" />
            <p className="text-muted-foreground">Analyzing news with AI...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleAnalyze} variant="outline">
              Try Again
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-6 py-4">
            <MarketImpactIndicator news={news} />

            {/* Sentiment & Score */}
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  {getSentimentIcon(analysis.sentiment)}
                  <span className="text-sm font-medium text-muted-foreground">Sentiment</span>
                </div>
                <p className="text-lg font-bold capitalize">{analysis.sentiment}</p>
              </div>
            </div>

            {/* Trading Signal */}
            <div className="p-4 rounded-lg bg-accent-bright/10 border border-accent-bright/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent-bright" />
                <span className="text-sm font-medium text-muted-foreground">Trading Signal</span>
              </div>
              <p className="text-base font-semibold text-accent-bright">{analysis.tradingSignal}</p>
            </div>

            {/* Timeframe */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Expected Impact Timeframe</span>
              </div>
              <Badge variant="outline" className={`${getTimeframeColor(analysis.timeframe)} capitalize`}>
                {analysis.timeframe.replace("-", " ")}
              </Badge>
            </div>

            {/* Key Insights */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Key Trading Insights</span>
              </div>
              <ul className="space-y-2">
                {analysis.keyInsights.map((insight, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-accent-bright font-bold mt-0.5">•</span>
                    <span className="text-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Affected Assets */}
            {analysis.affectedAssets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Potentially Affected Assets</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.affectedAssets.map((asset, index) => (
                    <Badge key={index} variant="secondary" className="font-mono">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                This analysis is generated by AI and should not be considered financial advice. Always conduct your own
                research before making trading decisions.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Unable to analyze this article</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
