"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, X } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import type { NewsCategory } from "@/app/page"
import { useToast } from "@/hooks/use-toast"

type NotificationPreferences = {
  enabled: boolean
  categories: Set<NewsCategory>
  keywords: string[]
  minRelevanceScore: number
}

type PortfolioAsset = {
  symbol: string
  type: "crypto" | "stock"
}

export function SettingsDialog() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    categories: new Set(["crypto", "stocks"]),
    keywords: [],
    minRelevanceScore: 80,
  })
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([])
  const [newKeyword, setNewKeyword] = useState("")
  const [newAsset, setNewAsset] = useState({ symbol: "", type: "crypto" as "crypto" | "stock" })
  const { toast } = useToast()

  useEffect(() => {
    // Load saved preferences from Local Storage
    const savedPrefs = localStorage.getItem("watchcatalyst-preferences")
    if (savedPrefs) {
      const parsed = JSON.parse(savedPrefs)
      setPreferences({
        ...parsed,
        categories: new Set(parsed.categories),
      })
    }

    const savedPortfolio = localStorage.getItem("watchcatalyst-portfolio")
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio))
    }
  }, [])

  const savePreferences = () => {
    const prefsToSave = {
      ...preferences,
      categories: Array.from(preferences.categories),
    }

    localStorage.setItem("watchcatalyst-preferences", JSON.stringify(prefsToSave))
    
    // Dispatch custom event to notify other components (same-tab)
    window.dispatchEvent(new Event("preferences-updated"))
    
    toast({ title: "Preferences saved" })
  }

  // Portfolio is now auto-saved on add/remove, so this function is no longer needed
  // Keeping it for backwards compatibility but it's redundant
  const savePortfolio = () => {
    localStorage.setItem("watchcatalyst-portfolio", JSON.stringify(portfolio))
    window.dispatchEvent(new Event("portfolio-updated"))
    toast({ title: "Watchlist saved" })
  }

  const toggleCategory = (category: NewsCategory) => {
    const newCategories = new Set(preferences.categories)
    if (newCategories.has(category)) {
      newCategories.delete(category)
    } else {
      newCategories.add(category)
    }
    setPreferences({ ...preferences, categories: newCategories })
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !preferences.keywords.includes(newKeyword.trim())) {
      setPreferences({
        ...preferences,
        keywords: [...preferences.keywords, newKeyword.trim()],
      })
      setNewKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setPreferences({
      ...preferences,
      keywords: preferences.keywords.filter((k) => k !== keyword),
    })
  }

  const addAsset = () => {
    const input = newAsset.symbol.trim().toUpperCase()
    if (!input) return

    // Support comma-separated symbols (e.g., "AAPL, BTC, TSLA")
    const symbols = input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const newAssets: PortfolioAsset[] = []
    for (const symbol of symbols) {
      // Prevent duplicates
      if (!portfolio.some((a) => a.symbol === symbol)) {
        // Auto-detect type: common crypto symbols default to crypto, else stock
        const isCrypto = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX", "LINK", "UNI", "ATOM", "ALGO"].includes(symbol)
        newAssets.push({ symbol, type: isCrypto ? "crypto" : "stock" })
      }
    }

    if (newAssets.length > 0) {
      const updatedPortfolio = [...portfolio, ...newAssets]
      setPortfolio(updatedPortfolio)
      // Auto-save immediately
      localStorage.setItem("watchcatalyst-portfolio", JSON.stringify(updatedPortfolio))
      window.dispatchEvent(new Event("portfolio-updated"))
      toast({ title: `Added ${newAssets.length} symbol(s) to watchlist` })
      setNewAsset({ symbol: "", type: "stock" })
    } else {
      toast({ title: "Symbol(s) already in watchlist or invalid", variant: "destructive" })
    }
  }

  const removeAsset = (symbol: string) => {
    const updatedPortfolio = portfolio.filter((a) => a.symbol !== symbol)
    setPortfolio(updatedPortfolio)
    // Auto-save immediately
    localStorage.setItem("watchcatalyst-portfolio", JSON.stringify(updatedPortfolio))
    window.dispatchEvent(new Event("portfolio-updated"))
    toast({ title: "Removed from watchlist" })
  }

  const categories: { value: NewsCategory; label: string }[] = [
    { value: "crypto", label: "Crypto" },
    { value: "stocks", label: "Stocks" },
    { value: "war", label: "Geopolitics" },
    { value: "technology", label: "Tech" },
    { value: "politics", label: "Politics" },
    { value: "sports", label: "Sports" },
    { value: "animals", label: "Animals" },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalization Settings</DialogTitle>
          <DialogDescription>Customize your news feed and notification preferences</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notification Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Notification Preferences</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="notifications-enabled">Enable Notifications</Label>
              <Switch
                id="notifications-enabled"
                checked={preferences.enabled}
                onCheckedChange={(checked) => setPreferences({ ...preferences, enabled: checked })}
              />
            </div>

            <div>
              <Label className="mb-2 block">Notify me about these categories:</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={preferences.categories.has(cat.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat.value)}
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword Alerts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Keyword Alerts</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Add keyword (e.g., 'rate cut', 'earnings')"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
              <Button onClick={addKeyword} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="gap-1">
                  {keyword}
                  <button onClick={() => removeKeyword(keyword)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Minimum Relevance Score */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="min-relevance-score">Minimum Relevance Score</Label>
                <span className="text-sm font-medium text-foreground">{preferences.minRelevanceScore}</span>
              </div>
              <Slider
                id="min-relevance-score"
                min={0}
                max={100}
                step={5}
                value={[preferences.minRelevanceScore]}
                onValueChange={(values) => {
                  const newScore = values[0]
                  const updatedPrefs = { ...preferences, minRelevanceScore: newScore }
                  setPreferences(updatedPrefs)
                  // Update localStorage immediately for instant filtering
                  const prefsToSave = {
                    ...updatedPrefs,
                    categories: Array.from(updatedPrefs.categories),
                  }
                  localStorage.setItem("watchcatalyst-preferences", JSON.stringify(prefsToSave))
                  // Dispatch custom event to notify main page
                  window.dispatchEvent(new Event("preferences-updated"))
                }}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Only show articles with relevance score ≥ {preferences.minRelevanceScore}. Higher scores show more
                market-moving news.
              </p>
            </div>
          </div>

          {/* Your Watchlist */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Your Watchlist</h3>
              <p className="text-xs text-muted-foreground">
                Add symbols to prioritize news about your holdings. Articles matching your watchlist will bypass relevance filters.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add symbol... (e.g., AAPL, BTC, TSLA or comma-separated)"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addAsset()}
                className="flex-1"
              />
              <Button onClick={addAsset} size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            {portfolio.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {portfolio.map((asset) => (
                  <Badge key={asset.symbol} variant="outline" className="gap-1.5 pr-1">
                    <span className="font-medium">${asset.symbol}</span>
                    <button
                      onClick={() => removeAsset(asset.symbol)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${asset.symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No symbols in watchlist. Add symbols above.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={savePreferences} className="flex-1">
              Save Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
