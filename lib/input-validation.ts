/**
 * Input Validation and Sanitization Utilities
 * 
 * Protects against XSS, injection attacks, and malformed input.
 */

/**
 * Sanitize string input by removing dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return ""
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "")
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  // Remove potential script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  
  return sanitized
}

/**
 * Validate and sanitize ticker symbol (alphanumeric, max 10 chars)
 */
export function validateTicker(ticker: string | null): string | null {
  if (!ticker) return null
  
  const sanitized = sanitizeString(ticker)
  
  // Ticker symbols are typically 1-10 uppercase letters
  if (!/^[A-Za-z0-9]{1,10}$/.test(sanitized)) {
    return null
  }
  
  return sanitized.toUpperCase()
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query: string | null): string | null {
  if (!query) return null
  
  const sanitized = sanitizeString(query)
  
  // Limit length to prevent abuse
  if (sanitized.length < 1 || sanitized.length > 100) {
    return null
  }
  
  return sanitized
}

/**
 * Validate category parameter
 */
export function validateCategory(
  category: string | null,
  allowedCategories: string[]
): string | null {
  if (!category) return null
  
  const sanitized = sanitizeString(category).toLowerCase()
  
  if (!allowedCategories.includes(sanitized)) {
    return null
  }
  
  return sanitized
}

/**
 * Validate integer parameter
 */
export function validateInteger(
  value: string | null,
  min?: number,
  max?: number
): number | null {
  if (!value) return null
  
  const parsed = parseInt(value, 10)
  
  if (isNaN(parsed)) return null
  if (min !== undefined && parsed < min) return null
  if (max !== undefined && parsed > max) return null
  
  return parsed
}

/**
 * Validate boolean parameter
 */
export function validateBoolean(value: string | null): boolean | null {
  if (!value) return null
  
  const sanitized = sanitizeString(value).toLowerCase()
  
  if (sanitized === "true" || sanitized === "1") return true
  if (sanitized === "false" || sanitized === "0") return false
  
  return null
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
export function validateDate(date: string | null): string | null {
  if (!date) return null
  
  const sanitized = sanitizeString(date)
  
  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
    return null
  }
  
  // Validate actual date
  const dateObj = new Date(sanitized)
  if (isNaN(dateObj.getTime())) {
    return null
  }
  
  return sanitized
}

/**
 * Validate email address
 */
export function validateEmail(email: string | null): string | null {
  if (!email) return null
  
  const sanitized = sanitizeString(email).toLowerCase()
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return null
  }
  
  return sanitized
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return ""
  
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Validate URL
 */
export function validateUrl(url: string | null): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url)
    
    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Create validation error response
 */
export function validationError(message: string): {
  success: false
  error: string
} {
  return {
    success: false,
    error: `Validation error: ${message}`,
  }
}
