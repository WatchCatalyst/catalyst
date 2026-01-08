/**
 * Security Headers Middleware
 * 
 * Adds security headers to protect against common web vulnerabilities.
 */

import { NextResponse } from "next/server"

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): void {
  // Content Security Policy (CSP)
  // Adjust these policies based on your needs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.coingecko.com https://api.binance.com https://api.binance.us https://api.stocktwits.com https://eodhd.com https://financialmodelingprep.com https://finnhub.io https://api.quiverquant.com https://vercel.live wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
  
  response.headers.set("Content-Security-Policy", csp)
  
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")
  
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")
  
  // Enable XSS protection (legacy, but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block")
  
  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  
  // Permissions policy (limit browser features)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )
  
  // HSTS (Strict-Transport-Security) - force HTTPS
  // Only add in production with HTTPS
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }
}

/**
 * Configure CORS headers
 */
export function addCorsHeaders(
  response: NextResponse,
  origin?: string
): void {
  // In production, restrict to your domains
  const allowedOrigins = [
    "https://watchcatalyst.xyz",
    "https://www.watchcatalyst.xyz",
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean)
  
  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://localhost:3001")
  }
  
  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  } else if (process.env.NODE_ENV === "development") {
    // In development, allow all origins
    response.headers.set("Access-Control-Allow-Origin", "*")
  }
  
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  )
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  )
  response.headers.set("Access-Control-Max-Age", "86400") // 24 hours
}
