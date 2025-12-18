"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, DollarSign, ExternalLink } from "lucide-react"
import type { NewsItem } from "@/app/page"
import { formatDistanceToNow } from "date-fns"

type SpecialFeedsProps = {
  news: NewsItem[]
}

export function SpecialFeeds({ news }: SpecialFeedsProps) {
  const [activeTab, setActiveTab] = useState<"security" | "raises">("security")

  const securityKeywords = [
    "hack",
    "exploit",
    "attack",
    "breach",
    "stolen",
    "vulnerability",
    "security",
    "scam",
    "phishing",
    "compromised",
  ]
  const raisesKeywords = [
    "raised",
    "funding",
    "round",
    "invested",
    "capital",
    "series a",
    "series b",
    "seed",
    "venture",
    "backer",
    "acquisition",
  ]

  const filterNews = (keywords: string[]) => {
    return news
      .filter((item) => {
        const text = `${item.title} ${item.summary}`.toLowerCase()
        return keywords.some((k) => text.includes(k))
      })
      .slice(0, 5)
  }

  const securityNews = filterNews(securityKeywords)
  const raisesNews = filterNews(raisesKeywords)

  const activeNews = activeTab === "security" ? securityNews : raisesNews
  const hasItems = activeNews.length > 0

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/60">
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border">
          <Button
            variant={activeTab === "security" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("security")}
            className="flex-1 h-7 text-xs font-medium"
          >
            <ShieldAlert className="h-3 w-3 mr-1.5 text-red-500" />
            Rekt Feed
          </Button>
          <Button
            variant={activeTab === "raises" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("raises")}
            className="flex-1 h-7 text-xs font-medium"
          >
            <DollarSign className="h-3 w-3 mr-1.5 text-green-500" />
            Money Flow
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!hasItems ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-xs">No recent activity detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeNews.map((item) => (
              <div key={item.id} className="group">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-accent-bright transition-colors">
                      {item.title}
                    </h4>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{item.source}</span>
                    <span>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</span>
                  </div>
                </a>
                <div className="h-px bg-border/40 mt-3" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
