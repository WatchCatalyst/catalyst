import type { MarketTopic } from "./market-relevance-classifier"

export type CalendarEventTopic = MarketTopic

/**
 * Maps calendar event titles to MarketTopic categories
 */
export function mapEventToTopic(eventTitle: string): MarketTopic {
  const title = eventTitle.toLowerCase()

  // Interest Rates & Central Banks
  if (
    /fomc|fed rate|federal reserve|ecb rate|boe rate|boj rate|central bank|monetary policy|interest rate decision/i.test(
      title,
    )
  ) {
    return "RATES_CENTRAL_BANKS"
  }

  // Inflation & Macro Data
  if (/cpi|inflation|pce|gdp|unemployment|jobs report|nonfarm payrolls|retail sales|pmi|ism|manufacturing|economic data/i.test(title)) {
    return "INFLATION_MACRO"
  }

  // Earnings & Financials
  if (/earnings|revenue|eps|quarterly|guidance|profit|financial results/i.test(title)) {
    return "EARNINGS_FINANCIALS"
  }

  // Regulation & Government Policy
  if (/sec|regulation|regulatory|antitrust|government policy|legislation|etf approval|etf denial|crypto ban/i.test(title)) {
    return "REGULATION_POLICY"
  }

  // M&A & Corporate Actions
  if (/merger|acquisition|m&a|takeover|buyout|stock split|buyback|token burn|ipo|initial public offering/i.test(title)) {
    return "MA_CORPORATE_ACTIONS"
  }

  // Technology & Product Launches
  if (/product launch|ai|artificial intelligence|mainnet|l2|layer 2|protocol|upgrade|software|hardware/i.test(title)) {
    return "TECH_PRODUCT"
  }

  // Security Incidents & Failures
  if (/hack|breach|exploit|security incident|outage|system failure/i.test(title)) {
    return "SECURITY_INCIDENT"
  }

  // ETFs & Institutional Flows
  if (/etf|fund flow|institutional|treasury|whale|spot etf|bitcoin etf|ethereum etf/i.test(title)) {
    return "ETFS_FLOWS"
  }

  // Legal & Litigation
  if (/lawsuit|litigation|doj|department of justice|enforcement|investigation|settlement|fine|penalty/i.test(title)) {
    return "LEGAL_ENFORCEMENT"
  }

  // Geopolitics & Crisis
  if (/war|conflict|sanctions|tariff|trade war|geopolitical|crisis|military|pandemic|supply chain/i.test(title)) {
    return "GEOPOLITICS_CRISIS"
  }

  // Default: most economic calendar events are macro-related
  return "INFLATION_MACRO"
}

/**
 * Gets high-impact mock events for the next few days
 * Used as fallback when API is unavailable
 */
export function getMockUpcomingEvents() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)

  const formatTime = (date: Date, hour: number, minute: number) => {
    const d = new Date(date)
    d.setHours(hour, minute, 0, 0)
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    })
  }

  const formatDateLabel = (date: Date) => {
    const todayStr = today.toISOString().split("T")[0]
    const tomorrowStr = tomorrow.toISOString().split("T")[0]
    const dateStr = date.toISOString().split("T")[0]

    if (dateStr === todayStr) return "Today"
    if (dateStr === tomorrowStr) return "Tomorrow"
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return [
    {
      id: "mock-1",
      title: "US CPI Data Release",
      time: formatTime(today, 8, 30),
      date: formatDateLabel(today),
      dateKey: today.toISOString().split("T")[0],
      type: "economic" as const,
      importance: "high" as const,
      currency: "USD",
      isUS: true,
      topic: "INFLATION_MACRO" as MarketTopic,
      forecast: "3.2%",
    },
    {
      id: "mock-2",
      title: "FOMC Rate Decision",
      time: formatTime(tomorrow, 14, 0),
      date: formatDateLabel(tomorrow),
      dateKey: tomorrow.toISOString().split("T")[0],
      type: "economic" as const,
      importance: "high" as const,
      currency: "USD",
      isUS: true,
      topic: "RATES_CENTRAL_BANKS" as MarketTopic,
    },
    {
      id: "mock-3",
      title: "NVIDIA Earnings",
      time: formatTime(tomorrow, 16, 0),
      date: formatDateLabel(tomorrow),
      dateKey: tomorrow.toISOString().split("T")[0],
      type: "economic" as const,
      importance: "high" as const,
      ticker: "NVDA",
      isUS: true,
      topic: "EARNINGS_FINANCIALS" as MarketTopic,
    },
    {
      id: "mock-4",
      title: "US Jobs Report (Nonfarm Payrolls)",
      time: formatTime(dayAfter, 8, 30),
      date: formatDateLabel(dayAfter),
      dateKey: dayAfter.toISOString().split("T")[0],
      type: "economic" as const,
      importance: "high" as const,
      currency: "USD",
      isUS: true,
      topic: "INFLATION_MACRO" as MarketTopic,
      forecast: "200K",
    },
    {
      id: "mock-5",
      title: "ECB Interest Rate Decision",
      time: formatTime(dayAfter, 8, 15),
      date: formatDateLabel(dayAfter),
      dateKey: dayAfter.toISOString().split("T")[0],
      type: "economic" as const,
      importance: "high" as const,
      currency: "EUR",
      isUS: false,
      topic: "RATES_CENTRAL_BANKS" as MarketTopic,
    },
  ]
}


