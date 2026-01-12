"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Zap, DollarSign, Calendar, Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export interface OptionsFlowTrade {
  id: string
  symbol: string
  strike: number
  expiry: string
  type: "call" | "put"
  side: "buy" | "sell"
  premium: number
  volume: number
  openInterest: number
  timestamp: string
  unusual: boolean
  reason?: string
}

interface OptionsFlowTrackerProps {
  symbol?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function OptionsFlowTracker({ 
  symbol, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: OptionsFlowTrackerProps) {
  const [trades, setTrades] = useState<OptionsFlowTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { toast } = useToast()

  const fetchOptionsFlow = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (symbol) params.set("symbol", symbol)
      params.set("limit", "20")
      params.set("minPremium", "50000") // $50k minimum
      
      const response = await fetch(`/api/options-flow?${params.toString()}`)
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      if (result.data && Array.isArray(result.data)) {
        setTrades(result.data)
        setLastUpdate(new Date())
        
        // Show toast for new unusual activity
        const newUnusual = result.data.filter((trade: OptionsFlowTrade) => trade.unusual)
        if (newUnusual.length > 0 && trades.length > 0) {
          // Only notify if we have new unusual trades
          const newSymbols = newUnusual
            .map((t: OptionsFlowTrade) => t.symbol)
            .filter((s: string, i: number, arr: string[]) => arr.indexOf(s) === i)
          
          if (newSymbols.length > 0) {
            toast({
              title: "🚨 Unusual Options Activity",
              description: `${newSymbols.length} symbol${newSymbols.length > 1 ? 's' : ''} with unusual flow: ${newSymbols.join(", ")}`,
              duration: 5000,
            })
          }
        }
      } else {
        setTrades([])
      }
    } catch (err: any) {
      console.error("[Options Flow] Fetch error:", err)
      setError(err.message || "Failed to load options flow data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOptionsFlow()
    
    if (autoRefresh) {
      const interval = setInterval(fetchOptionsFlow, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [symbol, autoRefresh, refreshInterval])

  const formatPremium = (premium: number) => {
    if (premium >= 1000000) {
      return `$${(premium / 1000000).toFixed(2)}M`
    }
    return `$${(premium / 1000).toFixed(0)}K`
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
  }

  const getTypeColor = (type: "call" | "put") => {
    return type === "call" ? "text-green-400" : "text-red-400"
  }

  const getSideIcon = (side: "buy" | "sell") => {
    return side === "buy" ? TrendingUp : TrendingDown
  }

  return (
    <Card className="bg-black/40 backdrop-blur-sm border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-white">
            Options Flow {symbol && `• ${symbol}`}
          </h3>
          {trades.filter(t => t.unusual).length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {trades.filter(t => t.unusual).length} Unusual
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {formatTimeAgo(lastUpdate.toISOString())}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOptionsFlow}
            disabled={loading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs mb-4 p-2 bg-red-500/10 rounded">
          {error}
        </div>
      )}

      {loading && trades.length === 0 ? (
        <div className="text-muted-foreground text-xs text-center py-8">
          Loading options flow...
        </div>
      ) : trades.length === 0 ? (
        <div className="text-muted-foreground text-xs text-center py-8">
          No options flow data available
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {trades.map((trade) => {
            const SideIcon = getSideIcon(trade.side)
            return (
              <div
                key={trade.id}
                className={`p-3 rounded-lg border ${
                  trade.unusual
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-white/5 border-white/10"
                } hover:bg-white/10 transition-colors`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{trade.symbol}</span>
                    <Badge
                      variant={trade.type === "call" ? "default" : "destructive"}
                      className={`text-xs ${getTypeColor(trade.type)} bg-transparent border`}
                    >
                      {trade.type.toUpperCase()}
                    </Badge>
                    {trade.unusual && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        Unusual
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <SideIcon className={`h-3 w-3 ${
                      trade.side === "buy" ? "text-green-400" : "text-red-400"
                    }`} />
                    <span className="text-muted-foreground">{trade.side.toUpperCase()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Strike:</span>
                    <span className="text-white font-semibold">${trade.strike}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Exp:</span>
                    <span className="text-white">{new Date(trade.expiry).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-yellow-500" />
                    <span className="text-yellow-500 font-bold">
                      {formatPremium(trade.premium)}
                    </span>
                    <span className="text-muted-foreground text-xs ml-1">premium</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vol: {trade.volume.toLocaleString()} • OI: {trade.openInterest.toLocaleString()}
                  </div>
                </div>

                {trade.reason && (
                  <div className="mt-2 text-xs text-yellow-400/80">
                    ⚠️ {trade.reason}
                  </div>
                )}

                <div className="mt-2 text-xs text-muted-foreground">
                  {formatTimeAgo(trade.timestamp)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
