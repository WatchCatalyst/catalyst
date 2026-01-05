"use client"

import { useEffect, useRef, useState } from "react"

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options
  const elementRef = useRef<HTMLElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Immediately mark as revealed to ensure content is always visible
    // This prevents blank page issues if IntersectionObserver fails or is delayed
    setIsRevealed(true)
    element.classList.add("revealed")

    // Still set up observer for future updates if needed
    if (!triggerOnce) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsRevealed(true)
            element.classList.add("revealed")
          } else {
            setIsRevealed(false)
            element.classList.remove("revealed")
          }
        },
        {
          threshold,
          rootMargin,
        }
      )

      observer.observe(element)

      return () => {
        if (element) {
          observer.unobserve(element)
        }
      }
    }
  }, [threshold, rootMargin, triggerOnce])

  return { ref: elementRef, isRevealed }
}
