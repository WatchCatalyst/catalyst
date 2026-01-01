"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { NewsCard } from "@/components/news-card"
import { SearchBar } from "@/components/search-bar"
import { TrendingTopics } from "@/components/trending-topics"
import { ArticleDetailModal } from "@/components/article-detail-modal"
import { SettingsDialog } from "@/components/settings-dialog"
import { SmartAlertsPanel } from "@/components/smart-alerts-panel"
import { MarketOverview } from "@/components/market-overview"
import { RefreshCw, Bell, BellOff, LayoutGrid, List, Star, Radio, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { newsClient } from "@/lib/news-client"
import { useToast } from "@/hooks/use-toast"
import useSWRInfinite from "swr/infinite"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { detectTickers } from "@/lib/ticker-detection"
import Image from "next/image"
import { CatalystCalendar } from "@/components/catalyst-calendar"
import { WatchlistSidebar } from "@/components/watchlist-sidebar"
import type { MarketTopic } from "@/lib/market-relevance-classifier"
import { SystemHealth } from "@/components/system-health"
import { NewsCardSkeleton } from "@/components/news-card-skeleton"
import { PortfolioManager } from "@/components/portfolio-manager"
import { PriceAlertsManager } from "@/components/price-alerts-manager"
import { CongressTracker } from "@/components/congress-tracker"
import { LatestTrades } from "@/components/latest-trades"
import { Badge } from "@/components/ui/badge"
import { SmartNotifications } from "@/components/smart-notifications"
import { ContextChart } from "@/components/context-chart"
import { EarningsCalendar } from "@/components/earnings-calendar"
import { SECFilings } from "@/components/sec-filings"
import { AnalystRatings } from "@/components/analyst-ratings"
import { CryptoPrices } from "@/components/crypto-prices"
import { SocialSentiment } from "@/components/social-sentiment"

export type NewsCategoryType = "all" | "crypto" | "stocks" | "war" | "technology" | "politics" | "animals" | "sports"

export type NewsItem = {
  id: string
  title: string
  summary: string
  category: NewsCategoryType
  sentiment: "bullish" | "bearish" | "neutral"
  relevanceScore: number
  tradingSignal?: string
  source: string
  timestamp: Date | string
  url: string
  sourceQuality?: number
  sourceTier?: "premium" | "reliable" | "standard" | "unverified"
  keywords?: string[]
  topics?: string[] // Market topics from AI classification
  reasons?: string[] // Reasons why article is relevant for trading
}

const getKey = (pageIndex: number, previousPageData: any, selectedCategory: NewsCategoryType) => {
  // If previous page had no data or was empty, stop fetching
  if (pageIndex > 0 && (!previousPageData || previousPageData.length === 0)) {
    return null
  }
  
  // Calculate offset: page 0 = 0, page 1 = 25, page 2 = 50, etc.
  const limit = 25
  const offset = pageIndex * limit
  
  return `/api/news?limit=${limit}&offset=${offset}`
}

// Component to display "Last updated: X ago"
function LastUpdatedDisplay({ lastUpdateTime }: { lastUpdateTime: Date }) {
  const [timeAgo, setTimeAgo] = useState("Just now")

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastUpdateTime.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)

      if (diffSeconds < 10) {
        setTimeAgo("Just now")
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds}s ago`)
      } else if (diffMinutes === 1) {
        setTimeAgo("1m ago")
      } else if (diffMinutes < 60) {
        setTimeAgo(`${diffMinutes}m ago`)
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        setTimeAgo(`${diffHours}h ago`)
      }
    }

    updateTimeAgo()
    const intervalId = setInterval(updateTimeAgo, 5000) // Update every 5 seconds
    return () => clearInterval(intervalId)
  }, [lastUpdateTime])

  return <span>Updated {timeAgo}</span>
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isLive, setIsLive] = useState(true) // Live auto-refresh toggle
  const [viewMode, setViewMode] = useState<"card" | "compact">("card")
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null)
  const [portfolio, setPortfolio] = useState<Array<{ symbol: string; type: string }>>([])
  const previousNewsIdsRef = useRef<Set<string>>(new Set())
  const searchQueryRef = useRef<string>("")
  const { toast } = useToast()
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false) // Track background refresh state
  const [newArticleCount, setNewArticleCount] = useState(0)
  const [minRelevanceScore, setMinRelevanceScore] = useState(60)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])

  const loadPreferences = () => {
    const savedPrefs = localStorage.getItem("watchcatalyst-preferences")
    if (savedPrefs) {
      const parsed = JSON.parse(savedPrefs)
      setMinRelevanceScore(parsed.minRelevanceScore || 60)
      if (parsed.selectedTopics && Array.isArray(parsed.selectedTopics)) {
        setSelectedTopics(parsed.selectedTopics)
      }
    }
  }

  const loadPortfolio = () => {
    const savedPortfolio = localStorage.getItem("watchcatalyst-portfolio")
    if (savedPortfolio) {
      try {
        setPortfolio(JSON.parse(savedPortfolio))
      } catch (error) {
        console.error("Failed to parse portfolio from localStorage:", error)
      }
    }
  }

  // Keep ref in sync with searchQuery state
  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem("watchcatalyst-bookmarks")
    if (saved) {
      setBookmarkedIds(new Set(JSON.parse(saved)))
    }

    loadPortfolio()
    loadPreferences()

    // Listen for storage changes (when settings are saved from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "watchcatalyst-preferences") {
        loadPreferences()
      } else if (e.key === "watchcatalyst-portfolio") {
        loadPortfolio()
      }
    }
    window.addEventListener("storage", handleStorageChange)

    // Listen for custom events (for same-tab updates)
    const handlePreferencesUpdate = () => {
      loadPreferences()
    }
    const handlePortfolioUpdate = () => {
      loadPortfolio()
    }
    const handleWatchlistSymbolClick = (e: Event) => {
      const customEvent = e as CustomEvent<{ symbol: string }>
      const symbol = customEvent.detail?.symbol
      if (symbol) {
        // If clicking the same symbol that's already in search, reset to show all
        if (searchQueryRef.current.toUpperCase() === symbol.toUpperCase()) {
          setSearchQuery("")
          searchQueryRef.current = ""
        } else {
          // Set the search query to the clicked symbol
          setSearchQuery(symbol)
          searchQueryRef.current = symbol
          // Scroll to top smoothly to show filtered results
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      }
    }
    window.addEventListener("preferences-updated", handlePreferencesUpdate as EventListener)
    window.addEventListener("portfolio-updated", handlePortfolioUpdate as EventListener)
    window.addEventListener("watchlist-symbol-clicked", handleWatchlistSymbolClick as EventListener)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("preferences-updated", handlePreferencesUpdate as EventListener)
      window.removeEventListener("portfolio-updated", handlePortfolioUpdate as EventListener)
      window.removeEventListener("watchlist-symbol-clicked", handleWatchlistSymbolClick as EventListener)
    }
  }, [])

  const fetchPage = async (url: string) => {
    // Fetch from the API endpoint (url includes pagination params like ?limit=25&offset=0)
    const response = await fetch(url)
    const result = await response.json()
    return result.data || []
  }

  const {
    data,
    error,
    size,
    setSize,
    isValidating,
    mutate: refreshNews,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => getKey(pageIndex, previousPageData, selectedCategory),
    fetchPage,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  const news = data ? data.flat() : []
  const isLoadingMore = isValidating || (size > 0 && data && typeof data[size - 1] === "undefined")
  const isEmpty = data?.[0]?.length === 0
  // Check if we've reached the end (last page had fewer than 25 items or was empty)
  const isReachingEnd = isEmpty || (data && data[data.length - 1] && data[data.length - 1].length < 25)

  const handleBookmark = (id: string) => {
    const newBookmarks = new Set(bookmarkedIds)
    const isAdding = !newBookmarks.has(id)

    if (isAdding) {
      newBookmarks.add(id)
      toast({ title: "Added to bookmarks" })
    } else {
      newBookmarks.delete(id)
      toast({ title: "Removed from bookmarks" })
    }
    setBookmarkedIds(newBookmarks)
    localStorage.setItem("watchcatalyst-bookmarks", JSON.stringify(Array.from(newBookmarks)))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        refreshNews()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (news.length > 0 && previousNewsIdsRef.current.size > 0 && autoRefresh) {
      const newItems = news.filter((item: NewsItem) => !previousNewsIdsRef.current.has(item.id))

      const prefs = localStorage.getItem("watchcatalyst-preferences")
      let shouldNotify = true

      if (prefs) {
        const parsed = JSON.parse(prefs)
        if (!parsed.enabled) shouldNotify = false
      }

      if (newItems.length > 0) {
        setNewArticleCount(newItems.length)
        setLastUpdateTime(new Date())
      }

      if (newItems.length > 0 && shouldNotify) {
        const firstNewItem = newItems[0]
        toast({
          title: `${newItems.length} New ${newItems.length === 1 ? "Article" : "Articles"}`,
          description: firstNewItem?.title || "Check the latest updates",
          action: (
            <button
              onClick={() => {
                const element = document.getElementById(`news-${firstNewItem.id}`)
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" })
                  element.classList.add("ring-2", "ring-accent-bright", "ring-offset-2", "ring-offset-background")
                  setTimeout(() => {
                    element.classList.remove("ring-2", "ring-accent-bright", "ring-offset-2", "ring-offset-background")
                  }, 3000)
                }
              }}
              className="shrink-0 rounded-md bg-accent-bright px-3 py-2 text-sm font-medium text-black hover:bg-accent-bright/90 transition-colors"
            >
              View
            </button>
          ),
        })
      }
    }

    if (news.length > 0) {
      previousNewsIdsRef.current = new Set(news.map((item: NewsItem) => item.id))
    }
  }, [news, autoRefresh, toast])

  const handleRefresh = async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true)
    }
    try {
      await refreshNews()
      setLastUpdateTime(new Date())
      if (!silent) {
        setNewArticleCount(0)
        toast({
          title: "Refreshed",
          description: "News feed updated successfully",
        })
      }
    } catch (error) {
      console.error("Failed to refresh news:", error)
      if (!silent) {
        toast({
          title: "Refresh failed",
          description: "Could not update news feed",
          variant: "destructive",
        })
      }
    } finally {
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked)
    toast({
      title: checked ? "Auto-refresh enabled" : "Auto-refresh disabled",
      description: checked
        ? "News will update automatically every 30 seconds"
        : "News will only update when you manually refresh",
    })
  }

  const handleLiveToggle = (checked: boolean) => {
    setIsLive(checked)
    if (checked) {
      setLastUpdateTime(new Date()) // Reset timer when enabling
      toast({
        title: "🔴 Live Mode Enabled",
        description: "Feed will refresh every 60 seconds",
      })
    } else {
      toast({
        title: "⏸ Live Mode Paused",
        description: "Auto-refresh disabled",
      })
    }
  }

  // Auto-refresh polling: every 60 seconds when live
  useEffect(() => {
    if (!isLive) return

    const intervalId = setInterval(() => {
      // Refresh silently in background (no toast, no loading spinner)
      // Update lastUpdateTime silently
      refreshNews().then(() => {
        setLastUpdateTime(new Date())
      }).catch((error) => {
        console.error("Background refresh failed:", error)
      })
    }, 60000) // 60 seconds

    return () => clearInterval(intervalId)
  }, [isLive, refreshNews])

  const isRelevantToPortfolio = (article: NewsItem): boolean => {
    if (portfolio.length === 0) return false

    const text = `${article.title} ${article.summary}`.toUpperCase()
    const tickers = detectTickers(text)

    return portfolio.some((asset) => text.includes(asset.symbol) || tickers.some((t) => t.symbol === asset.symbol))
  }

  // Simplified: API handles all filtering via custom script
  // Only apply search filter on frontend (real-time search)
  const filteredNews = useMemo(
    () => {
      if (!searchQuery) return news
      
      const query = searchQuery.toLowerCase()
      return news.filter((item: NewsItem) =>
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        (item.keywords && item.keywords.some((keyword: string) => keyword.toLowerCase().includes(query))) ||
        item.source.toLowerCase().includes(query)
      )
    },
    [news, searchQuery],
  )

  // Sort by portfolio relevance if portfolio exists, otherwise keep API order
  const sortedNews = useMemo(() => {
    if (portfolio.length === 0) return filteredNews
    
    return [...filteredNews].sort((a, b) => {
      const aRelevant = isRelevantToPortfolio(a)
      const bRelevant = isRelevantToPortfolio(b)
      if (aRelevant && !bRelevant) return -1
      if (!aRelevant && bRelevant) return 1
      return 0
    })
  }, [filteredNews, portfolio])

  const articleCounts = news.reduce(
    (acc: Record<NewsCategoryType, number>, item: NewsItem) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      acc["all"] = (acc["all"] || 0) + 1
      return acc
    },
    {} as Record<NewsCategoryType, number>,
  )


  return (
    <div className="min-h-screen bg-transparent relative z-10">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md supports-[backdrop-filter]:bg-black/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* First row: Branding and primary actions */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Image
                  src="/images/design-mode/41e2a965-c253-492a-8fe2-706b2c00606a.png"
                  alt="WatchCatalyst"
                  width={32}
                  height={32}
                  className="rounded-lg sm:w-10 sm:h-10"
                />
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground whitespace-nowrap">
                  Watch<span className="text-accent-bright">Catalyst</span>
                </h1>
              </div>
              <a
                href="https://x.com/WatchCatalyst"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-md bg-foreground/10 hover:bg-foreground/20 transition-colors group flex-shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-foreground group-hover:scale-110 transition-transform"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="hidden md:inline text-sm font-medium text-foreground">@WatchCatalyst</span>
              </a>
              <div className="hidden lg:block h-6 w-px bg-border" />
              <p className="hidden lg:block text-sm text-muted-foreground whitespace-nowrap">
                Real-time news intelligence for traders
              </p>
            </div>

            {/* Right side: Compact action buttons */}
            <div className="flex items-center gap-2">
              <PriceAlertsManager portfolio={portfolio} />
              <PortfolioManager onPortfolioChange={(assets) => setPortfolio(assets)} />
              <SettingsDialog />
              <SystemHealth />

              {/* Live toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2 border-l border-border pl-1.5 sm:pl-2">
                {isLive ? (
                  <Radio className="h-4 w-4 text-accent-bright fill-accent-bright" />
                ) : (
                  <Pause className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch id="live-toggle" checked={isLive} onCheckedChange={handleLiveToggle} />
                <Label htmlFor="live-toggle" className="text-sm cursor-pointer whitespace-nowrap hidden sm:inline">
                  {isLive ? "🔴 Live" : "⏸ Paused"}
                </Label>
              </div>

              {/* Last updated indicator */}
              {isLive && (
                <div className="hidden md:flex items-center text-xs text-muted-foreground">
                  <LastUpdatedDisplay lastUpdateTime={lastUpdateTime} />
                </div>
              )}

              {/* Reset button */}
              <Button
                onClick={() => {
                  // Clear all filters and localStorage
                  localStorage.removeItem("watchcatalyst-preferences")
                  localStorage.removeItem("watchcatalyst-bookmarks")
                  localStorage.removeItem("watchcatalyst-portfolio")
                  localStorage.removeItem("watchcatalyst-alerts")
                  // Reset state
                  setSearchQuery("")
                  setSelectedCategory("all")
                  setShowWatchlistOnly(false)
                  setSelectedTopics([])
                  setMinRelevanceScore(0)
                  // Refresh news
                  handleRefresh(false)
                  toast({
                    title: "Reset to US defaults",
                    description: "All filters cleared, showing US market feed",
                  })
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 sm:gap-2 bg-transparent h-8 px-2 sm:px-3"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>

              {/* Refresh button */}
              <Button
                onClick={() => handleRefresh(false)}
                variant="outline"
                size="sm"
                disabled={isValidating || isRefreshing}
                className="gap-1.5 sm:gap-2 bg-transparent relative h-8 px-2 sm:px-3"
              >
                <RefreshCw className={`h-4 w-4 ${isValidating || isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
                {newArticleCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent-bright text-black text-[10px] font-bold">
                    {newArticleCount}
                  </Badge>
                )}
              </Button>
              {isRefreshing && !isValidating && (
                <span className="hidden lg:inline text-xs text-muted-foreground">Updating...</span>
              )}
            </div>
          </div>

          {/* Second row: Search bar */}
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content area - news articles */}
          <div className="lg:col-span-3 space-y-4">
            {/* Context Chart - Only show when filtering by symbol */}
            {searchQuery && (
              <ContextChart symbol={searchQuery} articles={filteredNews} />
            )}

            {/* Search and View Controls */}

            {/* View Controls */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Card
                </Button>
                <Button
                  variant={viewMode === "compact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4 mr-2" />
                  Compact
                </Button>
              </div>
            </div>

            {error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load news. Please try again.</p>
              </div>
            ) : isValidating && !news.length ? (
              <div className={viewMode === "compact" ? "space-y-2" : "space-y-4"}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <NewsCardSkeleton key={i} compact={viewMode === "compact"} />
                ))}
              </div>
            ) : sortedNews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? "No news found matching your search" : "No news available at this time"}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Try refreshing the feed or check back later.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className={viewMode === "compact" ? "space-y-2" : "space-y-4"}>
                  {sortedNews.map((item) => {
                    const isHolding = isRelevantToPortfolio(item)
                    return (
                      <div key={item.id} className="relative">
                        <NewsCard
                          news={item}
                          onBookmark={handleBookmark}
                          isBookmarked={bookmarkedIds.has(item.id)}
                          isRelevantToPortfolio={isHolding}
                          isHolding={isHolding}
                          compact={viewMode === "compact"}
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 text-center">
                  <Button
                    onClick={() => setSize(size + 1)}
                    disabled={isLoadingMore || isReachingEnd}
                    variant="outline"
                    className="w-full md:w-auto min-w-[200px]"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Loading more...
                      </>
                    ) : isReachingEnd ? (
                      "No more articles"
                    ) : (
                      "Load More News"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <WatchlistSidebar />
            
            {/* Crypto Prices - Top of sidebar */}
            <CryptoPrices />
            
            {/* Social Sentiment */}
            <div className="max-h-[500px] overflow-hidden">
              <SocialSentiment />
            </div>
            
            {/* Earnings Calendar */}
            <div className="max-h-[500px] overflow-hidden">
              <EarningsCalendar />
            </div>

            {/* Economic Calendar */}
            <div className="max-h-[400px] overflow-hidden">
              <CatalystCalendar />
            </div>

            {/* Analyst Ratings */}
            <div className="max-h-[500px] overflow-hidden">
              <AnalystRatings />
            </div>

            {/* SEC Filings */}
            <div className="max-h-[500px] overflow-hidden">
              <SECFilings />
            </div>

            {/* Latest Trades Feed */}
            <div className="max-h-[500px] overflow-hidden">
              <LatestTrades />
            </div>

            {/* Congress trading API is only available for FMP legacy users (subscribed before Aug 31, 2025) */}
            <div className="max-h-[500px] overflow-hidden">
              <CongressTracker portfolio={portfolio} />
            </div>

            {news.length > 0 && (
              <>
                <MarketOverview news={news} />
                <TrendingTopics news={news} />
                <SmartAlertsPanel news={news} />
              </>
            )}

            <div className="sticky top-24 p-4 rounded-lg bg-zinc-950/50 backdrop-blur-sm border border-white/10">
              <h3 className="text-sm font-semibold mb-3">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>/</span>
                  <span>Search</span>
                </div>
                <div className="flex justify-between">
                  <span>R</span>
                  <span>Refresh</span>
                </div>
                <div className="flex justify-between">
                  <span>A, C, S...</span>
                  <span>Categories</span>
                </div>
                <div className="flex justify-between">
                  <span>ESC</span>
                  <span>Clear search</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Smart Browser Notifications - watches news and sends system notifications */}
      <SmartNotifications news={news} portfolio={portfolio} />

      <ArticleDetailModal
        news={selectedArticle}
        open={!!selectedArticle}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />
    </div>
  )
}
