"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, Wifi, WifiOff } from "lucide-react"

type LiveStatusIndicatorProps = {
  isLive: boolean
  lastUpdate?: Date
  newCount?: number
  isLoading?: boolean
}

export function LiveStatusIndicator({ isLive, lastUpdate, newCount = 0, isLoading = false }: LiveStatusIndicatorProps) {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("")

  useEffect(() => {
    if (!lastUpdate) return

    const updateTimer = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastUpdate.getTime()
      const seconds = Math.floor(diffMs / 1000)

      if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`)
      } else {
        const minutes = Math.floor(seconds / 60)
        setTimeSinceUpdate(`${minutes}m ago`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [lastUpdate])

  if (!isLive) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
        <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Paused</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent-bright/10 border border-accent-bright/20">
      <div className="relative">
        {isLoading ? (
          <Activity className="h-3.5 w-3.5 text-accent-bright animate-pulse" />
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5 text-accent-bright" />
            <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-accent-bright animate-pulse" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-accent-bright">Live</span>
        {lastUpdate && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {timeSinceUpdate}
          </span>
        )}
      </div>

      {newCount > 0 && (
        <Badge className="ml-1 h-5 min-w-[20px] flex items-center justify-center px-1.5 bg-accent-bright text-black text-[10px] font-bold">
          +{newCount}
        </Badge>
      )}
    </div>
  )
}
