"use client"

import { useEffect, useRef } from "react"

interface UseParallaxOptions {
  speed?: number
  enabled?: boolean
}

export function useParallax(options: UseParallaxOptions = {}) {
  const { speed = 0.5, enabled = true } = options
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!enabled) return

    const element = ref.current
    if (!element) return

    const handleScroll = () => {
      const rect = element.getBoundingClientRect()
      const scrolled = window.pageYOffset
      const rate = scrolled * speed

      element.style.transform = `translateY(${rate}px)`
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial position

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (element) {
        element.style.transform = ""
      }
    }
  }, [speed, enabled])

  return ref
}
