"use server"

interface FMPEvent {
  event: string
  date: string
  country: string
  actual: number | null
  previous: number | null
  estimate: number | null
  impact: string
  currency: string
}

interface FinnhubEvent {
  time: string
  date: string
  country: string
  event: string
  actual: number | null
  estimate: number | null
  currency: string
  impact: string
}

type MarketHours = "pre-market" | "regular-hours" | "after-hours" | "market-closed"

function getMarketHours(eventDate: Date): MarketHours {
  // Convert to EST timezone using Intl.DateTimeFormat
  const estFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  })

  // Get EST date parts
  const estParts = estFormatter.formatToParts(eventDate)
  const dayOfWeek = estParts.find((p) => p.type === "weekday")?.value
  const hour = parseInt(estParts.find((p) => p.type === "hour")?.value || "0")
  const minute = parseInt(estParts.find((p) => p.type === "minute")?.value || "0")

  // Market is closed on weekends
  if (dayOfWeek === "Sat" || dayOfWeek === "Sun") {
    return "market-closed"
  }

  const totalMinutes = hour * 60 + minute

  // Pre-Market: 4:00 AM - 9:30 AM EST (240 - 570 minutes)
  if (totalMinutes >= 240 && totalMinutes < 570) {
    return "pre-market"
  }

  // Regular Hours: 9:30 AM - 4:00 PM EST (570 - 960 minutes)
  if (totalMinutes >= 570 && totalMinutes < 960) {
    return "regular-hours"
  }

  // After Hours: 4:00 PM - 8:00 PM EST (960 - 1200 minutes)
  if (totalMinutes >= 960 && totalMinutes < 1200) {
    return "after-hours"
  }

  // Market Closed: 8:00 PM - 4:00 AM EST
  return "market-closed"
}

