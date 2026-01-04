import { NextResponse } from "next/server"
import { API_KEYS, API_BASE_URLS } from "@/lib/api-config"

// Force dynamic rendering for real-time updates
export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface GovContract {
  id: string
  ticker: string
  agency: string
  amount: number
  description: string
  date: string
  contractor?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get("ticker") || ""
  
  const QUIVER_KEY = API_KEYS.QUIVER

  try {
    const contracts: GovContract[] = []

    if (!QUIVER_KEY) {
      return NextResponse.json({
        success: false,
        data: [],
        message: "QUIVER_API_KEY not configured. Government contracts require Quiver API access.",
      })
    }

    // Try multiple endpoint formats for government contracts
    const endpoints = [
      "/beta/live/govcontractsall",
      "/beta/live/govcontracts",
      "/beta/recent/govcontractsall",
      "/beta/recent/govcontracts",
      "/beta/historical/govcontractsall",
      "/beta/historical/govcontracts",
    ]

    let data: any[] = []

    for (const endpoint of endpoints) {
      try {
        const url = ticker 
          ? `${API_BASE_URLS.QUIVER}${endpoint}?ticker=${ticker}`
          : `${API_BASE_URLS.QUIVER}${endpoint}`
        
        console.log(`[GovContracts] Trying endpoint: ${url}`)
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${QUIVER_KEY}`,
          },
          cache: 'no-store',
        })

        if (response.ok) {
          const responseData = await response.json()
          console.log(`[GovContracts] Success! Received:`, Array.isArray(responseData) ? responseData.length : typeof responseData)
          
          if (Array.isArray(responseData) && responseData.length > 0) {
            console.log(`[GovContracts] First item keys:`, Object.keys(responseData[0]))
            console.log(`[GovContracts] Sample:`, JSON.stringify(responseData[0]).substring(0, 400))
            data = responseData
            break
          } else if (typeof responseData === 'object' && responseData !== null) {
            // Handle wrapped responses
            if (Array.isArray(responseData.data)) data = responseData.data
            else if (Array.isArray(responseData.contracts)) data = responseData.contracts
            else if (Array.isArray(responseData.results)) data = responseData.results
            
            if (data.length > 0) {
              console.log(`[GovContracts] Found data in object, keys:`, Object.keys(data[0]))
              break
            }
          }
        } else {
          const errorText = await response.text().catch(() => "")
          console.warn(`[GovContracts] Endpoint ${endpoint} failed:`, response.status, errorText.substring(0, 100))
        }
      } catch (err) {
        console.warn(`[GovContracts] Endpoint ${endpoint} error:`, err)
      }
    }

    // Map the data to our interface
    if (data.length > 0) {
      const mappedContracts = data.slice(0, 50).map((contract: any, index: number) => ({
        id: `gov-${contract.Ticker || contract.ticker || contract.Symbol || "unknown"}-${index}-${Date.now()}`,
        ticker: contract.Ticker || contract.ticker || contract.Symbol || contract.symbol || "N/A",
        agency: contract.Agency || contract.agency || contract.Department || contract.department || "Unknown Agency",
        amount: parseFloat(contract.Amount || contract.amount || contract.Value || contract.value || contract.ObligatedAmount || 0),
        description: contract.Description || contract.description || contract.Title || contract.title || contract.ContractDescription || "No description",
        date: contract.Date || contract.date || contract.AwardDate || contract.awardDate || contract.ReportDate || new Date().toISOString(),
        contractor: contract.Contractor || contract.contractor || contract.Company || contract.company || undefined,
      }))
      
      contracts.push(...mappedContracts)
      console.log(`[GovContracts] Mapped ${contracts.length} contracts`)
    }

    // Sort by date (most recent first)
    contracts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const responseData = {
      success: true,
      data: contracts,
      timestamp: new Date().toISOString(),
      count: contracts.length,
      message: contracts.length === 0 
        ? "No contracts found. Verify your Quiver API key has Tier 1 access."
        : undefined,
    }

    const response = NextResponse.json(responseData)
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error("[GovContracts] API error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch government contracts",
      data: [],
    })
  }
}
