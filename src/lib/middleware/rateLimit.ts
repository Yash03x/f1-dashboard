import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('rate-limit')

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  statusCode?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  middleware() {
    return (request: NextRequest) => {
      const clientId = this.getClientId(request)
      const now = Date.now()
      
      // Clean up expired entries
      this.cleanupExpiredEntries(now)
      
      // Get or create rate limit entry
      const entry = rateLimitStore.get(clientId) || { count: 0, resetTime: now + this.config.windowMs }
      
      // Check if window has reset
      if (now > entry.resetTime) {
        entry.count = 0
        entry.resetTime = now + this.config.windowMs
      }
      
      // Increment request count
      entry.count++
      rateLimitStore.set(clientId, entry)
      
      // Check if limit exceeded
      if (entry.count > this.config.maxRequests) {
        logger.warn('Rate limit exceeded', {
          clientId,
          count: entry.count,
          maxRequests: this.config.maxRequests,
          resetTime: new Date(entry.resetTime).toISOString()
        })
        
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: this.config.message,
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          },
          {
            status: this.config.statusCode,
            headers: {
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
              'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
            }
          }
        )
      }
      
      // Add rate limit headers
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', (this.config.maxRequests - entry.count).toString())
      response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())
      
      return response
    }
  }

  private getClientId(request: NextRequest): string {
    // Try to get real IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
    
    // Include user agent for additional uniqueness
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    return `${ip}:${userAgent}`
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }

  // Get current rate limit stats
  getStats() {
    const now = Date.now()
    this.cleanupExpiredEntries(now)
    
    return {
      totalClients: rateLimitStore.size,
      entries: Array.from(rateLimitStore.entries()).map(([clientId, entry]) => ({
        clientId,
        count: entry.count,
        resetTime: new Date(entry.resetTime).toISOString(),
        isExpired: now > entry.resetTime
      }))
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'API rate limit exceeded. Please try again later.'
})

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 authentication attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.'
})

export const syncRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 sync operations per hour
  message: 'Too many sync operations. Please try again later.'
})

// Export middleware functions
export const rateLimitMiddleware = apiRateLimiter.middleware()
export const authRateLimitMiddleware = authRateLimiter.middleware()
export const syncRateLimitMiddleware = syncRateLimiter.middleware()
