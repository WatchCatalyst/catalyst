# Security Documentation

This document outlines the security measures implemented in the WatchCatalyst application.

## Overview

The application implements multiple layers of security to protect against common web vulnerabilities and ensure safe operation for users.

## Implemented Security Measures

### 1. Rate Limiting

**Location**: `lib/rate-limit.ts`

**Purpose**: Prevent API abuse, DDoS attacks, and excessive API key usage that could lead to cost spikes.

**Implementation**:
- In-memory rate limiting (for production, consider Redis)
- Different limits for different route types:
  - API routes: 60 requests/minute per IP
  - Auth routes: 10 requests/minute per IP
  - Search routes: 20 requests/minute per IP
- Rate limit headers exposed to clients:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Timestamp when limit resets
  - `Retry-After`: Seconds to wait when rate limited

**Protected Routes**:
- `/api/chart`
- `/api/news/search`
- `/api/congress/trades`
- `/api/earnings`
- `/api/sec-filings`

### 2. Input Validation & Sanitization

**Location**: `lib/input-validation.ts`

**Purpose**: Protect against XSS, injection attacks, and malformed input.

**Features**:
- String sanitization (removes null bytes, script tags)
- Ticker symbol validation (alphanumeric, max 10 chars)
- Search query validation (1-100 chars, sanitized)
- Category validation (whitelist-based)
- Integer validation (with min/max bounds)
- Date validation (YYYY-MM-DD format)
- Email validation
- URL validation (http/https only)
- HTML sanitization for user-generated content

**Applied To**:
- All API route query parameters
- User input from forms
- URL parameters

### 3. Security Headers

**Location**: `lib/security-headers.ts`

**Purpose**: Protect against clickjacking, XSS, MIME sniffing, and other browser-based attacks.

**Implemented Headers**:

1. **Content-Security-Policy (CSP)**
   - Restricts resource loading to trusted sources
   - Prevents inline script execution (with exceptions for necessary libraries)
   - Blocks frame embedding (`frame-ancestors 'none'`)
   - Limits API connections to approved domains

2. **X-Frame-Options**: `DENY`
   - Prevents clickjacking by disallowing iframe embedding

3. **X-Content-Type-Options**: `nosniff`
   - Prevents MIME type sniffing

4. **X-XSS-Protection**: `1; mode=block`
   - Enables browser XSS filtering

5. **Referrer-Policy**: `strict-origin-when-cross-origin`
   - Controls referrer information leakage

6. **Permissions-Policy**
   - Disables unnecessary browser features (camera, microphone, etc.)

7. **Strict-Transport-Security** (Production only)
   - Forces HTTPS connections
   - Includes subdomains
   - Preload enabled

### 4. CORS Configuration

**Location**: `lib/security-headers.ts`

**Purpose**: Control cross-origin requests to prevent unauthorized access.

**Configuration**:
- **Production**: Whitelist-based origins
  - `https://watchcatalyst.xyz`
  - `https://www.watchcatalyst.xyz`
  - Custom domains from environment variables
- **Development**: Allow localhost for testing
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization, X-Requested-With

### 5. API Key Security

**Changes**:
- **Before**: `NEXT_PUBLIC_FINNHUB_API_KEY` exposed to browser
- **After**: `FINNHUB_API_KEY` server-side only

**Implementation**:
- Finnhub API calls now routed through `/api/chart` server-side endpoint
- API key never exposed to client
- Prevents key theft and abuse

**Files Updated**:
- `lib/api-config.ts` - Changed to server-side only
- `app/api/chart/route.ts` - Uses server-side key
- `lib/chart-service.ts` - Now calls API route instead of direct API
- `ENV_SETUP.md` - Updated documentation

### 6. Authentication Security

**Existing Implementation** (Supabase):
- JWT-based authentication
- Secure session management via HTTP-only cookies
- OAuth 2.0 with Google (secure token exchange)
- Row Level Security (RLS) policies on database tables

**No Changes Needed**: Supabase handles authentication securely by default.

### 7. Database Security

