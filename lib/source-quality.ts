export type SourceQuality = {
  score: number
  tier: "premium" | "reliable" | "standard" | "unverified"
  description: string
}

const SOURCE_RATINGS: Record<string, number> = {
  // Tier 1: Premium sources (95-100)
  "Bloomberg": 98,
  "Reuters": 97,
  "Financial Times": 97,
  "The Wall Street Journal": 96,
  "Associated Press": 96,
  "The Economist": 95,
  
  // Tier 2: Highly reliable (85-94)
  "CNBC": 92,
  "CNN Business": 90,
  "BBC News": 92,
  "The New York Times": 91,
  "Washington Post": 90,
  "Fortune": 89,
  "Forbes": 88,
  "MarketWatch": 88,
  "Barron's": 90,
  "CoinDesk": 87,
  "TechCrunch": 86,
  "The Verge": 85,
  
  // Tier 3: Reliable (70-84)
  "Business Insider": 82,
  "Yahoo Finance": 80,
  "CNBC.com": 80,
  "Investopedia": 78,
  "Decrypt": 76,
  "CryptoSlate": 75,
  "Cointelegraph": 74,
  "ESPN": 85,
  "The Athletic": 83,
  
  // Default for unknown sources
  "Unknown": 60
}

export function getSourceQuality(sourceName: string): SourceQuality {
  const score = SOURCE_RATINGS[sourceName] || SOURCE_RATINGS["Unknown"]
  
  let tier: SourceQuality["tier"]
  let description: string
  
  if (score >= 95) {
    tier = "premium"
    description = "Premium verified source"
  } else if (score >= 85) {
    tier = "reliable"
    description = "Highly reliable source"
  } else if (score >= 70) {
    tier = "standard"
    description = "Standard source"
  } else {
    tier = "unverified"
    description = "Unverified source"
  }
  
  return { score, tier, description }
}

export function getSourceBadgeColor(tier: SourceQuality["tier"]): string {
  const colors = {
    premium: "bg-accent-bright/20 text-accent-bright border-accent-bright/30",
    reliable: "bg-success/20 text-success border-success/30",
    standard: "bg-muted text-muted-foreground border-border",
    unverified: "bg-warning/20 text-warning border-warning/30"
  }
  return colors[tier]
}
