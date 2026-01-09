"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LiveCryptoChart } from "@/components/live-crypto-chart"
import Image from "next/image"

type CryptoChartModalProps = {
  symbol: "BTC" | "ETH" | "SOL" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CRYPTO_CONFIG: Record<string, { name: string; color: string; gradient: string; logo: string }> = {
  BTC: {
    name: "Bitcoin",
    color: "text-orange-400",
    gradient: "from-orange-500/15 via-orange-600/5 to-transparent",
    logo: "/images/crypto-logos/bitcoin.png",
  },
  ETH: {
    name: "Ethereum",
    color: "text-sky-400",
    gradient: "from-sky-500/15 via-sky-600/5 to-transparent",
    logo: "/images/crypto-logos/ethereum.png",
  },
  SOL: {
    name: "Solana",
    color: "text-teal-400",
    gradient: "from-teal-500/15 via-teal-600/5 to-transparent",
    logo: "/images/crypto-logos/solana.png",
  },
}

export function CryptoChartModal({ symbol, open, onOpenChange }: CryptoChartModalProps) {
  if (!symbol) return null

  const config = CRYPTO_CONFIG[symbol]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-zinc-950/98 backdrop-blur-xl border border-white/10 p-0 gap-0 overflow-hidden shadow-2xl shadow-black/50 [&>button]:text-white/50 [&>button]:hover:text-white [&>button]:hover:bg-white/10 [&>button]:rounded-full [&>button]:p-2">
        {/* Gradient overlay at top */}
        <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${config.gradient} pointer-events-none`} />

        {/* Header */}
        <div className="relative p-6 pb-2">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} border border-white/10 flex items-center justify-center overflow-hidden`}>
              <Image
                src={config.logo}
                alt={config.name}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            
            {/* Title */}
            <div>
              <h2 className={`text-xl font-semibold ${config.color}`}>
                {config.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Real-time price chart
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative p-6 pt-2">
          <LiveCryptoChart symbol={symbol} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
