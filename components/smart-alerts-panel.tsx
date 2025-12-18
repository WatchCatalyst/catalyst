"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, Plus, X } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { NewsItem } from "@/app/page"

type Alert = {
  id: string
  keyword: string
  triggered: boolean
  matchingArticles: number
}

type SmartAlertsPanelProps = {
  news: NewsItem[]
}

export function SmartAlertsPanel({ news }: SmartAlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const saved = localStorage.getItem("watchcatalyst-alerts")
    if (saved) {
      setAlerts(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    // Check alerts against current news
    if (alerts.length > 0 && news.length > 0) {
      const updatedAlerts = alerts.map(alert => {
        const matches = news.filter(article => 
          article.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
          article.summary.toLowerCase().includes(alert.keyword.toLowerCase())
        )
        
        if (matches.length > 0 && !alert.triggered) {
          toast({
            title: "Alert Triggered!",
            description: `Found ${matches.length} article(s) matching "${alert.keyword}"`,
          })
          return { ...alert, triggered: true, matchingArticles: matches.length }
        }
        
        return { ...alert, matchingArticles: matches.length }
      })
      
      const hasChanges = updatedAlerts.some((alert, index) => 
        alert.triggered !== alerts[index].triggered || 
        alert.matchingArticles !== alerts[index].matchingArticles
      )

      if (hasChanges) {
        setAlerts(updatedAlerts)
        localStorage.setItem("watchcatalyst-alerts", JSON.stringify(updatedAlerts))
      }
    }
  }, [news, alerts, toast])

  const addAlert = () => {
    if (newKeyword.trim() && !alerts.some(a => a.keyword.toLowerCase() === newKeyword.toLowerCase())) {
      const newAlert: Alert = {
        id: Date.now().toString(),
        keyword: newKeyword.trim(),
        triggered: false,
        matchingArticles: 0
      }
      const updated = [...alerts, newAlert]
      setAlerts(updated)
      localStorage.setItem("watchcatalyst-alerts", JSON.stringify(updated))
      setNewKeyword("")
      toast({ title: `Alert set for "${newAlert.keyword}"` })
    }
  }

  const removeAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id)
    setAlerts(updated)
    localStorage.setItem("watchcatalyst-alerts", JSON.stringify(updated))
    toast({ title: "Alert removed" })
  }

  const resetAlert = (id: string) => {
    const updated = alerts.map(a => a.id === id ? { ...a, triggered: false } : a)
    setAlerts(updated)
    localStorage.setItem("watchcatalyst-alerts", JSON.stringify(updated))
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent-bright" />
          Smart Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Enter keyword..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAlert()}
            className="text-sm"
          />
          <Button onClick={addAlert} size="sm" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No alerts set. Add keywords to monitor.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  alert.triggered
                    ? "bg-accent-bright/10 border border-accent-bright/30"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{alert.keyword}</div>
                  {alert.matchingArticles > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {alert.matchingArticles} match{alert.matchingArticles !== 1 ? "es" : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {alert.triggered && (
                    <Badge variant="outline" className="text-xs bg-accent-bright/20 text-accent-bright border-accent-bright/30">
                      Active
                    </Badge>
                  )}
                  <Button
                    onClick={() => removeAlert(alert.id)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
