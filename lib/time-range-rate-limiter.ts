export class TodayRateLimiter {
  private static readonly MAX_TODAY_REQUESTS = 2
  private static readonly STORAGE_KEY = "watchcatalyst_today_requests"

  static canMakeRequest(): boolean {
    if (typeof window === "undefined") return true

    const data = this.getRequestData()
    const today = new Date().toDateString()

    // Reset counter if it's a new day
    if (data.date !== today) {
      this.resetRequests()
      return true
    }

    return data.count < this.MAX_TODAY_REQUESTS
  }

  static getRemainingRequests(): number {
    if (typeof window === "undefined") return this.MAX_TODAY_REQUESTS

    const data = this.getRequestData()
    const today = new Date().toDateString()

    if (data.date !== today) {
      return this.MAX_TODAY_REQUESTS
    }

    return Math.max(0, this.MAX_TODAY_REQUESTS - data.count)
  }

  static incrementRequest(): void {
    if (typeof window === "undefined") return

    const data = this.getRequestData()
    const today = new Date().toDateString()

    if (data.date !== today) {
      // New day, reset counter
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ date: today, count: 1 }))
    } else {
      // Same day, increment
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ date: today, count: data.count + 1 }))
    }
  }

  private static getRequestData(): { date: string; count: number } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return { date: "", count: 0 }
      }
      return JSON.parse(stored)
    } catch {
      return { date: "", count: 0 }
    }
  }

  private static resetRequests(): void {
    const today = new Date().toDateString()
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ date: today, count: 0 }))
  }
}
