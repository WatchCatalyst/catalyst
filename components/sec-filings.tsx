"use client"

import { useState, useEffect } from "react"
import { FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface SECFiling {
  symbol: string
  name: string
  form: string
  date: string
  url: string
  description?: string
}

export function SECFilings() {
  const [filings, setFilings] = useState<SECFiling[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFilings() {
      try {
        const response = await fetch("/api/sec-filings?limit=15")
        const data = await response.json()
        
        if (data.success) {
          setFilings(data.data || [])
        }
      } catch (error) {
        console.error("Failed to fetch SEC filings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFilings()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getFormBadgeColor = (form: string) => {
    const formUpper = form.toUpperCase()
    if (formUpper.includes("10-K") || formUpper.includes("10-Q")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    }
    if (formUpper.includes("8-K")) {
      return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    }
    if (formUpper === "4") {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    }
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recent SEC Filings
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

  if (filings.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recent SEC Filings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>No filings available. Check if FMP SEC filings endpoint is accessible on your plan.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Recent SEC Filings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filings.map((filing, idx) => (
            <div
              key={`${filing.symbol}-${filing.date}-${idx}`}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{filing.symbol}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] px-1.5 py-0 ${getFormBadgeColor(filing.form)}`}
                  >
                    {filing.form}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{filing.name}</p>
                {filing.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{filing.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-muted-foreground">{formatDate(filing.date)}</div>
                {filing.url && (
                  <Link 
                    href={filing.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}




