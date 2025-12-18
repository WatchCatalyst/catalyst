"use client"

import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

type NewArticlesBadgeProps = {
  count: number
  onDismiss?: () => void
}

export function NewArticlesBadge({ count, onDismiss }: NewArticlesBadgeProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (count > 0) {
      setShow(true)

      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setShow(false)
        onDismiss?.()
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [count, onDismiss])

  if (!show || count === 0) return null

  return (
    <Badge
      className="animate-in slide-in-from-top-2 bg-accent-bright text-black hover:bg-accent-bright/90 cursor-pointer transition-all"
      onClick={() => {
        setShow(false)
        onDismiss?.()
      }}
    >
      <Sparkles className="h-3 w-3 mr-1 fill-current" />
      {count} New {count === 1 ? "Article" : "Articles"}
    </Badge>
  )
}
