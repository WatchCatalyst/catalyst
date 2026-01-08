"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, TrendingUp, TrendingDown, ExternalLink, Loader2, Info, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface EarningsEvent {
  date: string
  symbol: string
  name: string
  eps?: number
  epsEstimated?: number
  time: string
  revenue?: number
  revenueEstimated?: number
}

interface EarningsResponse {
  success: boolean
  data: EarningsEvent[]
  timestamp?: string
  count?: number
}

export function EarningsCalendar() {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const response = await fetch("/api/earnings?limit=20")
        const data: EarningsResponse = await response.json()
        
        if (data.success) {
          setEarnings(data.data || [])
          if (data.timestamp) {
            setLastUpdated(new Date(data.timestamp))
          }
        }
      } catch (error) {
        console.error("Failed to fetch earnings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [])

  const getVerificationLinks = (symbol: string) => {
    return [
      {
        name: "TradingView",
        url: `https://www.tradingview.com/symbols/${symbol}/`,
      },
      {
        name: "Yahoo Finance",
        url: `https://finance.yahoo.com/quote/${symbol}`,
      },
      {
        name: "MarketWatch",
        url: `https://www.marketwatch.com/investing/stock/${symbol}`,
      },
    ]
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (dateStr: string) => {
    // Parse date string as date-only (YYYY-MM-DD) to avoid timezone issues
    // Dates are returned in YYYY-MM-DD format, which should be interpreted as market date (EST)
    const [year, month, day] = dateStr.split('-').map(Number)
    
    // Get today's date components in EST timezone for comparison
    const now = new Date()
    const estFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    const estParts = estFormatter.formatToParts(now)
    const estTodayYear = parseInt(estParts.find(p => p.type === "year")?.value || "0")
    const estTodayMonth = parseInt(estParts.find(p => p.type === "month")?.value || "0")
    const estTodayDay = parseInt(estParts.find(p => p.type === "day")?.value || "0")
    
    // Compare date components directly (no timezone conversion needed)
    if (year === estTodayYear && month === estTodayMonth && day === estTodayDay) {
      return "Today"
    }
    
    // Calculate tomorrow in EST
    const estToday = new Date(estTodayYear, estTodayMonth - 1, estTodayDay)
    const estTomorrow = new Date(estToday)
    estTomorrow.setDate(estTomorrow.getDate() + 1)
    
    if (year === estTomorrow.getFullYear() && 
        month === estTomorrow.getMonth() + 1 && 
        day === estTomorrow.getDate()) {
      return "Tomorrow"
    }
    
    // Format the date - create a date object and format in EST
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      timeZone: "America/New_York"
    })
  }

  const getTimeBadge = (time: string) => {
    const isAMC = time.toLowerCase().includes("amc") || time.toLowerCase().includes("after")
    return (
      <Badge variant={isAMC ? "secondary" : "outline"} className="text-xs">
        {isAMC ? "After Close" : "Before Open"}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Upcoming Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (earnings.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Upcoming Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No earnings events scheduled</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Upcoming Earnings
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                <Info className="h-3.5 w-3.5" />
                <span>Live Data</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-xs">
                <p>Real-time earnings data</p>
                {lastUpdated && (
                  <p className="text-muted-foreground">Updated: {formatTimeAgo(lastUpdated)}</p>
                )}
                <p className="text-muted-foreground mt-2">Click verification links to cross-check data</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {formatTimeAgo(lastUpdated)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {earnings.slice(0, 15).map((earning, idx) => {
            const epsBeat = earning.eps && earning.epsEstimated 
              ? earning.eps > earning.epsEstimated 
              : null
            const verificationLinks = getVerificationLinks(earning.symbol)
            
            return (
              <div
                key={`${earning.symbol}-${earning.date}-${idx}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{earning.symbol}</span>
                    {getTimeBadge(earning.time)}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={verificationLinks[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                          title="Verify this data - Click to check accuracy"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent-bright hover:text-accent-bright/80" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold text-yellow-500 mb-1">⚠️ Verify Before Trading</p>
                          <p className="text-muted-foreground mb-2">Cross-check dates and estimates:</p>
                          {verificationLinks.map((link) => (
                            <a
                              key={link.name}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-accent-bright hover:underline font-medium"
                            >
                              {link.name} →
                            </a>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{earning.name}</p>
                  {earning.epsEstimated && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground">EPS Est:</span>
                      <span className="text-xs font-medium">${earning.epsEstimated.toFixed(2)}</span>
                      {epsBeat !== null && (
                        epsBeat ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">{formatDate(earning.date)}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
            <p className="text-xs font-semibold text-yellow-500 mb-1 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Data Accuracy Notice
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Earnings dates and estimates are provided by third-party sources and may occasionally contain errors. 
              <strong className="text-foreground"> Always verify critical dates</strong> using the verification links before making trading decisions.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Dates in EST • Hover over items to verify
          </p>
        </div>
      </CardContent>
    </Card>
  )
}




