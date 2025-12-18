import { streamText } from "ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, summary, category } = body

    if (!title || !summary) {
      return new Response("Title and summary are required", { status: 400 })
    }

    const result = streamText({
      model: "openai/gpt-4o-mini",
      prompt: `You are an expert trading analyst providing real-time market commentary.

Analyze this breaking news and provide actionable trading insights:

Category: ${category}
Title: ${title}
Summary: ${summary}

Provide a detailed analysis covering:
1. Immediate market implications
2. Which specific assets/tokens/stocks will be affected and how
3. Trading opportunities and risks
4. Recommended position sizing and stop losses
5. Technical levels to watch
6. Time-sensitive action items

Be specific, use numbers, mention exact tickers/symbols, and provide concrete trading strategies.`,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Error streaming analysis:", error)
    return new Response("Failed to generate analysis", { status: 500 })
  }
}
