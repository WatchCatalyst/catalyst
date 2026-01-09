"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { NewsCard } from "@/components/news-card"
import { SearchBar } from "@/components/search-bar"
import { TrendingTopics } from "@/components/trending-topics"
import { ArticleDetailModal } from "@/components/article-detail-modal"
import { SettingsDialog } from "@/components/settings-dialog"
import { SmartAlertsPanel } from "@/components/smart-alerts-panel"
import { RefreshCw, LayoutGrid, List, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import useSWRInfinite from "swr/infinite"
import { detectTickers } from "@/lib/ticker-detection"
import Image from "next/image"
import { CatalystCalendar } from "@/components/catalyst-calendar"
import { WatchlistSidebar } from "@/components/watchlist-sidebar"
import { NewsCardSkeleton } from "@/components/news-card-skeleton"
import { PortfolioManager } from "@/components/portfolio-manager"
import { PriceAlertsManager } from "@/components/price-alerts-manager"
import { CongressTracker } from "@/components/congress-tracker"
import { GovContractsTracker } from "@/components/gov-contracts-tracker"
import { LatestTrades } from "@/components/latest-trades"
import { SmartNotifications } from "@/components/smart-notifications"
import { ContextChart } from "@/components/context-chart"
import { EarningsCalendar } from "@/components/earnings-calendar"
import { SECFilings } from "@/components/sec-filings"
import { CryptoPrices } from "@/components/crypto-prices"
import { SocialSentiment } from "@/components/social-sentiment"
import { MagneticButton } from "@/components/magnetic-button"
import { AuthButton } from "@/components/auth-button"
import { CryptoChartModal } from "@/components/crypto-chart-modal"

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
  const [isPaginationLoad, setIsPaginationLoad] = useState(false) // Track pagination vs refresh
  const previousSizeRef = useRef<number>(1) // Track previous page size
  const [minRelevanceScore, setMinRelevanceScore] = useState(60)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [headerPrices, setHeaderPrices] = useState<{
    SOL: { price: number; change: number } | null
    BTC: { price: number; change: number } | null
    ETH: { price: number; change: number } | null
  }>({ SOL: null, BTC: null, ETH: null })
  const [logoErrors, setLogoErrors] = useState<{ [key: string]: boolean }>({})
  const [chartSymbol, setChartSymbol] = useState<"BTC" | "ETH" | "SOL" | null>(null)

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
    // Add cache-busting timestamp to force fresh data
    const bustParam = `bust=${Date.now()}`
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}${bustParam}`
    
    const response = await fetch(fullUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })
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
      revalidateFirstPage: true,  // Always get fresh first page
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,        // Don't dedupe - always fetch
      refreshInterval: 0,         // Manual refresh only
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

  // Load previously seen article IDs from localStorage on mount
  useEffect(() => {
    const savedIds = localStorage.getItem("watchcatalyst-seen-articles")
    if (savedIds) {
      try {
        const parsed = JSON.parse(savedIds)
        previousNewsIdsRef.current = new Set(parsed)
      } catch (e) {
        console.error("Failed to parse seen articles:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (news.length === 0) return
    
    // Check if this is pagination (size increased) vs refresh
    const isPagination = size > previousSizeRef.current
    previousSizeRef.current = size
    
    // Load seen IDs from localStorage if empty
    if (previousNewsIdsRef.current.size === 0) {
      const savedIds = localStorage.getItem("watchcatalyst-seen-articles")
      if (savedIds) {
        try {
          const parsed = JSON.parse(savedIds)
          previousNewsIdsRef.current = new Set(parsed)
        } catch (e) {
          console.error("Failed to parse seen articles:", e)
        }
      }
    }

    // On first load with no previous IDs, just save current IDs (don't notify)
    if (previousNewsIdsRef.current.size === 0) {
      const currentIds = news.map((item: NewsItem) => item.id)
      previousNewsIdsRef.current = new Set(currentIds)
      localStorage.setItem("watchcatalyst-seen-articles", JSON.stringify(currentIds))
      return
    }

    // Skip notifications for pagination (Load More) - only notify on refresh
    if (isPagination || isPaginationLoad) {
      // Just update the seen IDs without notifying
      const allIds = news.map((item: NewsItem) => item.id)
      previousNewsIdsRef.current = new Set(allIds)
      const idsToSave = allIds.slice(0, 200)
      localStorage.setItem("watchcatalyst-seen-articles", JSON.stringify(idsToSave))
      setIsPaginationLoad(false)
      return
    }

    const newItems = news.filter((item: NewsItem) => !previousNewsIdsRef.current.has(item.id))

    // Only notify if:
    // 1. There are new items
    // 2. NOT all items are new (meaning we have existing + new, not a full refresh)
    // 3. New items are at the TOP (first few articles)
    const topNewItems = newItems.filter((item, index) => {
      const itemIndex = news.findIndex(n => n.id === item.id)
      return itemIndex < 5 // Only notify if new items are in top 5
    })

    if (topNewItems.length > 0 && newItems.length < news.length) {
      setNewArticleCount(topNewItems.length)
      setLastUpdateTime(new Date())

      // DISABLED for testing - new article toast notifications
      // const prefs = localStorage.getItem("watchcatalyst-preferences")
      // let shouldNotify = true
      // if (prefs) {
      //   const parsed = JSON.parse(prefs)
      //   if (!parsed.enabled) shouldNotify = false
      // }
      //
      // if (shouldNotify) {
      //   const firstNewItem = topNewItems[0]
      //   toast({
      //     title: `${topNewItems.length} New ${topNewItems.length === 1 ? "Article" : "Articles"}`,
      //     description: firstNewItem?.title || "Check the latest updates",
      //     action: (
      //       <button
      //         onClick={() => {
      //           const element = document.getElementById(`news-${firstNewItem.id}`)
      //           if (element) {
      //             element.scrollIntoView({ behavior: "smooth", block: "center" })
      //             element.classList.add("ring-2", "ring-accent-bright", "ring-offset-2", "ring-offset-background")
      //             setTimeout(() => {
      //               element.classList.remove("ring-2", "ring-accent-bright", "ring-offset-2", "ring-offset-background")
      //             }, 3000)
      //           }
      //         }}
      //         className="shrink-0 rounded-md bg-accent-bright px-3 py-2 text-sm font-medium text-black hover:bg-accent-bright/90 transition-colors"
      //       >
      //         View
      //       </button>
      //     ),
      //   })
      // }
    }

    // Update seen IDs
    const allIds = news.map((item: NewsItem) => item.id)
    previousNewsIdsRef.current = new Set(allIds)
    // Keep only last 200 IDs to prevent localStorage from growing too large
    const idsToSave = allIds.slice(0, 200)
    localStorage.setItem("watchcatalyst-seen-articles", JSON.stringify(idsToSave))
  }, [news, toast, size, isPaginationLoad])

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

  // Fetch header crypto prices
  useEffect(() => {
    async function fetchHeaderPrices() {
      try {
        const response = await fetch("/api/crypto/prices?symbols=SOL,BTC,ETH&limit=10")
        const data = await response.json()
        
        if (data.success && data.data) {
          const prices: Record<string, { price: number; change: number }> = {}
          data.data.forEach((crypto: any) => {
            if (crypto.symbol === 'SOL') {
              prices.SOL = { price: crypto.price, change: crypto.changePercent24h }
            } else if (crypto.symbol === 'BTC') {
              prices.BTC = { price: crypto.price, change: crypto.changePercent24h }
            } else if (crypto.symbol === 'ETH') {
              prices.ETH = { price: crypto.price, change: crypto.changePercent24h }
            }
          })
          setHeaderPrices(prev => ({
            SOL: prices.SOL || prev.SOL,
            BTC: prices.BTC || prev.BTC,
            ETH: prices.ETH || prev.ETH,
          }))
        }
      } catch (error) {
        console.error("Failed to fetch header prices:", error)
      }
    }

    fetchHeaderPrices()
    // Update every 2 minutes (matches server cache - prevents unnecessary requests)
    const interval = setInterval(fetchHeaderPrices, 120000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh polling: every 2 minutes when live (matches server cache)
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
    }, 120000) // 2 minutes (matches server cache - prevents unnecessary requests)

    return () => clearInterval(intervalId)
  }, [isLive, refreshNews])

  const isRelevantToPortfolio = (article: NewsItem): boolean => {
    if (portfolio.length === 0) return false

    const text = `${article.title} ${article.summary}`.toUpperCase()
    const tickers = detectTickers(text)

    // Use word boundaries to avoid matching symbols inside other words (e.g., "SOL" in "solution")
    return portfolio.some((asset) => {
      const symbol = asset.symbol.toUpperCase()
      const symbolRegex = new RegExp(`(\\$${symbol}|\\b${symbol}\\b)`, 'i')
      return symbolRegex.test(text) || tickers.some((t) => t.symbol === asset.symbol)
    })
  }

  // Simplified: API handles all filtering via custom script
  // Only apply search filter on frontend (real-time search)
  const filteredNews = useMemo(
    () => {
      let result = news
      
      // Filter by bookmarks if showWatchlistOnly is true
      if (showWatchlistOnly && bookmarkedIds.size > 0) {
        result = result.filter((item: NewsItem) => bookmarkedIds.has(item.id))
      }
      
      // Then apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        result = result.filter((item: NewsItem) =>
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          (item.keywords && item.keywords.some((keyword: string) => keyword.toLowerCase().includes(query))) ||
          item.source.toLowerCase().includes(query)
        )
      }
      
      return result
    },
    [news, searchQuery, showWatchlistOnly, bookmarkedIds],
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
      {/* Top Announcement Bar */}
      <div className="w-full bg-gradient-to-r from-black/90 via-zinc-950/90 to-black/90 backdrop-blur-md border-b border-white/5 py-1.5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/0 via-cyan-600/5 to-cyan-600/0" />
        <div className="relative flex items-center justify-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-zinc-500 tracking-wider">POWERED BY</span>
          <span className="text-cyan-400 font-semibold tracking-wider gradient-text-cyan">WATCHCATALYST</span>
          <span className="text-zinc-500 tracking-wider">TECHNOLOGY</span>
          <span className="text-zinc-500 ml-1 animate-pulse">→</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 glass-header border-b border-white/5">
        <div className="w-full px-4 lg:px-6">
          <div className="flex items-center justify-between h-12">
            {/* Left: Logo + Brand + Price Tickers */}
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <Image
                  src="/favicon.png"
                  alt="WatchCatalyst"
                  width={32}
                  height={32}
                  className="rounded"
                  priority
                />
                <h1 className="text-sm font-bold text-white whitespace-nowrap tracking-tight">
                  WATCH<span className="gradient-text-cyan text-glow-cyan">CATALYST</span>
                </h1>
              </div>
              
              {/* Divider */}
              <div className="hidden lg:block h-4 w-px bg-white/20" />
              
              {/* Live Price Tickers - Clickable to open charts */}
              <div className="hidden lg:flex items-center gap-5">
                {/* Solana */}
                {headerPrices.SOL && (
                  <button 
                    onClick={() => setChartSymbol("SOL")}
                    className="flex items-center gap-2 px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    title="Click to view SOL chart"
                  >
                    {logoErrors.solana ? (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">S</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white">
                        <Image
                          src="/images/crypto-logos/solana.png"
                          alt="Solana"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                          onError={() => setLogoErrors(prev => ({ ...prev, solana: true }))}
                        />
                      </div>
                    )}
                    <span className="text-white font-mono text-sm">
                      ${headerPrices.SOL.price >= 1000 
                        ? `${(headerPrices.SOL.price / 1000).toFixed(2)}K` 
                        : headerPrices.SOL.price.toFixed(2)}
                    </span>
                    <span className={`font-mono text-xs ${headerPrices.SOL.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {headerPrices.SOL.change >= 0 ? '+' : ''}{headerPrices.SOL.change.toFixed(1)}%
                    </span>
                  </button>
                )}
                
                {/* Bitcoin */}
                {headerPrices.BTC && (
                  <button 
                    onClick={() => setChartSymbol("BTC")}
                    className="flex items-center gap-2 px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    title="Click to view BTC chart"
                  >
                    {logoErrors.bitcoin ? (
                      <div className="w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">₿</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white">
                        <Image
                          src="/images/crypto-logos/bitcoin.png"
                          alt="Bitcoin"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                          onError={() => setLogoErrors(prev => ({ ...prev, bitcoin: true }))}
                        />
                      </div>
                    )}
                    <span className="text-white font-mono text-sm">
                      ${headerPrices.BTC.price >= 1000 
                        ? `${(headerPrices.BTC.price / 1000).toFixed(1)}K` 
                        : headerPrices.BTC.price.toFixed(2)}
                    </span>
                    <span className={`font-mono text-xs ${headerPrices.BTC.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {headerPrices.BTC.change >= 0 ? '+' : ''}{headerPrices.BTC.change.toFixed(1)}%
                    </span>
                  </button>
                )}
                
                {/* Ethereum */}
                {headerPrices.ETH && (
                  <button 
                    onClick={() => setChartSymbol("ETH")}
                    className="flex items-center gap-2 px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                    title="Click to view ETH chart"
                  >
                    {logoErrors.ethereum ? (
                      <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">Ξ</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white">
                        <Image
                          src="/images/crypto-logos/ethereum.png"
                          alt="Ethereum"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                          onError={() => setLogoErrors(prev => ({ ...prev, ethereum: true }))}
                        />
                      </div>
                    )}
                    <span className="text-white font-mono text-sm">
                      ${headerPrices.ETH.price >= 1000 
                        ? `${(headerPrices.ETH.price / 1000).toFixed(1)}K` 
                        : headerPrices.ETH.price.toFixed(0)}
                    </span>
                    <span className={`font-mono text-xs ${headerPrices.ETH.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {headerPrices.ETH.change >= 0 ? '+' : ''}{headerPrices.ETH.change.toFixed(1)}%
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Navigation + Actions */}
            <div className="flex items-center gap-1">
              {/* Live Toggle - Styled like reference */}
              <button 
                onClick={() => handleLiveToggle(!isLive)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all relative overflow-hidden ${
                  isLive 
                    ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 pulse-glow-cyan hover:bg-cyan-600/30" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                {isLive && (
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-600/0 via-cyan-600/20 to-cyan-600/0 animate-shimmer" />
                )}
                <span className="relative flex items-center gap-1.5">
                  {isLive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                  {isLive ? "LIVE" : "PAUSED"}
                </span>
              </button>

              {/* Nav Links */}
              <PriceAlertsManager portfolio={portfolio} />
              <PortfolioManager onPortfolioChange={(assets) => setPortfolio(assets)} />
              <SettingsDialog />

              {/* Social Icons */}
              <a
                href="https://x.com/WatchCatalyst"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                title="Follow on X"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/WatchCatalyst/catalyst"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                title="View on GitHub"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>

              {/* Google Sign In Button - Optional auth */}
              <AuthButton />

              {/* Cyan Action Button - Like "LAUNCH APP" in reference */}
              <MagneticButton
                onClick={() => handleRefresh(false)}
                disabled={isValidating || isRefreshing}
                className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-semibold px-5 h-8 text-xs tracking-wide rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50 relative ml-2 hover:scale-105 btn-accent-glow ripple-effect"
                magneticDistance={15}
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${isValidating || isRefreshing ? "animate-spin" : ""}`} />
                REFRESH
                {newArticleCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 text-black text-[10px] font-bold shadow-lg shadow-emerald-500/50 animate-pulse pulse-ring">
                    {newArticleCount}
                  </span>
                )}
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="w-full px-4 lg:px-6 pb-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 perspective-3d">
          {/* Main content area - news articles */}
          <div className="lg:col-span-3 space-y-4">
            {/* Context Chart - Only show when filtering by symbol */}
            {searchQuery && (
              <ContextChart symbol={searchQuery} articles={filteredNews} />
            )}

            {/* Search and View Controls */}

            {/* View Controls */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  variant={showWatchlistOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                  className={`h-8 px-3 transition-all hover:scale-105 ${
                    showWatchlistOnly 
                      ? "bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/30" 
                      : "hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${showWatchlistOnly ? "fill-current" : ""}`} />
                  Bookmarks {bookmarkedIds.size > 0 && `(${bookmarkedIds.size})`}
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className={`h-8 px-3 transition-all hover:scale-105 ${
                    viewMode === "card" 
                      ? "bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/30" 
                      : "hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Card
                </Button>
                <Button
                  variant={viewMode === "compact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className={`h-8 px-3 transition-all hover:scale-105 ${
                    viewMode === "compact" 
                      ? "bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/30" 
                      : "hover:bg-white/5 hover:border-white/20"
                  }`}
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
                  {showWatchlistOnly 
                    ? "No bookmarked articles found" 
                    : searchQuery 
                    ? "No news found matching your search" 
                    : "No news available at this time"}
                </p>
                {showWatchlistOnly && bookmarkedIds.size === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Bookmark articles by clicking the bookmark icon on any news card.
                  </p>
                )}
                {!searchQuery && !showWatchlistOnly && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Try refreshing the feed or check back later.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className={viewMode === "compact" ? "space-y-2" : "space-y-4"} style={{ minHeight: 0 }}>
                  {sortedNews.map((item, index) => {
                    const isHolding = isRelevantToPortfolio(item)
                    return (
                      <NewsCard
                        key={`${item.id}-${item.timestamp}`}
                        news={item}
                        onBookmark={handleBookmark}
                        isBookmarked={bookmarkedIds.has(item.id)}
                        isRelevantToPortfolio={isHolding}
                        isHolding={isHolding}
                        compact={viewMode === "compact"}
                        index={index}
                      />
                    )
                  })}
                </div>

                <div className="pt-4 text-center">
                  <MagneticButton
                    onClick={() => {
                      setIsPaginationLoad(true)
                      setSize(size + 1)
                    }}
                    disabled={isLoadingMore || isReachingEnd}
                    variant="outline"
                    className="w-full md:w-auto min-w-[200px] bg-gradient-to-r from-zinc-900/50 to-zinc-950/50 backdrop-blur-md border-white/10 hover:border-cyan-500/50 hover:bg-gradient-to-r hover:from-cyan-600/20 hover:to-cyan-700/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ripple-effect"
                    magneticDistance={10}
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
                  </MagneticButton>
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

            {/* Government Contracts - Quiver API */}
            <div className="max-h-[500px] overflow-hidden">
              <GovContractsTracker portfolio={portfolio} />
            </div>

            {news.length > 0 && (
              <>
                <TrendingTopics news={news} />
                <SmartAlertsPanel news={news} />
              </>
            )}

            <div className="sticky top-24 p-4 rounded-lg glass-premium border border-white/10">
              <h3 className="text-sm font-semibold mb-3 font-display gradient-text-cyan">Keyboard Shortcuts</h3>
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

      {/* Smart Browser Notifications - DISABLED for testing */}
      {/* <SmartNotifications news={news} portfolio={portfolio} /> */}

      <ArticleDetailModal
        news={selectedArticle}
        open={!!selectedArticle}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      />

      {/* Live Crypto Chart Modal */}
      <CryptoChartModal
        symbol={chartSymbol}
        open={!!chartSymbol}
        onOpenChange={(open) => !open && setChartSymbol(null)}
      />

      {/* Footer Disclaimer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
            <span className="text-yellow-500 font-semibold">⚠️ NOT FINANCIAL ADVICE</span>
            {" — "}
            This platform is for informational purposes only. Always conduct your own research (DYOR). 
            Never invest more than you can afford to lose. Past performance is not indicative of future results.
          </p>
        </div>
      </footer>
    </div>
  )
}
