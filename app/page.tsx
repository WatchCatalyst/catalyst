"use client"

import { useState, useEffect, useRef } from "react"
import { NewsCard } from "@/components/news-card"
import { SearchBar } from "@/components/search-bar"
import { TrendingTopics } from "@/components/trending-topics"
import { ArticleDetailModal } from "@/components/article-detail-modal"
import { SettingsDialog } from "@/components/settings-dialog"
import { SmartAlertsPanel } from "@/components/smart-alerts-panel"
import { MarketOverview } from "@/components/market-overview"
import { RefreshCw, Bell, BellOff, LogOut, LogIn, LayoutGrid, List, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { newsClient } from "@/lib/news-client"
import { useToast } from "@/hooks/use-toast"
import useSWRInfinite from "swr/infinite"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { detectTickers } from "@/lib/ticker-detection"
import Image from "next/image"
import { CatalystCalendar } from "@/components/catalyst-calendar"
import { SystemHealth } from "@/components/system-health"
import { NewsCardSkeleton } from "@/components/news-card-skeleton"
import { PortfolioManager } from "@/components/portfolio-manager"
import { PriceAlertsManager } from "@/components/price-alerts-manager"
import { CongressTracker } from "@/components/congress-tracker"
import { LatestTrades } from "@/components/latest-trades"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

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
}