function formatDateLabel(eventDate: Date, todayDate: string, tomorrowDate: string): string {
  const eventDateStr = eventDate.toISOString().split("T")[0]
  
  if (eventDateStr === todayDate) {
    return "Today"
  }
  
  if (eventDateStr === tomorrowDate) {
    return "Tomorrow"
  }
  
  return eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Note: This fallback is now rarely used since calendar component uses getMockUpcomingEvents()
// Keeping for backward compatibility
const FALLBACK_EVENTS = [
  {
    id: "fallback-1",
    title: "FOMC Meeting Minutes",
    time: "2:00 PM",
    date: "Nov 26",
    type: "economic",
    importance: "high" as const,
    actual: null,
    forecast: null,
    currency: "USD",
    marketHours: "regular-hours" as MarketHours,
    dateKey: "2024-11-26",
    isUS: true,
    topic: "RATES_CENTRAL_BANKS",
  },
  {
    id: "fallback-2",
    title: "GDP Growth Rate (2nd Est)",
    time: "8:30 AM",
    date: "Nov 26",
    type: "economic",
    importance: "high" as const,
    actual: "2.9%",
    forecast: "3.1%",
    currency: "USD",
    marketHours: "pre-market" as MarketHours,
    dateKey: "2024-11-26",
    isUS: true,
  },
  {
    id: "fallback-3",
    title: "Core PCE Price Index (MoM)",
    time: "8:30 AM",
    date: "Nov 26",
    type: "economic",
    importance: "high" as const,
    actual: null,
    forecast: "0.3%",
    currency: "USD",
    marketHours: "pre-market" as MarketHours,
    dateKey: "2024-11-26",
    isUS: true,
  },
  {
    id: "fallback-4",
    title: "Initial Jobless Claims",
    time: "8:30 AM",
    date: "Nov 26",
    type: "economic",
    importance: "medium" as const,
    actual: "215K",
    forecast: "220K",
    currency: "USD",
    marketHours: "pre-market" as MarketHours,
    dateKey: "2024-11-26",
    isUS: true,
  },
  {
    id: "fallback-5",
    title: "Thanksgiving Day (Market Closed)",
    time: "All Day",
    date: "Nov 27",
    type: "economic",
    importance: "high" as const,
    actual: null,
    forecast: null,
    currency: "USD",
    marketHours: "market-closed" as MarketHours,
    dateKey: "2024-11-27",
    isUS: true,
  },
  {
    id: "fallback-6",
    title: "Black Friday (Early Close 1:00 PM)",
    time: "1:00 PM",
    date: "Nov 28",
    type: "economic",
    importance: "medium" as const,
    actual: null,
    forecast: null,
    currency: "USD",
    marketHours: "regular-hours" as MarketHours,
    dateKey: "2024-11-28",
    isUS: true,
  },
  {
    id: "fallback-7",
    title: "ISM Manufacturing PMI",
    time: "10:00 AM",
    date: "Dec 01",
    type: "economic",
    importance: "high" as const,
    actual: null,
    forecast: "47.5",
    currency: "USD",
    marketHours: "regular-hours" as MarketHours,
    dateKey: "2024-12-01",
    isUS: true,
  },
  {
    id: "fallback-8",
    title: "JOLTs Job Openings",
    time: "10:00 AM",
    date: "Dec 02",
    type: "economic",
    importance: "high" as const,
    actual: null,
    forecast: "7.5M",
    currency: "USD",
    marketHours: "regular-hours" as MarketHours,
    dateKey: "2024-12-02",
    isUS: true,
  },
]

export async function getCalendarEvents() {
  const fmpKey = process.env.FMP_API_KEY
  const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY

  console.log("[v0] Calendar Check - Keys present:", { fmp: !!fmpKey, finnhub: !!finnhubKey })

  const now = new Date()
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const fromDate = now.toISOString().split("T")[0]
  const toDate = nextWeek.toISOString().split("T")[0]
  
  // Get today and tomorrow date strings for comparison
  const todayDate = fromDate
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  console.log("[v0] Fetching calendar from", fromDate, "to", toDate)

  try {
    if (fmpKey) {
      try {
        // Use the new stable endpoint that's supported for new subscriptions
        const url = `https://financialmodelingprep.com/stable/economic-calendar?apikey=${fmpKey}`
        console.log("[v0] Trying FMP Stable Calendar API (PRIMARY)...")

        const response = await fetch(url, { next: { revalidate: 300 } })
        console.log("[v0] FMP Response Status:", response.status)

        if (response.ok) {
          const data: FMPEvent[] = await response.json()
          console.log("[v0] FMP Data Received:", data?.length || 0, "events")

          // Get current date/time in EST for proper filtering
          const nowEST = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
          const todayEST = new Date(nowEST.getFullYear(), nowEST.getMonth(), nowEST.getDate())
          const currentHourEST = nowEST.getHours()
          const currentMinuteEST = nowEST.getMinutes()
          
          // Filter events within our date range since the stable endpoint returns all upcoming events
          const relevantEvents = data
            .filter((item) => {
              // Skip events that already have actual values (they've already occurred)
              if (item.actual !== null && item.actual !== undefined) {
                return false
              }
              
              // Parse event date - FMP returns dates in YYYY-MM-DD format
              const [year, month, day] = item.date.split('-').map(Number)
              const eventDate = new Date(year, month - 1, day)
              const eventDateEST = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
              
              // Only include events from today onwards (in EST)
              if (eventDateEST < todayEST) {
                return false
              }
              
              // If event is today, check if time has passed
              // Most US economic releases are at 8:30 AM or 10:00 AM EST
              // If it's past 4:00 PM EST today, assume all today's events have passed
              if (eventDateEST.getTime() === todayEST.getTime()) {
                // If it's after 4 PM EST, exclude today's events (market close)
                if (currentHourEST >= 16) {
                  return false
                }
                // If it's after 12 PM EST, only include afternoon events (rare, but possible)
                // Most economic data is released 8:30 AM - 10:00 AM, so if it's past noon, they're done
                if (currentHourEST >= 12) {
                  return false
                }
              }
              
              // Check if event is within our date range
              const fromDateObj = new Date(fromDate)
              const toDateObj = new Date(toDate)
              return eventDate >= fromDateObj && eventDate <= toDateObj
            })
            .filter((item) => {
              // ONLY US events - user requested US-only
              const isUS = item.country === "US" || item.currency === "USD"
              if (!isUS) {
                return false
              }
              
              // Only high or medium impact US events
              return item.impact === "High" || item.impact === "Medium"
            })
            .sort((a, b) => {
              // Prioritize US events first (always)
              const aIsUS = a.country === "US" || a.currency === "USD"
              const bIsUS = b.country === "US" || b.currency === "USD"
              if (aIsUS && !bIsUS) return -1
              if (!aIsUS && bIsUS) return 1

              // Within US events, prioritize FOMC/Fed events
              if (aIsUS && bIsUS) {
                const aIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(a.event)
                const bIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(b.event)
                if (aIsFed && !bIsFed) return -1
                if (!aIsFed && bIsFed) return 1
              }

              // Then prioritize FOMC/Fed events from other countries
              const aIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(a.event)
              const bIsFed = /FOMC|Fed|Federal Reserve|Fed Rate/i.test(b.event)
              if (aIsFed && !bIsFed) return -1
              if (!aIsFed && bIsFed) return 1

              // Then by impact (high first)
              const impactOrder = { High: 0, Medium: 1, Low: 2 }
              const impactDiff = (impactOrder[a.impact as keyof typeof impactOrder] || 2) - (impactOrder[b.impact as keyof typeof impactOrder] || 2)
              if (impactDiff !== 0) return impactDiff

              // Finally by date
              return new Date(a.date).getTime() - new Date(b.date).getTime()
            })
            .slice(0, 30) // Increase limit to ensure we get enough US events

          if (relevantEvents.length > 0) {
            // Import once at the top
            const { mapEventToTopic } = await import("@/lib/calendar-service")
            
            const processedEvents = relevantEvents.map((event, index) => {
              // Parse date properly to avoid timezone issues
              const [year, month, day] = event.date.split('-').map(Number)
              const eventDate = new Date(year, month - 1, day)
              
              // For time, FMP doesn't provide time, so we'll use a default or extract from date if available
              // Since FMP economic calendar doesn't include time, we'll set a default market hours time
              const timeString = eventDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/New_York",
              })

              const displayDate = formatDateLabel(eventDate, todayDate, tomorrowDate)
              const marketHours = getMarketHours(eventDate)
              const dateKey = eventDate.toISOString().split("T")[0]
              
              return {
                id: `fmp-${index}`,
                title: event.event,
                time: timeString,
                date: displayDate,
                dateKey,
                type: "economic",
                importance: (event.impact?.toLowerCase() as "high" | "medium" | "low") || "medium",
                actual: event.actual?.toString(),
                forecast: event.estimate?.toString(),
                currency: event.currency || event.country,
                marketHours,
                isUS: event.country === "US" || event.currency === "USD",
                topic: mapEventToTopic(event.event),
              }
            })

            console.log("[v0] ✅ FMP SUCCESS - Returning", processedEvents.length, "events")
            return processedEvents
          }
        } else {
          const errorText = await response.text()
          console.error("[v0] FMP API Error:", {
            status: response.status,
            statusText: response.statusText,
            body: errorText.substring(0, 200),
          })

          if (response.status === 403) {
            console.warn("[v0] ⚠️ FMP API: Access denied - Check if Starter plan is active")
          } else if (response.status === 401) {
            console.warn("[v0] ⚠️ FMP API: Invalid API key")
          }
        }
      } catch (e) {
        console.error("[v0] FMP fetch failed with exception:", e)
      }
    } else {
      console.log("[v0] No FMP API key found, skipping...")
    }

    console.warn("[v0] ⚠️ FMP calendar API failed - calendar component will use mock events")
    // Don't return fallback events - let the component use mock events instead
    // This ensures dates are always current
    return []
  } catch (error) {
    console.error("[v0] Calendar fetch completely failed:", error)
    return FALLBACK_EVENTS
  }
}
