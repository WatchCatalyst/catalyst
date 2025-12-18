"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bitcoin, TrendingUp, Swords, Cpu, Building2, Rabbit, Trophy } from 'lucide-react'
import type { NewsCategory } from "@/app/page"
import { useEffect } from "react"

type CategoryFilterProps = {
  selected: NewsCategory
  onSelect: (category: NewsCategory) => void
  activeCategories?: Set<NewsCategory>
  onToggleCategory?: (category: NewsCategory) => void
  articleCounts?: Record<NewsCategory, number>
}

const categories: { value: NewsCategory; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { value: "all", label: "All News", icon: <TrendingUp className="h-4 w-4" />, shortcut: "A" },
  { value: "crypto", label: "Crypto", icon: <Bitcoin className="h-4 w-4" />, shortcut: "C" },
  { value: "stocks", label: "Stocks", icon: <Building2 className="h-4 w-4" />, shortcut: "S" },
  { value: "war", label: "Geopolitics", icon: <Swords className="h-4 w-4" />, shortcut: "G" },
  { value: "technology", label: "Tech", icon: <Cpu className="h-4 w-4" />, shortcut: "T" },
  { value: "politics", label: "Politics", icon: <Building2 className="h-4 w-4" />, shortcut: "P" },
  { value: "animals", label: "Animals", icon: <Rabbit className="h-4 w-4" />, shortcut: "N" },
  { value: "sports", label: "Sports", icon: <Trophy className="h-4 w-4" />, shortcut: "O" },
]

export function CategoryFilter({ selected, onSelect, articleCounts }: CategoryFilterProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return
      
      const categoryMap: Record<string, NewsCategory> = {
        "a": "all",
        "c": "crypto",
        "s": "stocks",
        "g": "war",
        "t": "technology",
        "p": "politics",
        "n": "animals",
        "o": "sports",
      }
      
      const category = categoryMap[e.key.toLowerCase()]
      if (category) {
        e.preventDefault()
        onSelect(category)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onSelect])

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category.value}
          onClick={() => onSelect(category.value)}
          variant={selected === category.value ? "default" : "outline"}
          size="sm"
          className="gap-2 relative"
        >
          {category.icon}
          {category.label}
          {articleCounts && articleCounts[category.value] > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {articleCounts[category.value]}
            </Badge>
          )}
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50">
            {category.shortcut}
          </kbd>
        </Button>
      ))}
    </div>
  )
}
