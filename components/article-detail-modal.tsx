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
import { ExternalLink, TrendingUp, TrendingDown, Minus, Clock, Newspaper } from 'lucide-react'
import type { NewsItem } from "@/app/page"
import { linkifyTickers, detectTickers } from "@/lib/ticker-detection"
import { NewsCard } from "@/components/news-card"

type ArticleDetailModalProps = {
  news: NewsItem | null
  allNews?: NewsItem[] // All news items to find related articles
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArticleDetailModal({ news, allNews = [], open, onOpenChange }: ArticleDetailModalProps) {
  if (!news) return null

  // Find related articles
  const findRelatedArticles = (): NewsItem[] => {
    if (!allNews || allNews.length === 0) return []

    const currentTickers = detectTickers(`${news.title} ${news.summary}`).map(t => t.symbol.toUpperCase())
    const currentKeywords = news.keywords || []
    const currentTopics = news.topics || []
    
    const related = allNews
      .filter(article => article.id !== news.id) // Exclude current article
      .map(article => {
        let score = 0
        
        // Check for same tickers
        const articleTickers = detectTickers(`${article.title} ${article.summary}`).map(t => t.symbol.toUpperCase())
        const commonTickers = currentTickers.filter(t => articleTickers.includes(t))
        if (commonTickers.length > 0) {
          score += commonTickers.length * 30 // High weight for ticker matches
        }
        
        // Check for same category
        if (article.category === news.category) {
          score += 20
        }
        
        // Check for common keywords
        const articleKeywords = article.keywords || []
        const commonKeywords = currentKeywords.filter(k => articleKeywords.includes(k))
        if (commonKeywords.length > 0) {
          score += commonKeywords.length * 15
        }
        
        // Check for common topics
        const articleTopics = article.topics || []
        const commonTopics = currentTopics.filter(t => articleTopics.includes(t))
        if (commonTopics.length > 0) {
          score += commonTopics.length * 20
        }
        
        // Check title similarity (simple word matching)
        const currentTitleWords = news.title.toLowerCase().split(/\s+/)
        const articleTitleWords = article.title.toLowerCase().split(/\s+/)
        const commonWords = currentTitleWords.filter(w => w.length > 3 && articleTitleWords.includes(w))
        if (commonWords.length > 0) {
          score += commonWords.length * 5
        }
        
        return { article, score }
      })
      .filter(item => item.score > 0) // Only include articles with some relevance
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .slice(0, 6) // Top 6 related articles
      .map(item => item.article)
    
    return related
  }

  const relatedArticles = findRelatedArticles()

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

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Related Articles</h3>
              <Badge variant="secondary" className="text-[10px]">
                {relatedArticles.length}
              </Badge>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {relatedArticles.map((article) => (
                <div
                  key={article.id}
                  onClick={() => {
                    // Dispatch event to open this article (parent will handle state update)
                    window.dispatchEvent(
                      new CustomEvent("open-article", { detail: { article } })
                    )
                    // Scroll to top of modal content
                    const modalContent = document.querySelector('[role="dialog"]')
                    if (modalContent) {
                      modalContent.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className="p-3 rounded-lg border border-border/50 hover:border-accent-bright/30 hover:bg-accent-bright/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent-bright transition-colors line-clamp-2 flex-1">
                      {linkifyTickers(article.title)}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex-shrink-0 ${
                        article.sentiment === "bullish"
                          ? "text-success border-success/30"
                          : article.sentiment === "bearish"
                            ? "text-danger border-danger/30"
                            : ""
                      }`}
                    >
                      {article.sentiment}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {article.summary.substring(0, 150)}...
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{formatTimestamp(article.timestamp)}</span>
                    {article.category && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {article.category}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
