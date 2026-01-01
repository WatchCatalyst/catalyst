"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, TrendingUp, TrendingDown, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export function EarningsCalendar() {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const response = await fetch("/api/earnings?limit=20")
        const data = await response.json()
        
        if (data.success) {
          setEarnings(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch earnings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Upcoming Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {earnings.slice(0, 15).map((earning, idx) => {
            const epsBeat = earning.eps && earning.epsEstimated 
              ? earning.eps > earning.epsEstimated 
              : null
            
            return (
              <div
                key={`${earning.symbol}-${earning.date}-${idx}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{earning.symbol}</span>
                    {getTimeBadge(earning.time)}
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
      </CardContent>
    </Card>
  )
}




