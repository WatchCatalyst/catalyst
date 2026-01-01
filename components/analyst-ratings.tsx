"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Minus, Loader2, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AnalystRating {
  symbol: string
  name: string
  rating: string
  ratingScore: number
  targetPrice?: number
  currentPrice?: number
  date: string
  analyst?: string
  firm?: string
}

export function AnalystRatings() {
  const [ratings, setRatings] = useState<AnalystRating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRatings() {
      try {
        const response = await fetch("/api/analyst-ratings?limit=15")
        const data = await response.json()
        
        if (data.success) {
          setRatings(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch analyst ratings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRatings()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "1d ago"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getRatingIcon = (rating: string, score: number) => {
    if (score >= 4) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (score <= 2) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-yellow-500" />
  }

  const getRatingBadgeColor = (score: number) => {
    if (score >= 4) return "bg-green-500/10 text-green-400 border-green-500/20"
    if (score <= 2) return "bg-red-500/10 text-red-400 border-red-500/20"
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  }

  const getUpsidePercent = (target?: number, current?: number) => {
    if (!target || !current || current === 0) return null
    const percent = ((target - current) / current) * 100
    return percent > 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5" />
            Analyst Ratings
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

  if (ratings.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5" />
            Analyst Ratings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent analyst ratings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5" />
          Analyst Ratings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {ratings.map((rating, idx) => {
            const upside = getUpsidePercent(rating.targetPrice, rating.currentPrice)
            
            return (
              <div
                key={`${rating.symbol}-${rating.date}-${idx}`}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{rating.symbol}</span>
                    {getRatingIcon(rating.rating, rating.ratingScore)}
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 ${getRatingBadgeColor(rating.ratingScore)}`}
                    >
                      {rating.rating}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{rating.name}</p>
                  {rating.analyst && rating.firm && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {rating.analyst} ({rating.firm})
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {rating.targetPrice && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium">${rating.targetPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {upside && (
                      <span className={`text-xs font-medium ${upside.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {upside}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{formatDate(rating.date)}</div>
                  {rating.currentPrice && (
                    <div className="text-xs font-medium mt-1">${rating.currentPrice.toFixed(2)}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}




