"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LiveStockChart } from "@/components/live-stock-chart"

type StockChartModalProps = {
  symbol: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STOCK_CONFIG: Record<string, { name: string; color: string; gradient: string }> = {
  AAPL: {
    name: "Apple Inc.",
    color: "text-emerald-400",
    gradient: "from-emerald-500/15 via-emerald-600/5 to-transparent",
  },
  TSLA: {
    name: "Tesla Inc.",
    color: "text-amber-400",
    gradient: "from-amber-500/15 via-amber-600/5 to-transparent",
  },
  NVDA: {
    name: "NVIDIA Corp.",
    color: "text-violet-400",
    gradient: "from-violet-500/15 via-violet-600/5 to-transparent",
  },
  MSFT: {
    name: "Microsoft Corp.",
    color: "text-cyan-400",
    gradient: "from-cyan-500/15 via-cyan-600/5 to-transparent",
  },
  GOOGL: {
    name: "Alphabet Inc.",
    color: "text-blue-400",
    gradient: "from-blue-500/15 via-blue-600/5 to-transparent",
  },
  META: {
    name: "Meta Platforms Inc.",
    color: "text-indigo-400",
    gradient: "from-indigo-500/15 via-indigo-600/5 to-transparent",
  },
  AMZN: {
    name: "Amazon.com Inc.",
    color: "text-orange-400",
    gradient: "from-orange-500/15 via-orange-600/5 to-transparent",
  },
}

export function StockChartModal({ symbol, open, onOpenChange }: StockChartModalProps) {
  if (!symbol) return null

  const config = STOCK_CONFIG[symbol] || {
    name: symbol,
    color: "text-cyan-400",
    gradient: "from-cyan-500/15 via-cyan-600/5 to-transparent",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-zinc-950/98 backdrop-blur-xl border border-white/10 p-0 gap-0 overflow-hidden shadow-2xl shadow-black/50 [&>button]:text-white/50 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-full [&>button]:p-2">
        {/* Gradient overlay at top */}
        <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${config.gradient} pointer-events-none`} />

        {/* Header */}
        <div className="relative p-6 pb-2">
          <div className="flex items-center gap-4">
            {/* Symbol badge */}
            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} border border-white/10 flex items-center justify-center overflow-hidden`}>
              <span className={`text-xl font-bold ${config.color}`}>
                {symbol.substring(0, 1)}
              </span>
            </div>
            
            {/* Title */}
            <div>
              <h2 className={`text-xl font-semibold ${config.color}`}>
                {config.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Stock price chart • ${symbol}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative p-6 pt-2">
          <LiveStockChart symbol={symbol} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
