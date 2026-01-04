"use client"

import { Input } from "@/components/ui/input"
import { Search, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useEffect } from "react"

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        document.getElementById("search-input")?.focus()
      }
      if (e.key === "Escape" && value) {
        onChange("")
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [value, onChange])

  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-cyan-400" />
      <Input
        id="search-input"
        type="text"
        placeholder="Search articles, tickers ($BTC, $AAPL)... Press / to focus"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 bg-gradient-to-r from-zinc-900/80 to-zinc-950/80 backdrop-blur-md border-white/10 input-premium placeholder:text-muted-foreground/60 hover:border-white/20 transition-all duration-300"
      />
      {value && (
        <Button
          onClick={() => onChange("")}
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10 rounded-md transition-all hover:scale-110"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
