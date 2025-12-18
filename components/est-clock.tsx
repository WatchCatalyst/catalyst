"use client"

import { useState, useEffect } from "react"
import { Clock } from 'lucide-react'

export function ESTClock() {
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const estTime = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      setTime(`${estTime} EST`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return null

  return (
    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 border border-border text-xs font-medium text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      <span>{time}</span>
    </div>
  )
}
