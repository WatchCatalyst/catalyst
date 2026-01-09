"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LiveCryptoChart } from "@/components/live-crypto-chart"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

type CryptoChartModalProps = {
  symbol: "BTC" | "ETH" | "SOL" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CryptoChartModal({ symbol, open, onOpenChange }: CryptoChartModalProps) {
  if (!symbol) return null

  const symbolNames: Record<string, string> = {
    BTC: "Bitcoin",
    ETH: "Ethereum", 
    SOL: "Solana",
  }

  const symbolColors: Record<string, string> = {
    BTC: "text-orange-500",
    ETH: "text-blue-400",
    SOL: "text-purple-400",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] bg-zinc-950/95 backdrop-blur-xl border-white/10 p-0 gap-0">
        <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-lg font-bold ${symbolColors[symbol]}`}>
              {symbolNames[symbol]}
            </span>
            <span className="text-sm text-muted-foreground">
              Live Chart
            </span>
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="p-4">
          <LiveCryptoChart symbol={symbol} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
