"use client"

import { useEffect, useRef } from "react"

interface Use3DTiltOptions {
  maxRotation?: number
  perspective?: number
  scale?: number
  enabled?: boolean
}

export function use3DTilt(options: Use3DTiltOptions = {}) {
  const {
    maxRotation = 15,
    perspective = 1000,
    scale = 1.05,
    enabled = true,
  } = options
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!enabled) return

    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = ((y - centerY) / centerY) * -maxRotation
      const rotateY = ((x - centerX) / centerX) * maxRotation

      element.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`
    }

    const handleMouseLeave = () => {
      element.style.transform = `perspective(${perspective}px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`
    }

    element.addEventListener("mousemove", handleMouseMove)
    element.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      element.removeEventListener("mousemove", handleMouseMove)
      element.removeEventListener("mouseleave", handleMouseLeave)
      element.style.transform = ""
    }
  }, [maxRotation, perspective, scale, enabled])

  return ref
}
