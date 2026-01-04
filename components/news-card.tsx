"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { use3DTilt } from "@/hooks/use-3d-tilt"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Clock,
  Bookmark,
  BookmarkCheck,
  Star,
  Info,
} from "lucide-react"
import type { NewsItem } from "@/app/page"
import { linkifyTickers } from "@/lib/ticker-detection"
import { MarketImpactBadge } from "@/components/market-impact-badge"
import { getTopicLabel, getTopicColor, type MarketTopic } from "@/lib/market-relevance-classifier"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type NewsCardProps = {
  news: NewsItem
  onBookmark?: (id: string) => void
  isBookmarked?: boolean
  isRelevantToPortfolio?: boolean
  isHolding?: boolean
  compact?: boolean
}

export function NewsCard({
  news,
  onBookmark,
  isBookmarked,
  isRelevantToPortfolio,
  isHolding = false,
  compact = false,
  index = 0,
}: NewsCardProps & { index?: number }) {
  const card3DRef = use3DTilt({ maxRotation: 8, enabled: !compact })
  const getSentimentIcon = () => {
    switch (news.sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4" />
      case "bearish":
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getSentimentColor = () => {
    switch (news.sentiment) {
      case "bullish":
        return "text-success bg-success/10 border-success/20"
      case "bearish":
        return "text-danger bg-danger/10 border-danger/20"
      default:
        return "text-muted-foreground bg-muted border-border"
    }
  }

  const getRelevanceColor = () => {
    if (news.relevanceScore >= 85) return "text-accent-bright"
    if (news.relevanceScore >= 70) return "text-warning"
    return "text-muted-foreground"
  }

  const formatTimestamp = (timestamp: Date | string | number) => {
    let articleDate: Date

    if (timestamp instanceof Date) {
      articleDate = timestamp
    } else {
      articleDate = new Date(timestamp)
    }

    if (isNaN(articleDate.getTime())) {
      return "Recently"
    }

    const now = new Date()
    const diffMs = now.getTime() - articleDate.getTime()
    const minutes = Math.floor(diffMs / 1000 / 60)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getESTString = (timestamp: Date | string | number) => {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return ""
    return (
      date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " EST"
    )
  }

  const classification = (news as any).classification

  // Get stagger class for animation delay (cycles 1-8)
  const staggerClass = `stagger-${(index % 8) + 1}`
  
  // Get sentiment glow class
  const sentimentGlow = news.sentiment === "bullish" 
    ? "glow-bullish" 
    : news.sentiment === "bearish" 
      ? "glow-bearish" 
      : ""

  const renderTopicBadges = () => {
    if (!classification || classification.topics.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {classification.topics.slice(0, 3).map((topic: MarketTopic) => {
          const color = getTopicColor(topic)
          return (
            <Badge
              key={topic}
              variant="outline"
              className={`${color.bg} ${color.text} ${color.border} border text-[10px] px-1.5 py-0.5`}
            >
              {getTopicLabel(topic)}
            </Badge>
          )
        })}
        {classification.topics.length > 3 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
            +{classification.topics.length - 3} more
          </Badge>
        )}
      </div>
    )
  }

  const renderRelevanceTooltip = () => {
    if (!classification || classification.reasons.length === 0) return null

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm">Why this is relevant:</p>
              <ul className="space-y-1 text-xs">
                {classification.reasons.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-accent-bright mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (compact) {
    return (
      <Card
        id={`news-${news.id}`}
        className={`animate-fade-in-up ${staggerClass} card-premium-hover hover:bg-gradient-to-r hover:from-white/5 hover:to-white/[0.02] transition-all duration-300 glass-premium group border-l-4 relative overflow-hidden ${
          isHolding
            ? "border-l-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            : news.sentiment === "bullish"
              ? "border-l-success shadow-[0_0_20px_rgba(34,197,94,0.15)]"
              : news.sentiment === "bearish"
                ? "border-l-danger shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                : "border-l-border"
        } ${isHolding ? "ring-1 ring-yellow-500/30" : ""} ${sentimentGlow}`}
      >
        <CardContent className="p-3 flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-[100px]">
            <span
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${getSentimentColor()}`}
            >
              {getSentimentIcon()}
              {news.sentiment}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-foreground truncate">{linkifyTickers(news.title)}</h3>
              {isHolding && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 border-yellow-500/30 whitespace-nowrap"
                  title="This article mentions one of your holdings"
                >
                  💼 Holding
                </Badge>
              )}
              {isRelevantToPortfolio && !isHolding && (
                <Star className="h-3 w-3 text-accent-bright fill-accent-bright flex-shrink-0" />
              )}
              {news.tradingSignal && (
                <span className="text-[10px] font-bold text-accent-bright bg-accent-bright/10 px-1.5 py-0.5 rounded border border-accent-bright/20 whitespace-nowrap">
                  {news.tradingSignal}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{news.source}</span>
              <span className="flex items-center gap-1" title={getESTString(news.timestamp)}>
                <Clock className="h-3 w-3" />
                {formatTimestamp(news.timestamp)}
              </span>
              <MarketImpactBadge news={news} showLabel={false} size="sm" />
              {renderRelevanceTooltip()}
            </div>
            {renderTopicBadges()}
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onBookmark && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onBookmark(news.id)
                }}
                className="h-8 w-8 p-0"
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-accent-bright fill-accent-bright" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      ref={card3DRef as any}
      id={`news-${news.id}`}
      className={`animate-fade-in-up ${staggerClass} card-premium-hover hover-3d hover:border-accent-bright/50 transition-all duration-300 glass-premium relative overflow-hidden backdrop-glow depth-shadow ${
        isHolding ? "ring-2 ring-yellow-500/40 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]" : isRelevantToPortfolio ? "ring-2 ring-accent-bright/40 shadow-[0_0_30px_rgba(34,211,238,0.15)]" : ""
      } ${sentimentGlow}`}
    >
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {isHolding && (
                  <Badge
                    variant="outline"
                    className="mb-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/40 badge-premium shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                  >
                    💼 Holding
                  </Badge>
                )}
                {isRelevantToPortfolio && !isHolding && (
                  <Badge
                    variant="outline"
                    className="mb-2 bg-accent-bright/10 text-accent-bright border-accent-bright/40 badge-premium shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                  >
                    <Star className="h-3 w-3 mr-1 fill-accent-bright" />
                    Relevant to Your Portfolio
                  </Badge>
                )}
                <h3 className="text-lg font-semibold text-foreground leading-tight text-balance group-hover:text-white transition-colors">
                  {linkifyTickers(news.title)}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 capitalize whitespace-nowrap ${getSentimentColor()}`}
                >
                  {getSentimentIcon()}
                  {news.sentiment}
                </Badge>
                {onBookmark && (
                  <Button variant="ghost" size="sm" onClick={() => onBookmark(news.id)} className="h-8 w-8 p-0">
                    {isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-accent-bright fill-accent-bright" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              {linkifyTickers(
                news.summary.length > 200 
                  ? news.summary.substring(0, 200).trim() + "..." 
                  : news.summary
              )}
            </p>

            {renderTopicBadges()}

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{news.source}</span>
              <span>•</span>
              <span className="flex items-center gap-1 cursor-help" title={getESTString(news.timestamp)}>
                <Clock className="h-3 w-3" />
                {formatTimestamp(news.timestamp)}
              </span>
              <MarketImpactBadge news={news} size="sm" />
              {renderRelevanceTooltip()}
            </div>
          </div>

          <div className="md:w-64 flex-shrink-0 space-y-3">
            {news.tradingSignal && (
              <div className="p-3 rounded-lg bg-gradient-to-br from-accent-bright/10 to-accent-bright/5 border border-accent-bright/30 backdrop-glow relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-bright/0 via-accent-bright/10 to-accent-bright/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Trading Signal</div>
                  <div className="text-sm font-semibold text-accent-bright text-glow-cyan">{news.tradingSignal}</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-accent-bright transition-all py-2 border border-border rounded-md hover:bg-gradient-to-r hover:from-accent-bright/10 hover:to-cyan-500/10 hover:border-accent-bright/50 hover:scale-105 hover:shadow-lg hover:shadow-accent-bright/20"
              >
                Read full
                <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
