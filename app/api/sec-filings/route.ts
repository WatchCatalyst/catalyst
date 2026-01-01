import { NextResponse } from "next/server"

export interface SECFiling {
  symbol: string
  name: string
  form: string // "10-K", "10-Q", "8-K", "4", etc.
  date: string
  url: string
  description?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol") || ""
  const formType = searchParams.get("form") || "" // e.g., "10-K", "8-K", "4"
  const limit = parseInt(searchParams.get("limit") || "50")
  
  const FMP_KEY = process.env.FMP_API_KEY

  if (!FMP_KEY) {
    console.error("[SEC Filings API] FMP_API_KEY not configured")
    return NextResponse.json({
      success: false,
      error: "API key not configured",
      data: [],
    }, { status: 500 })
  }

  try {
    // Build URL
    let url = `https://financialmodelingprep.com/api/v3/sec-filings`
    const params = new URLSearchParams()
    if (symbol) params.append("symbol", symbol.toUpperCase())
    if (formType) params.append("type", formType)
    params.append("apikey", FMP_KEY)
    url += `?${params.toString()}`

    console.log(`[SEC Filings API] Fetching: ${url.replace(FMP_KEY, "***")}`)
    
    const response = await fetch(url, { next: { revalidate: 3600 } }) // Cache 1 hour

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[SEC Filings API] FMP error ${response.status}:`, errorText.substring(0, 200))
      return NextResponse.json({
        success: false,
        error: `FMP API error: ${response.status}`,
        data: [],
        message: "SEC filings may not be available on your FMP plan",
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (!Array.isArray(data)) {
      console.warn("[SEC Filings API] Invalid response format")
      return NextResponse.json({
        success: false,
        error: "Invalid response format",
        data: [],
      }, { status: 500 })
    }

    const filings: SECFiling[] = data.slice(0, limit).map((item: any) => ({
      symbol: item.symbol || "",
      name: item.companyName || item.name || "",
      form: item.form || item.type || "",
      date: item.fillingDate || item.date || item.filedDate || "",
      url: item.link || item.url || `https://www.sec.gov/cgi-bin/viewer?action=view&cik=${item.cik}&accession_number=${item.accessionNumber}`,
      description: item.description || item.acceptedDate || "",
    }))

    // Sort by date (most recent first)
    filings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`[SEC Filings API] ✅ Got ${filings.length} filings`)

    return NextResponse.json({
      success: true,
      data: filings,
      timestamp: new Date().toISOString(),
      count: filings.length,
    })
  } catch (error) {
    console.error("[SEC Filings API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch SEC filings",
      data: [],
    }, { status: 500 })
  }
}




