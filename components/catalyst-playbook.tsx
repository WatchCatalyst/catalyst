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

const PLAYBOOK_CONTENT = {
  RATES_CENTRAL_BANKS: {
    what: "This is a macro event related to interest rates and central bank policy. It can shift expectations for liquidity and risk appetite across the whole market, not just one ticker.",
    reactions: [
      "Initial reaction in the first 5-15 minutes can be violent and sometimes reverses.",
      "Many traders wait for the first 30-minute range to break before committing to a direction.",
      "Check index futures, yields, and USD to confirm whether the move is broad risk-on or risk-off.",
    ],
  },
  INFLATION_MACRO: {
    what: "This is a macro economic data release like CPI, GDP, or jobs numbers. These reports can shift central bank policy expectations and affect all risk assets.",
    reactions: [
      "Pre-market positioning often leads to sharp reversals after the data drops.",
      "Watch bond yields and dollar strength for confirmation of the macro narrative.",
      "First hour can be choppy; wait for institutional flows to settle around 10-11 AM ET.",
    ],
  },
  REGULATION_POLICY: {
    what: "This is a regulatory or policy headline. It can change how an entire sector or asset class is valued, especially if it impacts legality, compliance costs, or access to markets.",
    reactions: [
      "First headlines can be messy; details released later may confirm or soften the impact.",
      "Major actions can reprice entire sectors or asset classes, not just one ticker.",
      "Check if the regulation has immediate effect or requires further approval/implementation.",
    ],
  },
  EARNINGS_FINANCIALS: {
    what: "This is a company earnings report. Surprises in revenue, EPS, or guidance can reprice the stock quickly and affect related names in the sector.",
    reactions: [
      "Stocks often gap up or down on the open; watch whether price defends or fills that gap.",
      "Guidance and commentary can matter more than the headline EPS number.",
      "Volume staying elevated after the open can signal potential trend days.",
    ],
  },
  MA_CORPORATE_ACTIONS: {
    what: "This is news about mergers, acquisitions, buybacks, or other corporate actions. These can create immediate arbitrage opportunities or sector rotation.",
    reactions: [
      "Target companies often gap toward the offer price; acquirers may sell off on dilution concerns.",
      "Watch for competing bids or regulatory pushback that can extend timelines.",
      "Sector peers may move in sympathy if the deal signals broader consolidation.",
    ],
  },
  TECH_PRODUCT: {
    what: "This is a crypto/product update or launch. Adoption, performance, and user reaction can change how the token or company is valued.",
    reactions: [
      "'Buy the rumor, sell the news' behavior is common around launch dates.",
      "Watch whether on-chain/user activity actually picks up after the announcement.",
      "Technical issues or delays on launch day can trigger sharp selloffs.",
    ],
  },
  SECURITY_INCIDENT: {
    what: "This is a security or outage incident. It often hits confidence in the company or protocol and can trigger sharp repricing.",
    reactions: [
      "Initial selloff can be sharp; watch for follow-up news on scope, losses, or fixes.",
      "Repeat incidents or poor communication can lead to longer-lasting damage.",
      "Recovery announcements or insurance payouts can stabilize price action.",
    ],
  },
  ETFS_FLOWS: {
    what: "This is news about ETF launches, approvals, or major fund flows. Institutional money moving in or out can create sustained trends.",
    reactions: [
      "ETF approval rumors often cause volatility; actual approval can be a 'sell the news' event.",
      "Large inflows/outflows can show institutional sentiment shifts.",
      "Watch for arbitrage opportunities between ETF price and underlying assets.",
    ],
  },
  LEGAL_ENFORCEMENT: {
    what: "This is a lawsuit, investigation, or enforcement action. It can create uncertainty and pressure stock prices until resolved.",
    reactions: [
      "Settlement announcements can remove overhang and spark relief rallies.",
      "Ongoing litigation can cap upside as investors wait for clarity.",
      "Large fines or penalties can trigger selloffs if they materially impact financials.",
    ],
  },
  GEOPOLITICS_CRISIS: {
    what: "This is a geopolitical or crisis event. It tends to affect risk sentiment, commodities, and safe-haven assets.",
    reactions: [
      "Can drive flows into or out of safe-haven assets (USD, bonds, gold, sometimes BTC).",
      "Sector impact can depend on commodities, supply chains, or sanctions involved.",
      "Initial panic often fades as markets assess actual business impact vs. headline risk.",
    ],
  },
  crypto: {
    what: "This is crypto market news. It covers price action, protocol updates, regulatory developments, and adoption trends in digital assets.",
    reactions: [
      "Crypto markets trade 24/7 and can move violently on low volume during off-hours.",
      "Regulatory news from major economies can trigger sector-wide repricing.",
      "Watch Bitcoin dominance and correlation to risk assets for broader market sentiment.",
    ],
  },
  stocks: {
    what: "This is stock market news covering equities, earnings, sector rotation, and corporate developments.",
    reactions: [
      "Look for whether the first move holds or fades through the first hour of trading.",
      "Check related tickers or sector ETFs for confirmation of the narrative.",
      "Volume profile matters: strong volume confirms conviction, low volume suggests uncertainty.",
    ],
  },
  technology: {
    what: "This is technology sector news covering innovation, product launches, AI developments, and tech company performance.",
    reactions: [
      "Tech stocks often lead market moves but can be volatile on sentiment shifts.",
      "Product launch success is measured by adoption metrics, not just announcements.",
      "Watch for ripple effects across suppliers, competitors, and adjacent sectors.",
    ],
  },
  war: {
    what: "This is news related to military conflicts, geopolitical tensions, and their economic impacts.",
    reactions: [
      "Defense stocks and energy commodities often rise on escalation news.",
      "Risk-off flows can hit growth stocks while boosting safe-haven assets.",
      "Initial market reactions can be overdone; watch for fading moves as situation stabilizes.",
    ],
  },
  politics: {
    what: "This is political news covering elections, policy changes, government actions, and regulatory developments.",
    reactions: [
      "Markets often price in election outcomes months in advance; actual results can disappoint.",
      "Policy announcements can create sector rotation opportunities (e.g., clean energy on climate bills).",
      "Political gridlock can sometimes be bullish as it prevents disruptive changes.",
    ],
  },
  DEFAULT: {
    what: "This headline is tagged as a potential market catalyst based on your filters. The event type or category determines its likely market impact.",
    reactions: [
      "Look for whether the first move holds or fades.",
      "Check related tickers or sector ETFs for confirmation.",
      "Volume and price action after the initial reaction reveal conviction.",
    ],
  },
}

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

      // Try to use the first detected market topic for more specific guidance
      if (classification && classification.topics && classification.topics.length > 0) {
        const primaryTopic = classification.topics[0] as MarketTopic
        return (
          PLAYBOOK_CONTENT[primaryTopic] ||
          PLAYBOOK_CONTENT[news.category as keyof typeof PLAYBOOK_CONTENT] ||
          PLAYBOOK_CONTENT.DEFAULT
        )
      }

      return PLAYBOOK_CONTENT[news.category as keyof typeof PLAYBOOK_CONTENT] || PLAYBOOK_CONTENT.DEFAULT
    } else {
      const event = item as CalendarEvent
      // Calendar events are primarily macro/rates related
      return PLAYBOOK_CONTENT.RATES_CENTRAL_BANKS
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
            {/* Section 1: What this is */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">What this is</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{playbook.what}</p>
            </div>

            {/* Section 2: How markets usually react */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">How markets usually react</h3>
              <ul className="space-y-2">
                {playbook.reactions.map((reaction, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-accent-bright mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{reaction}</span>
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
