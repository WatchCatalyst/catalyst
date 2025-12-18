"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Timer } from "lucide-react"

type UpdateFrequencyBadgeProps = {
  intervalMs: number
  isActive: boolean
}

export function UpdateFrequencyBadge({ intervalMs, isActive }: UpdateFrequencyBadgeProps) {
  const [countdown, setCountdown] = useState(Math.floor(intervalMs / 1000))
  const [lastResetTime, setLastResetTime] = useState(Date.now())

  useEffect(() => {
    if (!isActive) {
      setCountdown(0)
      return
    }

    setLastResetTime(Date.now())
    setCountdown(Math.floor(intervalMs / 1000))

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastResetTime
      const remaining = Math.max(0, Math.floor((intervalMs - elapsed) / 1000))
      setCountdown(remaining)

      if (remaining === 0) {
        setLastResetTime(Date.now())
        setCountdown(Math.floor(intervalMs / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [intervalMs, isActive, lastResetTime])

  if (!isActive) return null

  const progress = ((intervalMs / 1000 - countdown) / (intervalMs / 1000)) * 100

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 border-border relative overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 bottom-0 bg-accent-bright/10 transition-all duration-1000 ease-linear"
        style={{ width: `${progress}%` }}
      />
      <Timer className="h-3 w-3 relative z-10" />
      <span className="text-xs font-mono relative z-10">{countdown}s</span>
    </Badge>
  )
}
