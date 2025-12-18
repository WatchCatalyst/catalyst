export type MarketTopic =
  | "RATES_CENTRAL_BANKS"
  | "INFLATION_MACRO"
  | "REGULATION_POLICY"
  | "EARNINGS_FINANCIALS"
  | "MA_CORPORATE_ACTIONS"
  | "TECH_PRODUCT"
  | "SECURITY_INCIDENT"
  | "ETFS_FLOWS"
  | "LEGAL_ENFORCEMENT"
  | "GEOPOLITICS_CRISIS"

export type MarketClassification = {
  isRelevant: boolean
  topics: MarketTopic[]
  score: number // 0-100
  reasons: string[]
}

const TOPIC_KEYWORDS: Record<MarketTopic, string[]> = {
  RATES_CENTRAL_BANKS: [
    "fed",
    "federal reserve",
    "ecb",
    "european central bank",
    "boe",
    "bank of england",
    "boj",
    "bank of japan",
    "rate decision",
    "rate hike",
    "rate cut",
    "fomc",
    "monetary policy",
    "interest rate",
    "powell",
    "lagarde",
    "central bank",
  ],
  INFLATION_MACRO: [
    "cpi",
    "inflation",
    "pce",
    "gdp",
    "unemployment",
    "jobs report",
    "nonfarm payrolls",
    "retail sales",
    "pmi",
    "ism",
    "manufacturing",
    "economic data",
    "jobless claims",
    "consumer spending",
    "wage growth",
  ],
  REGULATION_POLICY: [
    "sec",
    "cftc",
    "regulation",
    "regulatory",
    "antitrust",
    "government policy",
    "legislation",
    "compliance",
    "etf approval",
    "etf denial",
    "crypto ban",
    "kyc",
    "aml",
    "tax policy",
    "securities law",
  ],
  EARNINGS_FINANCIALS: [
    "earnings",
    "eps",
    "revenue",
    "profit",
    "quarterly results",
    "earnings beat",
    "earnings miss",
    "guidance",
    "profit warning",
    "margin",
    "balance sheet",
    "cash flow",
    "dividend",
    "revenue growth",
    "earnings call",
    "q1",
    "q2",
    "q3",
    "q4",
    "quarterly",
    "fiscal year",
    "financial results",
    "analyst",
    "rating",
    "price target",
  ],
  MA_CORPORATE_ACTIONS: [
    "merger",
    "acquisition",
    "takeover",
    "buyout",
    "partnership",
    "joint venture",
    "stock split",
    "reverse split",
    "share buyback",
    "m&a",
    "strategic alliance",
    "token burn",
    "tokenomics",
    "ipo",
    "initial public offering",
    "direct listing",
    "spac",
    "going public",
    "secondary offering",
    "capital raise",
    "funding round",
    "series a",
    "series b",
    "venture capital",
    "investment",
  ],
  TECH_PRODUCT: [
    "product launch",
    "new product",
    "ai initiative",
    "artificial intelligence",
    "machine learning",
    "mainnet",
    "l2 launch",
    "layer 2",
    "protocol launch",
    "upgrade",
    "software release",
    "hardware release",
    "consensus change",
  ],
  SECURITY_INCIDENT: [
    "hack",
    "breach",
    "exploit",
    "vulnerability",
    "cyberattack",
    "data breach",
    "security incident",
    "fraud",
    "scam",
    "rug pull",
    "smart contract bug",
    "outage",
    "system failure",
    "chain halt",
  ],
  ETFS_FLOWS: [
    "etf",
    "fund flow",
    "institutional",
    "treasury",
    "corporate buy",
    "whale",
    "large holder",
    "spot etf",
    "bitcoin etf",
    "ethereum etf",
    "fund launch",
    "inflow",
    "outflow",
    "grayscale",
    "blackrock",
  ],
  LEGAL_ENFORCEMENT: [
    "lawsuit",
    "litigation",
    "class action",
    "settlement",
    "doj",
    "department of justice",
    "enforcement action",
    "indictment",
    "investigation",
    "legal action",
    "court",
    "sanctions",
    "fine",
    "penalty",
  ],
  GEOPOLITICS_CRISIS: [
    "war",
    "conflict",
    "sanctions",
    "tariff",
    "trade war",
    "geopolitical",
    "crisis",
    "military",
    "political instability",
    "coup",
    "pandemic",
    "natural disaster",
    "supply chain",
    "commodities",
    "oil shock",
  ],
}

