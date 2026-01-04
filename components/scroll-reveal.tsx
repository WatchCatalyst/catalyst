"use client"

import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  stagger?: 1 | 2 | 3 | 4
  threshold?: number
}

export function ScrollReveal({
  children,
  className,
  stagger,
  threshold = 0.1,
}: ScrollRevealProps) {
  const { ref } = useScrollReveal({ threshold })

  return (
    <div
      ref={ref as any}
      className={cn(
        "reveal-on-scroll",
        stagger && `reveal-stagger-${stagger}`,
        className
      )}
    >
      {children}
    </div>
  )
}
