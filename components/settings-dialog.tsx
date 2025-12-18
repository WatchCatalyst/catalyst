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
import type { NewsCategory } from "@/app/page"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

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

  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Load settings from Supabase
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("preferences")
          .eq("user_id", user.id)
          .single()

        if (settingsData?.preferences) {
          const prefs = settingsData.preferences
          setPreferences({
            ...prefs,
            categories: new Set(prefs.categories),
          })
        }

        // Load portfolio from Supabase
        const { data: portfolioData } = await supabase.from("portfolio").select("symbol, type")

        if (portfolioData) {
          setPortfolio(portfolioData)
        }
      } else {
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
      }
    }

    loadSettings()
  }, [])

  const savePreferences = async () => {
    const prefsToSave = {
      ...preferences,
      categories: Array.from(preferences.categories),
    }

    localStorage.setItem("watchcatalyst-preferences", JSON.stringify(prefsToSave))

    if (user) {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        preferences: prefsToSave,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error saving preferences to cloud:", error)
        toast({ title: "Saved locally (Cloud sync failed)", variant: "destructive" })
        return
      }
    }

    toast({ title: user ? "Preferences saved to cloud" : "Preferences saved locally" })
  }

  const savePortfolio = async () => {
    localStorage.setItem("watchcatalyst-portfolio", JSON.stringify(portfolio))

    if (user) {
      // For portfolio, we'll do a full replace for simplicity: delete all then insert all
      // In a real app with large data, you'd want to diff changes.

      // 1. Delete existing
      await supabase.from("portfolio").delete().eq("user_id", user.id)

      // 2. Insert new
      if (portfolio.length > 0) {
        const { error } = await supabase.from("portfolio").insert(
          portfolio.map((asset) => ({
            user_id: user.id,
            symbol: asset.symbol,
            type: asset.type,
          })),
        )

        if (error) {
          console.error("Error saving portfolio to cloud:", error)
          toast({ title: "Saved locally (Cloud sync failed)", variant: "destructive" })
          return
        }
      }
    }

    toast({ title: user ? "Portfolio updated to cloud" : "Portfolio updated locally" })
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
    if (newAsset.symbol.trim() && !portfolio.some((a) => a.symbol === newAsset.symbol.toUpperCase())) {
      setPortfolio([...portfolio, { symbol: newAsset.symbol.toUpperCase(), type: newAsset.type }])
      setNewAsset({ symbol: "", type: "crypto" })
    }
  }

  const removeAsset = (symbol: string) => {
    setPortfolio(portfolio.filter((a) => a.symbol !== symbol))
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

          {/* Portfolio Tracking */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Portfolio Tracking</h3>
            <p className="text-xs text-muted-foreground">Add assets to prioritize relevant news</p>
            <div className="flex gap-2">
              <Input
                placeholder="Symbol (e.g., BTC, AAPL)"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addAsset()}
                className="flex-1"
              />
              <select
                value={newAsset.type}
                onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as "crypto" | "stock" })}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="crypto">Crypto</option>
                <option value="stock">Stock</option>
              </select>
              <Button onClick={addAsset} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {portfolio.map((asset) => (
                <Badge key={asset.symbol} variant="outline" className="gap-2">
                  ${asset.symbol}
                  <span className="text-xs text-muted-foreground capitalize">({asset.type})</span>
                  <button onClick={() => removeAsset(asset.symbol)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={savePreferences} className="flex-1">
              Save Preferences
            </Button>
            <Button onClick={savePortfolio} variant="outline" className="flex-1 bg-transparent">
              Save Portfolio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