const NOISE_KEYWORDS = [
  "celebrity",
  "gossip",
  "concert",
  "movie",
  "fashion",
  "recipe",
  "lifestyle",
  "travel guide",
  "horoscope",
  "astrology",
  "beauty tips",
  "dating advice",
  "sports score",
  "game recap",
  "entertainment",
  "red carpet",
  "weight loss",
  "diet",
  "kardashian",
  "osbourne",
  "reality tv",
  "tv show",
  "awards show",
  "grammy",
  "oscar",
  "emmy",
  "golden globe",
  "billboard",
  "music video",
  "hollywood",
  "animal cafe",
  "animal cafes",
  "pet cafe",
  "cute trend",
  "viral trend",
  "tiktok trend",
  "instagram trend",
  "social media trend",
  "petting zoo",
  "cute animals",
  "adorable",
  "heartwarming story",
  "feel-good story",
  "human interest",
  "photography tips",
  "photo tutorial",
  "andromeda galaxy",
  "space photography",
  "amateur astronomy",
]

const CELEBRITY_PATTERNS = [
  "kardashian",
  "jenner",
  "osbourne",
  "bieber",
  "swift",
  "beyonce",
  "rihanna",
  "drake",
  "kanye",
  "kim k",
  "kylie",
  "kendall",
]

const MARKET_ASSET_KEYWORDS = [
  "stock",
  "stocks",
  "equity",
  "equities",
  "crypto",
  "cryptocurrency",
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "nasdaq",
  "s&p 500",
  "dow",
  "market",
  "trading",
  "trader",
  "investor",
  "portfolio",
  "shares",
  "share price",
  "market cap",
  "valuation",
  "publicly traded",
  "exchange",
  "nyse",
  "nasdaq",
  "wall street",
  "financial",
  "finance",
]

export function classifyArticleForMarkets(article: {
  title: string
  summary: string
  keywords?: string[]
}): MarketClassification {
  const text = `${article.title} ${article.summary} ${(article.keywords || []).join(" ")}`.toLowerCase()

  const hasNoise = NOISE_KEYWORDS.some((keyword) => text.includes(keyword))
  const hasCelebrity = CELEBRITY_PATTERNS.some((name) => text.includes(name))

  // Immediately reject if it's celebrity gossip
  if (hasCelebrity && hasNoise) {
    return {
      isRelevant: false,
      topics: [],
      score: 0,
      reasons: ["Filtered out as celebrity gossip/entertainment content"],
    }
  }

  if (hasNoise) {
    const anyMarketContext =
      text.includes("stock") ||
      text.includes("market") ||
      text.includes("trading") ||
      text.includes("earnings") ||
      text.includes("ipo") ||
      text.includes("revenue") ||
      text.includes("profit") ||
      text.includes("investor") ||
      text.includes("economy") ||
      text.includes("economic") ||
      text.includes("company") ||
      text.includes("business") ||
      text.includes("finance") ||
      text.includes("bank") ||
      text.includes("crypto") ||
      text.includes("bitcoin") ||
      text.includes("federal") ||
      text.includes("inflation") ||
      text.includes("rate")

    if (!anyMarketContext) {
      return {
        isRelevant: false,
        topics: [],
        score: 0,
        reasons: ["Filtered out as lifestyle/entertainment content without market context"],
      }
    }
  }

  const topics: MarketTopic[] = []
  const reasons: string[] = []
  let rawScore = 0

  // Check each topic for matches
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matchedKeywords = keywords.filter((keyword) => text.includes(keyword))

    if (matchedKeywords.length > 0) {
      topics.push(topic as MarketTopic)
      rawScore += matchedKeywords.length * 10 // 10 points per keyword match
      reasons.push(`Matches ${getTopicLabel(topic as MarketTopic)} (found: ${matchedKeywords.slice(0, 3).join(", ")})`)
    }
  }

  // Bonus for mentioning market/asset keywords
  const assetMatches = MARKET_ASSET_KEYWORDS.filter((keyword) => text.includes(keyword))
  if (assetMatches.length > 0) {
    rawScore += assetMatches.length * 15 // 15 points per asset mention
    reasons.push(`Mentions market assets (${assetMatches.slice(0, 2).join(", ")})`)
  }

  // Check for ticker symbols ($BTC, $AAPL, etc.)
  const tickerMatches = text.match(/\$[A-Z]{2,5}/g)
  if (tickerMatches && tickerMatches.length > 0) {
    rawScore += tickerMatches.length * 10
    reasons.push(`Contains ticker symbols (${tickerMatches.slice(0, 3).join(", ")})`)
  }

  const companyKeywords = [
    "apple",
    "microsoft",
    "tesla",
    "google",
    "amazon",
    "meta",
    "nvidia",
    "amd",
    "intel",
    "spacex",
    "oracle",
    "salesforce",
    "netflix",
  ]
  const companyMatches = companyKeywords.filter((company) => text.includes(company))
  if (companyMatches.length > 0) {
    rawScore += companyMatches.length * 20
    reasons.push(`Mentions major companies (${companyMatches.slice(0, 2).join(", ")})`)
  }

  // Normalize score to 0-100 range
  const normalizedScore = Math.min(100, Math.max(0, rawScore))

  const isRelevant =
    normalizedScore >= 10 || // Any article with score 10+ passes
    topics.length > 0 || // Any topic match passes
    assetMatches.length >= 1 || // Single market asset mention passes
    companyMatches.length >= 1 || // Single company mention passes
    (tickerMatches && tickerMatches.length >= 1) // Single ticker passes

  return {
    isRelevant,
    topics,
    score: normalizedScore,
    reasons: reasons.length > 0 ? reasons : ["General market news"],
  }
}

