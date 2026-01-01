"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Coins, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CryptoPrice {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap: number
  rank: number
}

export function CryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch("/api/crypto/prices?limit=15")
        const data = await response.json()
        
        if (data.success) {
          setPrices(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    // Refresh every 60 seconds
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`
    }
    if (price >= 0.01) {
      return `$${price.toFixed(4)}`
    }
    return `$${price.toFixed(6)}`
  }

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`
    return `$${cap.toLocaleString()}`
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            Crypto Prices
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

  if (prices.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Coins className="h-5 w-5" />
            Crypto Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No crypto prices available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5" />
          Top Crypto Prices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {prices.map((crypto) => {
            const isPositive = crypto.changePercent24h >= 0
            
            return (
              <div
                key={crypto.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground w-4">
                    #{crypto.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{crypto.symbol}</span>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{crypto.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatPrice(crypto.price)}</div>
                  <div className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{crypto.changePercent24h.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatMarketCap(crypto.marketCap)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}




