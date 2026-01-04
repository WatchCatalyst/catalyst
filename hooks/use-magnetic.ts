"use client"

import { useEffect, useRef } from "react"

interface UseMagneticOptions {
  distance?: number
  enabled?: boolean
}

export function useMagnetic(options: UseMagneticOptions = {}) {
  const { distance = 20, enabled = true } = options
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!enabled) return

    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      const moveX = (x / rect.width) * distance
      const moveY = (y / rect.height) * distance

      element.style.transform = `translate(${moveX}px, ${moveY}px)`
    }

    const handleMouseLeave = () => {
      element.style.transform = "translate(0, 0)"
    }

    element.addEventListener("mousemove", handleMouseMove)
    element.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      element.removeEventListener("mousemove", handleMouseMove)
      element.removeEventListener("mouseleave", handleMouseLeave)
      element.style.transform = "translate(0, 0)"
    }
  }, [distance, enabled])

  return ref
}
