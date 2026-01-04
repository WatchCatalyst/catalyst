"use client"

import { useState, useEffect } from "react"
import { Calendar, ExternalLink, Loader2 } from "lucide-react"
import { getCalendarEvents } from "@/app/actions/get-calendar-events"
import { getMockUpcomingEvents, mapEventToTopic } from "@/lib/calendar-service"

type EventType = "economic" | "crypto"
type Importance = "high" | "medium" | "low"
type MarketHours = "pre-market" | "regular-hours" | "after-hours" | "market-closed"

interface CalendarEvent {
  id: string
  title: string
  time: string // EST
  date: string
  dateKey?: string // YYYY-MM-DD for grouping
  type: EventType
  importance: Importance
  actual?: string
  forecast?: string
  currency?: string // USD, EUR, etc.
  ticker?: string // BTC, ETH, etc.
  marketHours?: MarketHours
  isUS?: boolean
  topic?: string // MarketTopic for playbook routing
}

function getMarketHoursBadge(marketHours?: MarketHours) {
  if (!marketHours) return null

  const config = {
    "pre-market": { label: "Pre-Market", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    "regular-hours": { label: "Regular", className: "bg-green-500/10 text-green-500 border-green-500/20" },
    "after-hours": { label: "After Hours", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    "market-closed": { label: "Closed", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  }

  const badge = config[marketHours]
  if (!badge) return null

  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.className}`}>
      {badge.label}
    </span>
  )
}

export function CatalystCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEvents() {
      try {
        // Fetch both economic calendar events and earnings
        const [economicEvents, earningsResponse] = await Promise.all([
          getCalendarEvents(),
          fetch("/api/earnings?limit=10").catch(() => ({ json: () => ({ success: false, data: [] }) }))
        ])
        
        const earningsData = await earningsResponse.json()
        const earnings = earningsData.success ? earningsData.data || [] : []
        
        // Convert earnings to calendar event format
        const earningsEvents: CalendarEvent[] = earnings.map((earning: any) => {
          const [year, month, day] = earning.date.split('-').map(Number)
          const eventDate = new Date(year, month - 1, day)
          const today = new Date()
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          const todayStr = today.toISOString().split("T")[0]
          const tomorrowStr = tomorrow.toISOString().split("T")[0]
          const dateStr = earning.date
          
          let displayDate = "Today"
          if (dateStr === tomorrowStr) {
            displayDate = "Tomorrow"
          } else if (dateStr !== todayStr) {
            displayDate = eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          }
          
          const isAMC = earning.time?.toLowerCase().includes("amc") || earning.time?.toLowerCase().includes("after")
          const timeString = isAMC ? "4:00 PM" : "8:30 AM" // Default times for earnings
          
          return {
            id: `earnings-${earning.symbol}-${earning.date}`,
            title: `${earning.symbol} Earnings`,
            time: timeString,
            date: displayDate,
            dateKey: earning.date,
            type: "economic" as const,
            importance: "high" as const,
            ticker: earning.symbol,
            currency: "USD",
            isUS: true,
            topic: "EARNINGS_FINANCIALS",
            forecast: earning.epsEstimated ? `EPS Est: $${earning.epsEstimated.toFixed(2)}` : undefined,
          }
        })
        
        // Combine economic events with earnings
        const allEvents = [...(economicEvents || []), ...earningsEvents]
        
        // @ts-ignore - type mismatch on strict string literals vs string is fine for now
        if (allEvents && allEvents.length > 0) {
          // Get current date/time in EST for filtering
          const nowEST = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
          const todayEST = new Date(nowEST.getFullYear(), nowEST.getMonth(), nowEST.getDate())
          const currentHourEST = nowEST.getHours()
          
          // Filter out past events and events that already occurred
          const futureEvents = allEvents.filter((event) => {
            // ONLY US events
            if (!event.isUS && event.currency !== "USD") {
              return false
            }
            
            // Skip events with actual values (already occurred)
            if (event.actual) return false
            
            // Parse date from dateKey or date string
            const dateStr = event.dateKey || event.date
            if (!dateStr) return false
            
            // Handle "Today" and "Tomorrow" labels - but check if today's time has passed
            if (dateStr === "Today") {
              // If it's past 12 PM EST, don't show today's events
              return currentHourEST < 12
            }
            if (dateStr === "Tomorrow") {
              return true
            }
            
            // Parse YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const [year, month, day] = dateStr.split('-').map(Number)
              const eventDate = new Date(year, month - 1, day)
              const eventDateEST = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
              
              // Only include today and future dates
              if (eventDateEST < todayEST) {
                return false
              }
              
              // If event is today and it's past 12 PM EST, exclude it
              if (eventDateEST.getTime() === todayEST.getTime() && currentHourEST >= 12) {
                return false
              }
              
              return true
            }
            
            return true // Keep if we can't parse (shouldn't happen)
          })
          
          // Map events to topics and ensure all have topics
          const eventsWithTopics = futureEvents.map((event) => ({
            ...event,
            topic: event.topic || mapEventToTopic(event.title),
          }))
          // @ts-ignore
          setEvents(eventsWithTopics)
        } else {
          // If no data from API, use mock events (but no fake earnings)
          setEvents(getMockUpcomingEvents())
        }
      } catch (error) {
        console.error("Failed to load calendar events", error)
        // On error, show mock events so calendar isn't empty
        setEvents(getMockUpcomingEvents())
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Group events by dateKey (YYYY-MM-DD) or date (fallback)
  const groupedEvents = events.reduce((acc, event) => {
    // Prefer dateKey for grouping, fallback to date
    const key = event.dateKey || event.date
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  // Sort events within each date group: US first, then FOMC/Fed, then by importance
  Object.keys(groupedEvents).forEach((key) => {
    groupedEvents[key].sort((a, b) => {
      // US events first (check isUS flag or USD currency)
      const aIsUS = a.isUS || a.currency === "USD"
      const bIsUS = b.isUS || b.currency === "USD"
      if (aIsUS && !bIsUS) return -1
      if (!aIsUS && bIsUS) return 1

      // Then FOMC/Fed events
      const aIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(a.title)
      const bIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(b.title)
      if (aIsFed && !bIsFed) return -1
      if (!aIsFed && bIsFed) return 1

      // Then by importance (high first)
      const importanceOrder = { high: 0, medium: 1, low: 2 }
      const aImp = importanceOrder[a.importance] ?? 2
      const bImp = importanceOrder[b.importance] ?? 2
      if (aImp !== bImp) return aImp - bImp

      // Finally by time
      return a.time.localeCompare(b.time)
    })
  })

  // Sort date keys: prioritize Today/Tomorrow, then chronological
  const sortedDateKeys = Object.keys(groupedEvents).sort((a, b) => {
    const aDate = groupedEvents[a][0]?.date || a
    const bDate = groupedEvents[b][0]?.date || b
    
    // Today always first
    if (aDate === "Today") return -1
    if (bDate === "Today") return 1
    
    // Tomorrow second
    if (aDate === "Tomorrow") return -1
    if (bDate === "Tomorrow") return 1
    
    // For date keys in YYYY-MM-DD format, sort chronologically
    if (/^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b)) {
      return a.localeCompare(b)
    }
    
    // Fallback to string comparison
    return a.localeCompare(b)
  })

  return (
    <div className="glass-premium rounded-lg border border-white/10 overflow-hidden mb-6 backdrop-glow">
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-zinc-900/30 to-transparent">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-sm gradient-text-cyan">Catalyst Calendar</h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-white/10">EST</span>
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar min-h-[100px]">
        {loading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No high-impact events scheduled for the next 7 days.
          </div>
        ) : (
          sortedDateKeys.map((dateKey) => {
            const dayEvents = groupedEvents[dateKey]
            const displayDate = dayEvents[0]?.date || dateKey

            return (
              <div key={dateKey}>
                {sortedDateKeys.length > 1 && (
                  <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
                    <span className="text-xs font-semibold text-foreground">{displayDate}</span>
                  </div>
                )}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 border-b border-border/30 last:border-0 hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent transition-all cursor-pointer card-premium-hover ${
                      event.importance === "high" ? "bg-red-500/5 hover:bg-red-500/10 border-l-2 border-l-red-500/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{event.time}</span>
                        {event.importance === "high" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" title="High Impact" />
                        )}
                        {getMarketHoursBadge(event.marketHours)}
                      </div>
                      <div className="flex items-center gap-1.5">


                        {event.type === "crypto" && event.ticker && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                            {event.ticker}
                          </span>
                        )}
                        {event.type === "economic" && event.currency && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              event.isUS
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-green-500/10 text-green-500 border-green-500/20"
                            }`}
                          >
                            {event.currency}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={`text-sm font-medium leading-snug mb-1.5 ${
                      event.isUS ? "text-foreground" : "text-foreground"
                    }`}>
                      {event.title}
                    </p>

                    <div className="flex items-center justify-between">
                      {event.forecast ? (
                        <div className="flex gap-3 text-xs">
                          <span className="text-muted-foreground">
                            Fcst: <span className="text-foreground">{event.forecast}</span>
                          </span>
                          {event.actual && (
                            <span className="text-muted-foreground">
                              Act: <span className="font-bold text-foreground">{event.actual}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        sortedDateKeys.length === 1 && (
                          <div className="text-xs text-muted-foreground capitalize">{displayDate}</div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      <div className="p-2 border-t border-border bg-muted/20 space-y-2">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-1.5 mb-1">
          <p className="text-[10px] text-yellow-500/90 leading-tight">
            <strong>Verify dates:</strong> Earnings dates may occasionally be incorrect. Always cross-check with official sources before trading.
          </p>
        </div>
        <a
          href="https://tradingeconomics.com/calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-accent-bright transition-colors flex items-center justify-center gap-1 w-full"
        >
          See Full Calendar <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
