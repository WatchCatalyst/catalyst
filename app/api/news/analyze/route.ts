import { NextResponse } from "next/server"
import { generateText } from "ai"

// Fallback analysis when AI is unavailable
function generateFallbackAnalysis(title: string, summary: string, category: string) {
  const content = `${title} ${summary}`.toLowerCase()
  
  // Sentiment detection
  const bullishKeywords = ["surge", "rally", "gains", "breakthrough", "success", "growth", "record", "high", "bullish", "adoption", "expand"]
  const bearishKeywords = ["crash", "drop", "fall", "decline", "loss", "bearish", "concern", "warning", "risk", "shutdown"]
  
  const bullishCount = bullishKeywords.filter(word => content.includes(word)).length
  const bearishCount = bearishKeywords.filter(word => content.includes(word)).length
  
  let sentiment: "bullish" | "bearish" | "neutral" = "neutral"
  if (bullishCount > bearishCount) sentiment = "bullish"
  else if (bearishCount > bullishCount) sentiment = "bearish"
  
  // Relevance scoring
  const tradingKeywords = ["bitcoin", "btc", "ethereum", "eth", "crypto", "stock", "market", "trading", "price", "usd"]
  const relevanceScore = Math.min(100, tradingKeywords.filter(word => content.includes(word)).length * 20 + 40)
  
  // Trading signal
  const signals = {
    bullish: "Bullish Signal - Monitor for Entry",
    bearish: "Bearish Signal - Consider Protection",
    neutral: "Neutral - Wait for Confirmation"
  }
  
  // Key insights
  const insights = [
    `${category.charAt(0).toUpperCase() + category.slice(1)} news with ${sentiment} sentiment detected`,
    `Market relevance score: ${relevanceScore}/100`,
    sentiment === "bullish" 
      ? "Positive momentum indicators suggest potential upside"
      : sentiment === "bearish"
      ? "Caution advised - negative factors identified"
      : "Mixed signals - wait for clearer direction"
  ]
  
  // Affected assets
  const assetMap: Record<string, string[]> = {
    crypto: ["BTC", "ETH", "SOL", "USDT"],
    stocks: ["SPY", "QQQ", "NVDA", "TSLA"],
    geopolitics: ["GOLD", "OIL", "USD"],
    technology: ["AAPL", "GOOGL", "MSFT", "META"],
    politics: ["GOLD", "USD", "BONDS"],
    sports: ["DKNG", "PENN"],
    animals: ["DOGE", "SHIB"]
  }
  
  return {
    sentiment,
    relevanceScore,
    tradingSignal: signals[sentiment],
    keyInsights: insights,
    affectedAssets: assetMap[category] || ["BTC", "ETH"],
    timeframe: sentiment === "neutral" ? "medium-term" : "short-term"
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, summary, category } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    console.log("[v0] Analyzing news with AI:", { title, category })

    try {
      const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: `You are a professional trading analyst. Analyze this news and return ONLY valid JSON (no markdown, no extra text).

Category: ${category}
Title: ${title}
Summary: ${summary || title}

If the news is technical, unrelated to markets, or has no trading impact (like GitHub PRs, software updates, or general noise), return "neutral" sentiment, low relevance score (< 20), and empty affectedAssets.

Return this exact JSON structure:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "relevanceScore": number (0-100),
  "tradingSignal": "concise signal like 'Strong Buy', 'Caution', or 'No Action'",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "affectedAssets": ["BTC", "ETH", etc] (return empty array [] if no specific assets affected),
  "timeframe": "immediate" | "short-term" | "medium-term" | "long-term"
}`,
        maxOutputTokens: 500,
      })

      // Parse AI response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        console.log("[v0] AI analysis complete:", analysis)
        return NextResponse.json({ data: analysis })
      }
    } catch (aiError) {
      console.log("[v0] AI unavailable, using fallback analysis:", aiError)
    }

    const fallbackAnalysis = generateFallbackAnalysis(title, summary || title, category)
    console.log("[v0] Using fallback analysis:", fallbackAnalysis)
    
    return NextResponse.json({ data: fallbackAnalysis })

  } catch (error) {
    console.error("[v0] Error analyzing news:", error)
    return NextResponse.json({ error: "Failed to analyze news" }, { status: 500 })
  }
}
