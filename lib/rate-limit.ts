/**
 * Rate Limiting Middleware
 * 
 * Protects API routes from abuse by limiting the number of requests per IP address.
 * For production, consider using Redis or a dedicated rate limiting service.
 */

import { NextRequest, NextResponse } from "next/server"

interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory storage (for production, use Redis or similar)
const rateLimitMap = new Map<string, RateLimitRecord>()

// Configuration
export const RATE_LIMIT_CONFIG = {
  // API routes: 60 requests per minute
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  // Auth routes: 10 requests per minute (stricter)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Search routes: 20 requests per minute
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
}

/**
 * Get rate limit key from request (IP address + route)
 */
function getRateLimitKey(request: NextRequest, route: string): string {
  const ip = 
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  
  return `${ip}:${route}`
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: { windowMs: number; maxRequests: number } = RATE_LIMIT_CONFIG.api
): {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
} {
  const route = request.nextUrl.pathname
  const key = getRateLimitKey(request, route)
  const now = Date.now()

  const record = rateLimitMap.get(key)

  // No record exists - create one
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
      limit: config.maxRequests,
    }
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      limit: config.maxRequests,
    }
  }

  // Increment count
  record.count++
  rateLimitMap.set(key, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
    limit: config.maxRequests,
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  rateLimit: { remaining: number; resetAt: number; limit: number }
): void {
  response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString())
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
  response.headers.set("X-RateLimit-Reset", rateLimit.resetAt.toString())
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  
  return NextResponse.json(
    {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  )
}

/**
 * Cleanup expired rate limit records periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 1000) // Clean up every minute