const getKey = (pageIndex: number, previousPageData: any, selectedCategory: NewsCategoryType) => {
  if (previousPageData && !previousPageData.length) return null // reached the end
  return `/api/news?category=${selectedCategory}&page=${pageIndex + 1}`
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryType>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [viewMode, setViewMode] = useState<"card" | "compact">("card")
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null)
  const [portfolio, setPortfolio] = useState<Array<{ symbol: string; type: string }>>([])
  const previousNewsIdsRef = useRef<Set<string>>(new Set())
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [newArticleCount, setNewArticleCount] = useState(0)
  const [minRelevanceScore, setMinRelevanceScore] = useState(60)

  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch bookmarks from Supabase
          const { data: bookmarks } = await supabase.from("bookmarks").select("news_id")

          if (bookmarks) {
            setBookmarkedIds(new Set(bookmarks.map((b) => b.news_id)))
          }

          // Fetch portfolio from Supabase
          const { data: portfolioItems } = await supabase.from("portfolio").select("symbol, type")

          if (portfolioItems) {
            setPortfolio(portfolioItems)
          }

          const { data: settingsData } = await supabase
            .from("user_settings")
            .select("preferences")
            .eq("user_id", user.id)
            .single()

          if (settingsData?.preferences) {
            setMinRelevanceScore(settingsData.preferences.minRelevanceScore || 60)
          }
        } else {
          // Fallback to local storage if no user
          const saved = localStorage.getItem("watchcatalyst-bookmarks")
          if (saved) {
            setBookmarkedIds(new Set(JSON.parse(saved)))
          }

          const savedPortfolio = localStorage.getItem("watchcatalyst-portfolio")
          if (savedPortfolio) {
            setPortfolio(JSON.parse(savedPortfolio))
          }

          const savedPrefs = localStorage.getItem("watchcatalyst-preferences")
          if (savedPrefs) {
            const parsed = JSON.parse(savedPrefs)
            setMinRelevanceScore(parsed.minRelevanceScore || 60)
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkUser()
  }, [])

  const fetchPage = (url: string) => {
    const params = new URLSearchParams(url.split("?")[1])
    const category = params.get("category") as NewsCategoryType
    const page = Number.parseInt(params.get("page") || "1", 10)
    return newsClient.fetchNews(category, page)
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
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < 25)

  const handleBookmark = async (id: string) => {
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

    if (user) {
      // Sync to Supabase
      if (isAdding) {
        await supabase.from("bookmarks").insert({ user_id: user.id, news_id: id })
      } else {
        await supabase.from("bookmarks").delete().match({ user_id: user.id, news_id: id })
      }
    } else {
      // Sync to Local Storage
      localStorage.setItem("watchcatalyst-bookmarks", JSON.stringify(Array.from(newBookmarks)))
    }
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

  const handleRefresh = async () => {
    await refreshNews()
    setLastUpdateTime(new Date())
    setNewArticleCount(0)
    toast({
      title: "Refreshed",
      description: "News feed updated successfully",
    })
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

  const isRelevantToPortfolio = (article: NewsItem): boolean => {
    if (portfolio.length === 0) return false

    const text = `${article.title} ${article.summary}`.toUpperCase()
    const tickers = detectTickers(text)

    return portfolio.some((asset) => text.includes(asset.symbol) || tickers.some((t) => t.symbol === asset.symbol))
  }

  const filteredNews = news.filter((item: NewsItem) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.keywords.some((keyword: string) => keyword.toLowerCase().includes(query)) ||
        item.source.toLowerCase().includes(query)

      if (!matchesSearch) return false
    }

    // Watchlist filter
    if (showWatchlistOnly) {
      const hasMatchingTicker = portfolio.some((holding) => {
        const tickerRegex = new RegExp(`\\$${holding.symbol}\\b`, "i")
        return tickerRegex.test(item.title) || tickerRegex.test(item.summary)
      })

      if (!hasMatchingTicker) return false
    }

    return true
  })

  const sortedNews = [...filteredNews].sort((a, b) => {
    const aRelevant = isRelevantToPortfolio(a)
    const bRelevant = isRelevantToPortfolio(b)
    if (aRelevant && !bRelevant) return -1
    if (!aRelevant && bRelevant) return 1
    return 0
  })

  const articleCounts = news.reduce(
    (acc: Record<NewsCategoryType, number>, item: NewsItem) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      acc["all"] = (acc["all"] || 0) + 1
      return acc
    },
    {} as Record<NewsCategoryType, number>,
  )

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBookmarkedIds(new Set())
    setPortfolio([])
    toast({ title: "Signed out successfully" })
    window.location.reload() // Reload to clear any state or cache
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

              {/* Auth section */}
              {!isAuthLoading &&
                (user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent-bright/10 text-accent-bright">
                            {user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-muted-foreground">{user.email}</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="bg-accent-bright text-black hover:bg-accent-bright/90 h-8 px-2 sm:px-3"
                  >
                    <Link href="/auth/login">
                      <LogIn className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Login</span>
                    </Link>
                  </Button>
                ))}

              {/* Live toggle */}
              <div className="flex items-center gap-1.5 sm:gap-2 border-l border-border pl-1.5 sm:pl-2">
                {autoRefresh ? (
                  <Bell className="h-4 w-4 text-accent-bright" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={handleAutoRefreshToggle} />
                <Label htmlFor="auto-refresh" className="text-sm cursor-pointer whitespace-nowrap hidden sm:inline">
                  Live
                </Label>
              </div>

              {/* Refresh button */}
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={isValidating}
                className="gap-1.5 sm:gap-2 bg-transparent relative h-8 px-2 sm:px-3"
              >
                <RefreshCw className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
                {newArticleCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent-bright text-black text-[10px] font-bold">
                    {newArticleCount}
                  </Badge>
                )}
              </Button>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
              {/* Control bar */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-border">
                {/* View mode toggles */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "card" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                    className="h-7 px-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "compact" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("compact")}
                    className="h-7 px-2"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Portfolio toggle */}
                <Button
                  variant={showWatchlistOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                  className="gap-2"
                >
                  <Star className={`h-4 w-4 ${showWatchlistOnly ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">Portfolio</span>
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
                <p className="text-muted-foreground">No news found matching your filters</p>
              </div>
            ) : (
              <>
                <div className={viewMode === "compact" ? "space-y-2" : "space-y-4"}>
                  {sortedNews.map((item) => (
                    <div key={item.id} className="relative">
                      <NewsCard
                        news={item}
                        onBookmark={handleBookmark}
                        isBookmarked={bookmarkedIds.has(item.id)}
                        isRelevantToPortfolio={isRelevantToPortfolio(item)}
                        compact={viewMode === "compact"}
                      />
                    </div>
                  ))}
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
            <div className="max-h-[400px] overflow-hidden">
              <CatalystCalendar />
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

            <div className="sticky top-24 p-4 rounded-lg bg-card/50 border border-border">
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

      <ArticleDetailModal
        news={selectedArticle}
        open={!!selectedArticle}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />
    </div>
  )
}
