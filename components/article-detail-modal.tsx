"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react'
import type { NewsItem } from "@/app/page"
import { linkifyTickers } from "@/lib/ticker-detection"

type ArticleDetailModalProps = {
  news: NewsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticleDetailModal({ news, open, onOpenChange }: ArticleDetailModalProps) {
  if (!news) return null

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

  const formatTimestamp = (timestamp: Date | string | number) => {
    const articleDate = new Date(timestamp)
    if (isNaN(articleDate.getTime())) return "Recently"

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

  // Added helper to format full date in EST for tooltip
  const getESTString = (timestamp: Date | string | number) => {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return ""
    return date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "short"
    }) + " EST"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 mb-2">
            <DialogTitle className="text-xl font-bold leading-tight text-balance">
              {linkifyTickers(news.title)}
            </DialogTitle>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 capitalize whitespace-nowrap ${getSentimentColor()}`}
            >
              {getSentimentIcon()}
              {news.sentiment}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{news.source}</span>
            <span>•</span>
            {/* Added title attribute to show full EST time on hover */}
            <span className="flex items-center gap-1 cursor-help" title={getESTString(news.timestamp)}>
              <Clock className="h-3 w-3" />
              {formatTimestamp(news.timestamp)}
            </span>
            <span>•</span>
            <Badge variant="secondary" className="text-xs capitalize">
              {news.category}
            </Badge>
          </div>
        </DialogHeader>

        <DialogDescription className="text-sm text-foreground leading-relaxed">
          {linkifyTickers(news.summary)}
        </DialogDescription>

        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-1 gap-3">
            {news.tradingSignal && (
              <div className="p-3 rounded-lg bg-accent-bright/10 border border-accent-bright/20">
                <div className="text-xs font-medium text-muted-foreground mb-1">Trading Signal</div>
                <div className="text-lg font-semibold text-accent-bright">{news.tradingSignal}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => window.open(news.url, '_blank')}
            >
              Open Full Article
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
