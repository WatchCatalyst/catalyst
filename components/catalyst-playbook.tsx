"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { BookOpen, AlertCircle } from "lucide-react"
import type { NewsItem } from "@/app/page"
import { calculateMarketImpact } from "@/lib/market-impact"
import type { MarketTopic } from "@/lib/market-relevance-classifier"
import { PLAYBOOK_CONTENT } from "@/lib/playbook-data"
import { mapEventToTopic } from "@/lib/calendar-service"

type CatalystPlaybookProps = {
  item: NewsItem | CalendarEvent
  type: "news" | "calendar"
  trigger?: React.ReactNode
}

type CalendarEvent = {
  id: string
  title: string
  time: string
  date: string
  type: "economic" | "crypto"
  importance: "high" | "medium" | "low"
  actual?: string
  forecast?: string
  currency?: string
  ticker?: string
}

export function CatalystPlaybook({ item, type, trigger }: CatalystPlaybookProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getPlaybookContent = () => {
    if (type === "news") {
      const news = item as NewsItem
      const classification = (news as any).classification

      // Use the first detected market topic for specific guidance
      if (classification && classification.topics && classification.topics.length > 0) {
        const primaryTopic = classification.topics[0] as MarketTopic
        return PLAYBOOK_CONTENT[primaryTopic] || PLAYBOOK_CONTENT.DEFAULT
      }

      // Fallback to default if no topics
      return PLAYBOOK_CONTENT.DEFAULT
    } else {
      const event = item as CalendarEvent
      // Use the event's topic if available, otherwise try to infer from title
      if (event.topic && event.topic in PLAYBOOK_CONTENT) {
        return PLAYBOOK_CONTENT[event.topic as MarketTopic]
      }
      // Fallback: infer topic from title
      const inferredTopic = mapEventToTopic(event.title)
      return PLAYBOOK_CONTENT[inferredTopic] || PLAYBOOK_CONTENT.RATES_CENTRAL_BANKS
    }
  }

  const getImpactScore = () => {
    if (type === "news") {
      const news = item as NewsItem
      const impact = calculateMarketImpact(news)
      return {
        score: impact.score,
        level: impact.level,
        color: impact.color,
      }
    } else {
      const event = item as CalendarEvent
      // Map calendar importance to a score
      const scores = {
        high: 85,
        medium: 60,
        low: 35,
      }
      const score = scores[event.importance]

      let level: "low" | "medium" | "high" | "critical"
      let color

      if (score >= 80) {
        level = "critical"
        color = { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" }
      } else if (score >= 60) {
        level = "high"
        color = { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" }
      } else if (score >= 40) {
        level = "medium"
        color = { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" }
      } else {
        level = "low"
        color = { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" }
      }

      return { score, level, color }
    }
  }

  const playbook = getPlaybookContent()
  const impact = getImpactScore()

  const title = type === "news" ? (item as NewsItem).title : (item as CalendarEvent).title
  const ticker =
    type === "news" ? (item as NewsItem).title.match(/\$[A-Z]{2,5}/)?.[0] || null : (item as CalendarEvent).ticker

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="gap-1.5 text-xs bg-accent-bright/5 hover:bg-accent-bright/10 border-accent-bright/20 hover:border-accent-bright/40"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Playbook
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Playbook{ticker ? ` – ${ticker}` : ""}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground line-clamp-2">{title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Section 1: Definition */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Definition</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{playbook.definition}</p>
            </div>

            {/* Section 2: Trader Logic / Common Patterns */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Trader Logic</h3>
              <ul className="space-y-2">
                {playbook.patterns.map((pattern, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-accent-bright mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{pattern}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground italic flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    These are common market patterns, not financial advice. Always use your own judgment and risk
                    management.
                  </span>
                </p>
              </div>
            </div>

            {/* Section 3: Impact */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Impact</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Impact Score</span>
                    <span className="text-sm font-bold text-foreground">{impact.score} / 100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${impact.color.bg.replace("/10", "")} transition-all duration-300`}
                      style={{ width: `${impact.score}%` }}
                    />
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${impact.color.bg} ${impact.color.text} ${impact.color.border} border capitalize px-3 py-1`}
                >
                  {impact.level}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {impact.level === "critical" && "This event has critical market-moving potential. Monitor closely."}
                {impact.level === "high" && "This event has high market impact potential. Worth watching."}
                {impact.level === "medium" &&
                  "This event has moderate market impact. May create short-term opportunities."}
                {impact.level === "low" && "This event has low market impact. Likely noise unless conditions change."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
