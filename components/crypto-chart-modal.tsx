"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LiveCryptoChart } from "@/components/live-crypto-chart"
import { X } from "lucide-react"
import Image from "next/image"

type CryptoChartModalProps = {
  symbol: "BTC" | "ETH" | "SOL" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CRYPTO_CONFIG: Record<string, { name: string; color: string; gradient: string; logo: string; fallbackIcon: string }> = {
  BTC: {
    name: "Bitcoin",
    color: "text-orange-500",
    gradient: "from-orange-500/20 via-orange-600/10 to-transparent",
    logo: "/images/crypto-logos/bitcoin.png",
    fallbackIcon: "₿",
  },
  ETH: {
    name: "Ethereum",
    color: "text-blue-400",
    gradient: "from-blue-500/20 via-blue-600/10 to-transparent",
    logo: "/images/crypto-logos/ethereum.png",
    fallbackIcon: "Ξ",
  },
  SOL: {
    name: "Solana",
    color: "text-purple-400",
    gradient: "from-purple-500/20 via-purple-600/10 to-transparent",
    logo: "/images/crypto-logos/solana.png",
    fallbackIcon: "◎",
  },
}

export function CryptoChartModal({ symbol, open, onOpenChange }: CryptoChartModalProps) {
  if (!symbol) return null

  const config = CRYPTO_CONFIG[symbol]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-zinc-950/98 backdrop-blur-2xl border border-white/10 p-0 gap-0 overflow-hidden shadow-2xl shadow-black/50">
        {/* Gradient overlay at top */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${config.gradient} pointer-events-none`} />
        
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>

        {/* Header */}
        <div className="relative p-6 pb-2">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} border border-white/10 flex items-center justify-center overflow-hidden shadow-lg`}>
              <Image
                src={config.logo}
                alt={config.name}
                width={40}
                height={40}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              {/* Fallback icon if image fails */}
              <span className={`absolute text-2xl font-bold ${config.color} opacity-0`}>
                {config.fallbackIcon}
              </span>
            </div>
            
            {/* Title */}
            <div>
              <h2 className={`text-2xl font-bold ${config.color}`}>
                {config.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Real-time price chart
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative p-6 pt-2">
          <LiveCryptoChart symbol={symbol} />
        </div>

        {/* Bottom glow */}
        <div className={`absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent ${config.color.replace('text-', 'via-')}/30 to-transparent`} />
      </DialogContent>
    </Dialog>
  )
}
