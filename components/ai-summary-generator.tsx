"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, Loader2 } from 'lucide-react'

type AISummaryProps = {
  title: string
  summary: string
  category: string
}

export function AISummaryGenerator({ title, summary, category }: AISummaryProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generateSummary = async () => {
    setLoading(true)
    
    // Simulate AI summary generation with intelligent extraction
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create a concise 2-3 sentence summary
    const sentences = summary.split('.').filter(s => s.trim().length > 20)
    const keyPoints = sentences.slice(0, 2).join('.') + '.'
    
    // Add trading context
    const tradingContext = category === "crypto" || category === "stocks" 
      ? " This could impact related assets and create trading opportunities."
      : ""
    
    setAiSummary(`${keyPoints}${tradingContext}`)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {!aiSummary ? (
        <Button
          onClick={generateSummary}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating AI Summary...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate AI Summary
            </>
          )}
        </Button>
      ) : (
        <Card className="p-3 bg-accent-bright/5 border-accent-bright/20">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent-bright flex-shrink-0 mt-0.5" />
            <div className="text-xs font-medium text-accent-bright">AI Summary</div>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
        </Card>
      )}
    </div>
  )
}
