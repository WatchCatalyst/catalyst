import type { NewsItem } from "@/app/page"

export type MarketImpactLevel = "low" | "medium" | "high" | "critical"

export type ScoreBreakdown = {
  sourceWeight: {
    score: number
    maxScore: number
    label: string
    description: string
  }
  surpriseFactor: {
    score: number
    maxScore: number
    label: string
    description: string
  }
  crossAssetEffect: {
    score: number
    maxScore: number
    label: string
    description: string
    historicalNote?: string
  }
  portfolioOverlap: {
    score: number
    maxScore: number
    label: string
    description: string
    overlappingAssets?: string[]
  }
}

export type MarketImpact = {
  level: MarketImpactLevel
  score: number // 0-100
  description: string
  color: {
    bg: string
    text: string
    border: string
  }
  breakdown: ScoreBreakdown
}

const SOURCE_TIERS: Record<string, { tier: number; label: string }> = {
  // Tier 1: Government & Central Banks (highest authority)
  "federalreserve.gov": { tier: 1, label: "Federal Reserve" },
  "sec.gov": { tier: 1, label: "SEC Official" },
  "treasury.gov": { tier: 1, label: "US Treasury" },
  "ecb.europa.eu": { tier: 1, label: "European Central Bank" },
  "bls.gov": { tier: 1, label: "Bureau of Labor Statistics" },

  // Tier 2: Top-tier financial news
  "bloomberg.com": { tier: 2, label: "Bloomberg" },
  "reuters.com": { tier: 2, label: "Reuters" },
  "wsj.com": { tier: 2, label: "Wall Street Journal" },
  "ft.com": { tier: 2, label: "Financial Times" },
  "cnbc.com": { tier: 2, label: "CNBC" },

  // Tier 3: Quality financial sources
  "marketwatch.com": { tier: 3, label: "MarketWatch" },
  "barrons.com": { tier: 3, label: "Barron's" },
  "investopedia.com": { tier: 3, label: "Investopedia" },
  "seekingalpha.com": { tier: 3, label: "Seeking Alpha" },
  "zerohedge.com": { tier: 3, label: "ZeroHedge" },
  "coindesk.com": { tier: 3, label: "CoinDesk" },
  "theblock.co": { tier: 3, label: "The Block" },

  // Tier 4: General news with financial coverage
  "nytimes.com": { tier: 4, label: "NY Times" },
  "washingtonpost.com": { tier: 4, label: "Washington Post" },
  "bbc.com": { tier: 4, label: "BBC" },
  "cnn.com": { tier: 4, label: "CNN" },
  "theguardian.com": { tier: 4, label: "The Guardian" },
}

const CROSS_ASSET_PATTERNS: Record<string, { assets: string[]; historicalMove: string }> = {
  fed: {
    assets: ["USD", "Bonds", "Gold", "Stocks"],
    historicalMove: "Fed decisions historically move SPY 1-3% and DXY 0.5-1%",
  },
  rate: {
    assets: ["Bonds", "REITs", "Banks", "USD"],
    historicalMove: "Rate changes typically move TLT 2-5% and bank stocks 3-5%",
  },
  inflation: {
    assets: ["Gold", "TIPS", "Commodities"],
    historicalMove: "CPI surprises historically move gold 1-2% same day",
  },
  oil: {
    assets: ["XLE", "Airlines", "Transport", "USD/CAD"],
    historicalMove: "Oil shocks move energy stocks 3-7% on average",
  },
  china: {
    assets: ["FXI", "Copper", "AUD", "Semis"],
    historicalMove: "China news typically moves FXI 2-4% and copper 1-2%",
  },
  earnings: {
    assets: ["Stock", "Sector ETF", "Options"],
    historicalMove: "Earnings beats/misses move stocks 5-15% on average",
  },
  crypto: {
    assets: ["BTC", "ETH", "Altcoins", "COIN"],
    historicalMove: "Major crypto news moves BTC 3-10% within hours",
  },
  war: {
    assets: ["Oil", "Gold", "Defense", "VIX"],
    historicalMove: "Geopolitical events spike VIX 10-30% and gold 1-3%",
  },
  tariff: {
    assets: ["Affected sectors", "FX pairs", "Importers"],
    historicalMove: "Tariff announcements move affected sectors 2-5%",
  },
  default: { assets: ["Related sector"], historicalMove: "Market impact varies" },
}

