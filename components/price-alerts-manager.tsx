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
import { Bell, Plus, X, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type PriceAlert = {
  id: string
  symbol: string
  asset_type: "crypto" | "stock"
  alert_type: "above" | "below" | "change_percent"
  target_price?: number
  change_percent?: number
  is_active: boolean
  last_triggered_at?: string
}

type PriceAlertsManagerProps = {
  portfolio: Array<{ symbol: string; type: string }>
}

export function PriceAlertsManager({ portfolio }: PriceAlertsManagerProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [newAlert, setNewAlert] = useState<Partial<PriceAlert>>({
    symbol: "",
    asset_type: "crypto",
    alert_type: "above",
    target_price: undefined,
    change_percent: undefined,
    is_active: true,
  })
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = () => {
    const saved = localStorage.getItem("watchcatalyst-alerts")
    if (saved) {
      setAlerts(JSON.parse(saved))
    }
  }

  const saveAlerts = (updatedAlerts: PriceAlert[]) => {
    localStorage.setItem("watchcatalyst-alerts", JSON.stringify(updatedAlerts))
    toast({ title: "Alerts saved" })
  }

  const addAlert = async () => {
    if (!newAlert.symbol?.trim()) {
      toast({ title: "Please enter a symbol", variant: "destructive" })
      return
    }

    if (newAlert.alert_type !== "change_percent" && !newAlert.target_price) {
      toast({ title: "Please enter a target price", variant: "destructive" })
      return
    }

    if (newAlert.alert_type === "change_percent" && !newAlert.change_percent) {
      toast({ title: "Please enter a percentage", variant: "destructive" })
      return
    }

    const alertToAdd: PriceAlert = {
      id: Date.now().toString(),
      symbol: newAlert.symbol!.toUpperCase(),
      asset_type: newAlert.asset_type!,
      alert_type: newAlert.alert_type!,
      target_price: newAlert.target_price,
      change_percent: newAlert.change_percent,
      is_active: true,
    }

    const updated = [alertToAdd, ...alerts]
    setAlerts(updated)
    saveAlerts(updated)

    setNewAlert({
      symbol: "",
      asset_type: "crypto",
      alert_type: "above",
      target_price: undefined,
      change_percent: undefined,
      is_active: true,
    })

    toast({ title: `Price alert set for ${alertToAdd.symbol}` })
  }

  const toggleAlert = (id: string) => {
    const alert = alerts.find((a) => a.id === id)
    if (!alert) return

    const newStatus = !alert.is_active
    const updated = alerts.map((a) => (a.id === id ? { ...a, is_active: newStatus } : a))
    setAlerts(updated)
    saveAlerts(updated)

    toast({
      title: newStatus ? "Alert activated" : "Alert paused",
    })
  }

  const removeAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id)
    setAlerts(updated)
    saveAlerts(updated)

    toast({ title: "Alert removed" })
  }

  const getAlertDescription = (alert: PriceAlert) => {
    if (alert.alert_type === "above") {
      return `Alert when price goes above $${alert.target_price?.toLocaleString()}`
    } else if (alert.alert_type === "below") {
      return `Alert when price drops below $${alert.target_price?.toLocaleString()}`
    } else {
      return `Alert when price changes ${alert.change_percent}% or more`
    }
  }

  const activeAlerts = alerts.filter((a) => a.is_active).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-500 hover:text-white transition-colors relative">
          ALERTS
          {activeAlerts > 0 && (
            <span className="absolute -top-1 -right-2 h-4 w-4 flex items-center justify-center rounded-full bg-emerald-400 text-black text-[9px] font-bold">
              {activeAlerts}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Price Alerts & Notifications
          </DialogTitle>
          <DialogDescription>
            Set price thresholds and get notified when your portfolio holdings hit key levels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {alerts.length > 0 && (
            <Card className="bg-gradient-to-br from-accent-bright/5 to-accent-bright/10 border-accent-bright/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{alerts.length}</div>
                    <div className="text-xs text-muted-foreground">Total Alerts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent-bright">{activeAlerts}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {alerts.filter((a) => a.last_triggered_at).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Triggered</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Create New Alert</h3>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs mb-1">Symbol</Label>
                  <Input
                    placeholder="BTC, AAPL"
                    value={newAlert.symbol}
                    onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1">Asset Type</Label>
                  <select
                    value={newAlert.asset_type}
                    onChange={(e) => setNewAlert({ ...newAlert, asset_type: e.target.value as "crypto" | "stock" })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm h-10"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stock">Stock</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Alert Type</Label>
                  <select
                    value={newAlert.alert_type}
                    onChange={(e) =>
                      setNewAlert({
                        ...newAlert,
                        alert_type: e.target.value as "above" | "below" | "change_percent",
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm h-10"
                  >
                    <option value="above">Price Above</option>
                    <option value="below">Price Below</option>
                    <option value="change_percent">% Change</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {newAlert.alert_type !== "change_percent" ? (
                  <div>
                    <Label className="text-xs mb-1">Target Price ($)</Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={newAlert.target_price || ""}
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          target_price: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs mb-1">Change Percent (%)</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={newAlert.change_percent || ""}
                      onChange={(e) =>
                        setNewAlert({
                          ...newAlert,
                          change_percent: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <Button onClick={addAlert} className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Alert
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {portfolio.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Quick Alerts from Portfolio</h3>
              <div className="flex flex-wrap gap-2">
                {portfolio.slice(0, 6).map((asset) => (
                  <Button
                    key={asset.symbol}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewAlert({
                        ...newAlert,
                        symbol: asset.symbol,
                        asset_type: asset.type as "crypto" | "stock",
                      })
                    }
                    className="text-xs"
                  >
                    ${asset.symbol}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">No price alerts set</p>
              <p className="text-xs text-muted-foreground">Create alerts to monitor your holdings</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Your Alerts ({alerts.length})</h3>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`hover:border-accent-bright/30 transition-colors ${
                      !alert.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">${alert.symbol}</h4>
                            <Badge variant="outline" className="text-[10px]">
                              {alert.asset_type}
                            </Badge>
                            {alert.alert_type === "above" && <TrendingUp className="h-3 w-3 text-success" />}
                            {alert.alert_type === "below" && <TrendingDown className="h-3 w-3 text-danger" />}
                            {alert.alert_type === "change_percent" && (
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mb-2">{getAlertDescription(alert)}</p>

                          {alert.last_triggered_at && (
                            <p className="text-xs text-accent-bright">
                              Last triggered: {new Date(alert.last_triggered_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch checked={alert.is_active} onCheckedChange={() => toggleAlert(alert.id)} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAlert(alert.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
