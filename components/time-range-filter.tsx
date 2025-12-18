"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, AlertCircle } from "lucide-react"
import { TodayRateLimiter } from "@/lib/time-range-rate-limiter"
import { useState, useEffect } from "react"

export type TimeRange = "all" | "1h" | "4h" | "today"

type TimeRangeFilterProps = {
  value: TimeRange
  onChange: (value: TimeRange) => void
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const [remainingTodayRequests, setRemainingTodayRequests] = useState(2)

  useEffect(() => {
    setRemainingTodayRequests(TodayRateLimiter.getRemainingRequests())
  }, [value])

  const handleChange = (newValue: TimeRange) => {
    if (newValue === "today") {
      if (!TodayRateLimiter.canMakeRequest()) {
        alert("You've reached the limit of 2 'Today' requests. This limit resets daily at midnight EST.")
        return
      }
      TodayRateLimiter.incrementRequest()
      setRemainingTodayRequests(TodayRateLimiter.getRemainingRequests())
    }
    onChange(newValue)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => handleChange(v as TimeRange)}>
        <SelectTrigger className="w-[130px] h-9 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Time Range" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="1h">Last Hour</SelectItem>
          <SelectItem value="4h">Last 4 Hours</SelectItem>
          <SelectItem value="today">
            <div className="flex items-center gap-2">
              <span>Today (40 articles)</span>
              {remainingTodayRequests < 2 && (
                <span className="text-xs text-muted-foreground">({remainingTodayRequests} left)</span>
              )}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {value === "today" && remainingTodayRequests <= 1 && (
        <div className="flex items-center gap-1 text-xs text-amber-500">
          <AlertCircle className="h-3 w-3" />
          <span>
            {remainingTodayRequests} request{remainingTodayRequests !== 1 ? "s" : ""} left today
          </span>
        </div>
      )}
    </div>
  )
}