export function getTopicLabel(topic: MarketTopic): string {
  const labels: Record<MarketTopic, string> = {
    RATES_CENTRAL_BANKS: "Rates & Central Banks",
    INFLATION_MACRO: "Inflation & Macro",
    REGULATION_POLICY: "Regulation & Policy",
    EARNINGS_FINANCIALS: "Earnings & Financials",
    MA_CORPORATE_ACTIONS: "M&A & Corporate Actions",
    TECH_PRODUCT: "Tech & Product",
    SECURITY_INCIDENT: "Security Incident",
    ETFS_FLOWS: "ETFs & Flows",
    LEGAL_ENFORCEMENT: "Legal & Enforcement",
    GEOPOLITICS_CRISIS: "Geopolitics & Crisis",
  }
  return labels[topic]
}

export function getTopicColor(topic: MarketTopic): { bg: string; text: string; border: string } {
  const colors: Record<MarketTopic, { bg: string; text: string; border: string }> = {
    RATES_CENTRAL_BANKS: {
      bg: "bg-purple-500/10",
      text: "text-purple-500",
      border: "border-purple-500/30",
    },
    INFLATION_MACRO: {
      bg: "bg-orange-500/10",
      text: "text-orange-500",
      border: "border-orange-500/30",
    },
    REGULATION_POLICY: {
      bg: "bg-red-500/10",
      text: "text-red-500",
      border: "border-red-500/30",
    },
    EARNINGS_FINANCIALS: {
      bg: "bg-green-500/10",
      text: "text-green-500",
      border: "border-green-500/30",
    },
    MA_CORPORATE_ACTIONS: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/30",
    },
    TECH_PRODUCT: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-500",
      border: "border-cyan-500/30",
    },
    SECURITY_INCIDENT: {
      bg: "bg-red-600/10",
      text: "text-red-600",
      border: "border-red-600/30",
    },
    ETFS_FLOWS: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-500",
      border: "border-indigo-500/30",
    },
    LEGAL_ENFORCEMENT: {
      bg: "bg-yellow-600/10",
      text: "text-yellow-600",
      border: "border-yellow-600/30",
    },
    GEOPOLITICS_CRISIS: {
      bg: "bg-gray-500/10",
      text: "text-gray-400",
      border: "border-gray-500/30",
    },
  }
  return colors[topic]
}