export function calculateMarketImpact(news: NewsItem, portfolioTickers?: string[]): MarketImpact {
  let score = 0
  const textLower = `${news.title} ${news.summary}`.toLowerCase()
  const sourceLower = (news.source || "").toLowerCase()

  // ========== SOURCE WEIGHT (0-30 points) ==========
  let sourceScore = 0
  let sourceLabel = "General News"
  let sourceDescription = "Standard news outlet"

  // Check source tier
  const sourceKey = Object.keys(SOURCE_TIERS).find((key) => sourceLower.includes(key.split(".")[0]))
  if (sourceKey) {
    const sourceTier = SOURCE_TIERS[sourceKey]
    sourceLabel = sourceTier.label
    switch (sourceTier.tier) {
      case 1:
        sourceScore = 30
        sourceDescription = "Official government/central bank source - highest authority"
        break
      case 2:
        sourceScore = 25
        sourceDescription = "Top-tier financial news - highly reliable"
        break
      case 3:
        sourceScore = 18
        sourceDescription = "Quality financial source - trusted analysis"
        break
      case 4:
        sourceScore = 12
        sourceDescription = "Major news outlet with financial coverage"
        break
    }
  } else {
    // Fallback to sourceQuality
    const sourceQuality = news.sourceQuality || 60
    if (sourceQuality >= 95) {
      sourceScore = 28
      sourceDescription = "Very high quality source"
    } else if (sourceQuality >= 85) {
      sourceScore = 20
      sourceDescription = "High quality source"
    } else if (sourceQuality >= 70) {
      sourceScore = 12
      sourceDescription = "Moderate quality source"
    } else {
      sourceScore = 5
      sourceDescription = "Lower tier source"
    }
  }
  score += sourceScore

  // ========== SURPRISE FACTOR (0-25 points) ==========
  let surpriseScore = 0
  let surpriseLabel = "Expected"
  let surpriseDescription = "Aligns with market expectations"

  // Check for surprise indicators in text
  const surpriseKeywords = [
    "unexpected",
    "surprise",
    "shock",
    "beats",
    "misses",
    "exceeds",
    "falls short",
    "contrary",
    "reversal",
    "u-turn",
    "pivot",
    "dramatic",
    "unprecedented",
  ]
  const hasStrongSurprise = surpriseKeywords.some((kw) => textLower.includes(kw))

  const mildSurpriseKeywords = [
    "better than expected",
    "worse than expected",
    "above forecast",
    "below forecast",
    "ahead of",
    "behind",
  ]
  const hasMildSurprise = mildSurpriseKeywords.some((kw) => textLower.includes(kw))

  if (hasStrongSurprise) {
    surpriseScore = 25
    surpriseLabel = "High Surprise"
    surpriseDescription = "Significant deviation from consensus expectations"
  } else if (hasMildSurprise) {
    surpriseScore = 15
    surpriseLabel = "Moderate Surprise"
    surpriseDescription = "Differs from market expectations"
  } else if (news.sentiment === "bullish" || news.sentiment === "bearish") {
    surpriseScore = 10
    surpriseLabel = "Directional"
    surpriseDescription = "Clear directional signal in the news"
  } else {
    surpriseScore = 5
    surpriseLabel = "Neutral"
    surpriseDescription = "No significant surprise element"
  }
  score += surpriseScore

  // ========== CROSS-ASSET EFFECT (0-25 points) ==========
  let crossAssetScore = 0
  let crossAssetLabel = "Single Asset"
  let crossAssetDescription = "Limited cross-market impact"
  let historicalNote: string | undefined
  let affectedAssets: string[] = []

  // Determine which pattern applies
  let matchedPattern: keyof typeof CROSS_ASSET_PATTERNS = "default"

  if (
    textLower.includes("fed") ||
    textLower.includes("federal reserve") ||
    textLower.includes("fomc") ||
    textLower.includes("powell")
  ) {
    matchedPattern = "fed"
  } else if (textLower.includes("rate") || textLower.includes("interest") || textLower.includes("yield")) {
    matchedPattern = "rate"
  } else if (textLower.includes("inflation") || textLower.includes("cpi") || textLower.includes("pce")) {
    matchedPattern = "inflation"
  } else if (
    textLower.includes("oil") ||
    textLower.includes("opec") ||
    textLower.includes("crude") ||
    textLower.includes("petroleum")
  ) {
    matchedPattern = "oil"
  } else if (textLower.includes("china") || textLower.includes("chinese") || textLower.includes("beijing")) {
    matchedPattern = "china"
  } else if (
    textLower.includes("earnings") ||
    textLower.includes("quarterly") ||
    textLower.includes("q1") ||
    textLower.includes("q2") ||
    textLower.includes("q3") ||
    textLower.includes("q4")
  ) {
    matchedPattern = "earnings"
  } else if (
    textLower.includes("bitcoin") ||
    textLower.includes("crypto") ||
    textLower.includes("ethereum") ||
    news.category === "crypto"
  ) {
    matchedPattern = "crypto"
  } else if (
    textLower.includes("war") ||
    textLower.includes("military") ||
    textLower.includes("invasion") ||
    textLower.includes("conflict")
  ) {
    matchedPattern = "war"
  } else if (
    textLower.includes("tariff") ||
    textLower.includes("trade war") ||
    textLower.includes("import") ||
    textLower.includes("export")
  ) {
    matchedPattern = "tariff"
  }

  const pattern = CROSS_ASSET_PATTERNS[matchedPattern]
  affectedAssets = pattern.assets
  historicalNote = pattern.historicalMove

  if (matchedPattern !== "default") {
    if (["fed", "war", "oil"].includes(matchedPattern)) {
      crossAssetScore = 25
      crossAssetLabel = "Multi-Asset Impact"
      crossAssetDescription = `Affects ${affectedAssets.length}+ asset classes simultaneously`
    } else if (["rate", "inflation", "china", "crypto"].includes(matchedPattern)) {
      crossAssetScore = 18
      crossAssetLabel = "Sector-Wide Impact"
      crossAssetDescription = `Ripple effects across related markets`
    } else {
      crossAssetScore = 12
      crossAssetLabel = "Related Assets"
      crossAssetDescription = `May impact correlated instruments`
    }
  } else {
    crossAssetScore = 5
    crossAssetDescription = "Primarily affects single asset"
  }
  score += crossAssetScore

  // ========== PORTFOLIO OVERLAP (0-20 points) ==========
  let portfolioScore = 0
  let portfolioLabel = "No Overlap"
  let portfolioDescription = "Not directly related to your holdings"
  let overlappingAssets: string[] = []

  if (portfolioTickers && portfolioTickers.length > 0) {
    // Check if any portfolio tickers are mentioned - use word boundaries to avoid substring matches
    overlappingAssets = portfolioTickers.filter((ticker) => {
      const tickerLower = ticker.toLowerCase()
      const tickerRegex = new RegExp(`(\\$${tickerLower}|\\b${tickerLower}\\b)`, 'i')
      return tickerRegex.test(textLower)
    })

    // Also check for sector overlap
    const sectorKeywords: Record<string, string[]> = {
      tech: ["AAPL", "MSFT", "GOOGL", "META", "NVDA", "AMD", "INTC", "QQQ"],
      finance: ["JPM", "BAC", "GS", "MS", "XLF"],
      energy: ["XOM", "CVX", "XLE", "OIL"],
      crypto: ["BTC", "ETH", "COIN", "MSTR"],
    }

    for (const [sector, tickers] of Object.entries(sectorKeywords)) {
      if (textLower.includes(sector)) {
        const sectorOverlap = portfolioTickers.filter((t) => tickers.includes(t.toUpperCase()))
        overlappingAssets.push(...sectorOverlap)
      }
    }

    overlappingAssets = [...new Set(overlappingAssets)] // Remove duplicates

    if (overlappingAssets.length >= 3) {
      portfolioScore = 20
      portfolioLabel = "High Overlap"
      portfolioDescription = `Directly impacts ${overlappingAssets.length} of your holdings`
    } else if (overlappingAssets.length >= 1) {
      portfolioScore = 12
      portfolioLabel = "Some Overlap"
      portfolioDescription = `Related to ${overlappingAssets.length} of your positions`
    } else {
      portfolioScore = 3
      portfolioDescription = "No direct portfolio impact detected"
    }
  } else {
    portfolioScore = 5
    portfolioLabel = "Unknown"
    portfolioDescription = "Add portfolio to see overlap"
  }
  score += portfolioScore

  // Determine level based on final score
  let level: MarketImpactLevel
  let description: string
  let color: { bg: string; text: string; border: string }

  if (score >= 80) {
    level = "critical"
    description = "Critical market-moving event"
    color = {
      bg: "bg-red-500/10",
      text: "text-red-500",
      border: "border-red-500/30",
    }
  } else if (score >= 60) {
    level = "high"
    description = "High market impact expected"
    color = {
      bg: "bg-orange-500/10",
      text: "text-orange-500",
      border: "border-orange-500/30",
    }
  } else if (score >= 40) {
    level = "medium"
    description = "Moderate market impact"
    color = {
      bg: "bg-yellow-500/10",
      text: "text-yellow-500",
      border: "border-yellow-500/30",
    }
  } else {
    level = "low"
    description = "Low market impact"
    color = {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/30",
    }
  }

  return {
    level,
    score,
    description,
    color,
    breakdown: {
      sourceWeight: {
        score: sourceScore,
        maxScore: 30,
        label: sourceLabel,
        description: sourceDescription,
      },
      surpriseFactor: {
        score: surpriseScore,
        maxScore: 25,
        label: surpriseLabel,
        description: surpriseDescription,
      },
      crossAssetEffect: {
        score: crossAssetScore,
        maxScore: 25,
        label: crossAssetLabel,
        description: crossAssetDescription,
        historicalNote,
      },
      portfolioOverlap: {
        score: portfolioScore,
        maxScore: 20,
        label: portfolioLabel,
        description: portfolioDescription,
        overlappingAssets: overlappingAssets.length > 0 ? overlappingAssets : undefined,
      },
    },
  }
}

export function getImpactBadgeIcon(level: MarketImpactLevel): string {
  switch (level) {
    case "critical":
      return "🔴"
    case "high":
      return "🟠"
    case "medium":
      return "🟡"
    case "low":
      return "🔵"
  }
}
