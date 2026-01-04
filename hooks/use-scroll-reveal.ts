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
    if (!element || (isRevealed && triggerOnce)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true)
          element.classList.add("revealed")
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
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
  }, [threshold, rootMargin, triggerOnce, isRevealed])

  return { ref: elementRef, isRevealed }
}
