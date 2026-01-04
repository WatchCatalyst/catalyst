"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, DollarSign, Building2, Search, ExternalLink, RefreshCw, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { GovContract } from "@/app/api/gov-contracts/route"

interface GovContractsTrackerProps {
  portfolio?: Array<{ symbol: string; type: string }>
}

export function GovContractsTracker({ portfolio = [] }: GovContractsTrackerProps) {
  const [contracts, setContracts] = useState<GovContract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchContracts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setRefreshing(true)
      
      const response = await fetch(`/api/gov-contracts?_t=${Date.now()}`)
      const data = await response.json()

      console.log("[GovContractsTracker] API Response:", {
        success: data.success,
        count: data.count,
        dataLength: data.data?.length,
      })

      if (data.success) {
        setContracts(data.data || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch government contracts:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchContracts(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchContracts])

  const isInPortfolio = (ticker: string) => {
    return portfolio.some((asset) => asset.symbol.toUpperCase() === ticker.toUpperCase())
  }

  const filteredContracts = contracts.filter((contract) => {
    if (!contract) return false

    const matchesSearch =
      searchQuery === "" ||
      (contract.ticker && contract.ticker.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.agency && contract.agency.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.description && contract.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contract.contractor && contract.contractor.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesSearch
  })

  const formatAmount = (amount: number) => {
    if (!amount || isNaN(amount)) return "N/A"
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Unknown"
    
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getAmountBadgeColor = (amount: number) => {
    if (amount >= 100_000_000) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    if (amount >= 10_000_000) return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    if (amount >= 1_000_000) return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
  }

  return (
    <div className="bg-card/50 rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">Gov Contracts</h3>
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400">
              Live
            </Badge>
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">
                Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60)}m ago
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => fetchContracts()}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by ticker, agency, or contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Loading government contracts...</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {contracts.length === 0 
              ? "No contracts found. Check your Quiver API key." 
              : `No contracts match your search.`}
          </div>
        ) : (
          filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className={`p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${
                isInPortfolio(contract.ticker) ? "bg-emerald-500/5 border-l-2 border-l-emerald-400" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-bold text-foreground">${contract.ticker}</span>
                    {isInPortfolio(contract.ticker) && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      >
                        Portfolio
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                    {contract.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {contract.agency}
                    </span>
                    {contract.contractor && (
                      <span className="text-muted-foreground">
                        → {contract.contractor}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 h-5 font-mono ${getAmountBadgeColor(contract.amount)}`}
                  >
                    <DollarSign className="h-3 w-3 mr-0.5" />
                    {formatAmount(contract.amount)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(contract.date)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary footer */}
      {contracts.length > 0 && (
        <div className="p-2 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{contracts.length} contracts loaded</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              Total: {formatAmount(contracts.reduce((sum, c) => sum + (c.amount || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
