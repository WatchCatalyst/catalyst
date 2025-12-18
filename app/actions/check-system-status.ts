"use server"

export type SystemStatus = {
  theNewsApi: { configured: boolean; status: "ok" | "error" | "unknown" }
  fmpApi: { configured: boolean; status: "ok" | "error" | "unknown" }
}

export async function checkSystemStatus(): Promise<SystemStatus> {
  const newsKey = process.env.THENEWSAPI_KEY
  const calendarKey = process.env.FMP_API_KEY || process.env.FINNHUB_API_KEY

  return {
    theNewsApi: {
      configured: !!newsKey,
      status: newsKey ? "ok" : "error",
    },
    fmpApi: {
      configured: !!calendarKey,
      status: calendarKey ? "ok" : "error",
    },
  }
}
