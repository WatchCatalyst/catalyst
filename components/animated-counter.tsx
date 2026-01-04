"use client"

import { useEffect, useState, useRef } from "react"

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const frameRef = useRef<number>()

  useEffect(() => {
    const startValue = displayValue
    const endValue = value
    const startTime = performance.now()
    startTimeRef.current = startTime

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) return

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)

      const current = startValue + (endValue - startValue) * easeOutCubic
      setDisplayValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(endValue)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, duration])

  const formatValue = (num: number): string => {
    return num.toFixed(decimals)
  }

  return (
    <span className={`number-counter ${className}`}>
      {prefix}
      {formatValue(displayValue)}
      {suffix}
    </span>
  )
}
