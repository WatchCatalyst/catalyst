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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Briefcase, Plus, X, TrendingUp, DollarSign, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCategoryColor } from "@/lib/category-colors"

type PortfolioAsset = {
  symbol: string
  type: "crypto" | "stock"
  quantity?: number
  avgPrice?: number
  notes?: string
}

type PortfolioManagerProps = {
  onPortfolioChange?: (assets: PortfolioAsset[]) => void
}

export function PortfolioManager({ onPortfolioChange }: PortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([])
  const [newAsset, setNewAsset] = useState<PortfolioAsset>({
    symbol: "",
    type: "crypto",
    quantity: undefined,
    avgPrice: undefined,
    notes: "",
  })
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadPortfolio()
  }, [])

  const loadPortfolio = () => {
    const savedPortfolio = localStorage.getItem("watchcatalyst-portfolio")
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio))
    }
  }

  const savePortfolio = (updatedPortfolio: PortfolioAsset[]) => {
    localStorage.setItem("watchcatalyst-portfolio", JSON.stringify(updatedPortfolio))
    onPortfolioChange?.(updatedPortfolio)
    toast({ title: "Portfolio saved" })
  }

  const addAsset = () => {
    if (newAsset.symbol.trim() && !portfolio.some((a) => a.symbol === newAsset.symbol.toUpperCase())) {
      const updatedPortfolio = [
        ...portfolio,
        {
          ...newAsset,
          symbol: newAsset.symbol.toUpperCase(),
        },
      ]
      setPortfolio(updatedPortfolio)
      savePortfolio(updatedPortfolio)
      setNewAsset({
        symbol: "",
        type: "crypto",
        quantity: undefined,
        avgPrice: undefined,
        notes: "",
      })
    }
  }

  const removeAsset = async (symbol: string) => {
    const updatedPortfolio = portfolio.filter((a) => a.symbol !== symbol)
    setPortfolio(updatedPortfolio)
    await savePortfolio(updatedPortfolio)
  }

  const updateAsset = async (symbol: string, updates: Partial<PortfolioAsset>) => {
    const updatedPortfolio = portfolio.map((asset) => (asset.symbol === symbol ? { ...asset, ...updates } : asset))
    setPortfolio(updatedPortfolio)
    await savePortfolio(updatedPortfolio)
  }

  const getTotalValue = () => {
    return portfolio.reduce((sum, asset) => {
      if (asset.quantity && asset.avgPrice) {
        return sum + asset.quantity * asset.avgPrice
      }
      return sum
    }, 0)
  }

  const getAssetValue = (asset: PortfolioAsset) => {
    if (asset.quantity && asset.avgPrice) {
      return asset.quantity * asset.avgPrice
    }
    return null
  }

  const cryptoColor = getCategoryColor("crypto")
  const stocksColor = getCategoryColor("stocks")

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-500 hover:text-white transition-colors relative">
          PORTFOLIO
          {portfolio.length > 0 && (
            <span className="absolute -top-1 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-cyan-500 text-white text-[9px] font-bold">
              {portfolio.length}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Portfolio Manager
          </DialogTitle>
          <DialogDescription>
            Track your crypto and stock holdings to get prioritized news about your assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {portfolio.length > 0 && (
            <Card className="bg-gradient-to-br from-accent-bright/5 to-accent-bright/10 border-accent-bright/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{portfolio.length}</div>
                    <div className="text-xs text-muted-foreground">Assets</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {portfolio.filter((a) => a.type === "crypto").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Crypto</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {portfolio.filter((a) => a.type === "stock").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Stocks</div>
                  </div>
                </div>
                {getTotalValue() > 0 && (
                  <div className="mt-4 pt-4 border-t border-accent-bright/20 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
                    <div className="text-xl font-bold text-accent-bright">${getTotalValue().toLocaleString()}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Add New Asset</h3>
            <div className="grid grid-cols-12 gap-2">
              <Input
                placeholder="Symbol"
                value={newAsset.symbol}
                onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value.toUpperCase() })}
                onKeyDown={(e) => e.key === "Enter" && addAsset()}
                className="col-span-3"
              />
              <select
                value={newAsset.type}
                onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as "crypto" | "stock" })}
                className="col-span-2 px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="crypto">Crypto</option>
                <option value="stock">Stock</option>
              </select>
              <Input
                type="number"
                placeholder="Qty"
                value={newAsset.quantity || ""}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, quantity: e.target.value ? Number(e.target.value) : undefined })
                }
                className="col-span-2"
              />
              <Input
                type="number"
                placeholder="Avg Price"
                value={newAsset.avgPrice || ""}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, avgPrice: e.target.value ? Number(e.target.value) : undefined })
                }
                className="col-span-3"
              />
              <Button onClick={addAsset} className="col-span-2">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {portfolio.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">No assets in portfolio</p>
              <p className="text-xs text-muted-foreground">Add crypto or stocks to track relevant news</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Your Holdings</h3>
              <div className="space-y-2">
                {portfolio.map((asset) => {
                  const value = getAssetValue(asset)
                  const colorScheme = asset.type === "crypto" ? cryptoColor : stocksColor
                  return (
                    <Card key={asset.symbol} className="hover:border-accent-bright/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">${asset.symbol}</h4>
                              <Badge
                                className={`${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} border text-[10px]`}
                              >
                                {asset.type}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {asset.quantity && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {asset.quantity} units
                                </span>
                              )}
                              {asset.avgPrice && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />${asset.avgPrice.toLocaleString()}
                                </span>
                              )}
                              {value && (
                                <span className="font-semibold text-accent-bright">
                                  Total: ${value.toLocaleString()}
                                </span>
                              )}
                            </div>

                            {asset.notes && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                {asset.notes}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAsset(asset.symbol)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