**Existing Implementation**:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- SQL injection protected by parameterized queries (Supabase client)
- Service role key kept server-side only

**Tables with RLS**:
- `price_alerts` - Users can only view/modify their own alerts
- `news_cache` - Public read, service role write only
- `user_preferences` - Users can only access their own preferences

## Best Practices Followed

### 1. Secure API Key Storage
✅ All API keys in environment variables
✅ No keys hardcoded in source code
✅ Public keys (NEXT_PUBLIC_*) eliminated where possible
✅ Service role keys never exposed to client

### 2. Input Validation
✅ All user input validated and sanitized
✅ Type checking on all parameters
✅ Length limits enforced
✅ Whitelist validation for enums/categories

### 3. Error Handling
✅ Generic error messages to clients (no sensitive info leaked)
✅ Detailed errors logged server-side only
✅ No stack traces exposed in production

### 4. HTTPS/TLS
✅ HSTS header enforced in production
✅ Vercel provides automatic SSL certificates
✅ All API calls use HTTPS

### 5. Rate Limiting
✅ Per-IP rate limiting on all API routes
✅ Different limits for different sensitivity levels
✅ Rate limit headers exposed to clients

## Testing Security

### Rate Limiting Test

```bash
# Test rate limiting on chart endpoint
for i in {1..65}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    "https://watchcatalyst.xyz/api/chart?symbol=AAPL"
done
# Should see 200s, then 429 (Too Many Requests)
```

### Input Validation Test

```bash
# Test invalid ticker (should return 400)
curl "https://watchcatalyst.xyz/api/chart?symbol=INVALID_TICKER_TOOLONG"

# Test XSS attempt (should be sanitized)
curl "https://watchcatalyst.xyz/api/news/search?q=<script>alert('xss')</script>"
```

### Security Headers Test

```bash
# Check security headers are present
curl -I "https://watchcatalyst.xyz"
# Should see: X-Frame-Options, X-Content-Type-Options, CSP, etc.
```

## Production Recommendations

### 1. Upgrade Rate Limiting (High Priority)
- **Current**: In-memory (lost on restart, not shared across instances)
- **Recommended**: Redis or Upstash Redis
  ```bash
  npm install @upstash/redis
  ```
- Use Vercel KV or Upstash Redis for distributed rate limiting

### 2. Add Request Logging (Medium Priority)
- Log all API requests with IP, timestamp, route
- Monitor for suspicious patterns
- Consider using Vercel Analytics or LogDrain

### 3. Add IP Allowlisting (Optional)
- For admin routes, consider IP allowlisting
- Use Vercel's Edge Config or middleware

### 4. Enable WAF (Web Application Firewall)
- Consider Cloudflare in front of Vercel
- Provides additional DDoS protection and bot filtering

### 5. Regular Security Audits
- Run `npm audit` regularly
- Update dependencies monthly
- Monitor Supabase security updates

## Environment Variables Security Checklist

- [x] All API keys in `.env.local` (not committed)
- [x] No `NEXT_PUBLIC_*` keys for sensitive APIs
- [x] Service role keys server-side only
- [x] `.env.local` in `.gitignore`
- [x] Vercel environment variables configured
- [x] Production secrets different from development

## Incident Response

If a security issue is discovered:

1. **Immediate Actions**:
   - Rotate all API keys
   - Review access logs for suspicious activity
   - Disable affected features if necessary

2. **Investigation**:
   - Identify scope of breach
   - Check if user data was accessed
   - Review all related code

3. **Remediation**:
   - Patch vulnerability
   - Deploy fix immediately
   - Notify affected users if necessary

4. **Prevention**:
   - Add tests to prevent regression
   - Update security documentation
   - Review similar code for same issue

## Security Contact

For security issues, please contact: [Your security contact email]

## Compliance Notes

- **Data Privacy**: User data stored in Supabase (SOC 2 Type 2 compliant)
- **API Keys**: Never log or expose API keys
- **User Data**: Minimal data collection, no PII without consent
- **Session Management**: Secure HTTP-only cookies, JWT tokens

## Last Updated

2026-01-08
