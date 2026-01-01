"use server"

export type SystemStatus = {
  eodhdApi: { configured: boolean; status: "ok" | "error" | "unknown" }
  fmpApi: { configured: boolean; status: "ok" | "error" | "unknown" }
}

export async function checkSystemStatus(): Promise<SystemStatus> {
  const eodhdKey = process.env.EODHD_API_KEY
  const calendarKey = process.env.FMP_API_KEY

  return {
    eodhdApi: {
      configured: !!eodhdKey,
      status: eodhdKey ? "ok" : "error",
    },
    fmpApi: {
      configured: !!calendarKey,
      status: calendarKey ? "ok" : "error",
    },
  }
}
