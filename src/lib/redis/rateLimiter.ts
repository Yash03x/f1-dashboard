import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from './connection'
import { createLogger } from '@/lib/logger'

const logger = createLogger('redis-rate-limit')

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  statusCode?: number
  keyPrefix?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export class RedisRateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      keyPrefix: 'rate_limit',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    }
  }

  middleware() {
    return async (request: NextRequest) => {
      try {
        const clientId = this.getClientId(request)
        const key = `${this.config.keyPrefix}:${clientId}`
        const now = Date.now()
        const windowStart = now - this.config.windowMs

        const redis = await getRedisClient()

        // Use Redis pipeline for atomic operations
        const pipeline = redis.pipeline()
        
        // Remove expired entries
        pipeline.zremrangebyscore(key, 0, windowStart)
        
        // Count current requests in window
        pipeline.zcard(key)
        
        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`)
        
        // Set expiry on the key
        pipeline.expire(key, Math.ceil(this.config.windowMs / 1000))
        
        const results = await pipeline.exec()
        
        if (!results) {
          logger.error('Redis pipeline failed')
          return NextResponse.next()
        }

        const currentCount = results[1] as number

        // Check if limit exceeded
        if (currentCount >= this.config.maxRequests) {
          logger.warn('Rate limit exceeded', {
            clientId,
            count: currentCount,
            maxRequests: this.config.maxRequests,
            key
          })

          // Get the oldest request time to calculate retry after
          const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES')
          const retryAfter = oldestRequest.length > 0 ? 
            Math.ceil((parseInt(oldestRequest[1]) + this.config.windowMs - now) / 1000) : 
            Math.ceil(this.config.windowMs / 1000)

          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: this.config.message,
              retryAfter,
              limit: this.config.maxRequests,
              remaining: 0
            },
            {
              status: this.config.statusCode,
              headers: {
                'X-RateLimit-Limit': this.config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(now + this.config.windowMs).toISOString(),
                'Retry-After': retryAfter.toString()
              }
            }
          )
        }

        // Add rate limit headers
        const response = NextResponse.next()
        response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString())
        response.headers.set('X-RateLimit-Remaining', (this.config.maxRequests - currentCount - 1).toString())
        response.headers.set('X-RateLimit-Reset', new Date(now + this.config.windowMs).toISOString())

        return response

      } catch (error) {
        logger.error('Redis rate limiting failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          clientId: this.getClientId(request)
        })

        // Fallback to allow request if Redis is unavailable
        return NextResponse.next()
      }
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

  /**
   * Get current rate limit stats for a client
   */
  async getClientStats(clientId: string): Promise<{
    count: number
    limit: number
    remaining: number
    resetTime: Date
    windowMs: number
  }> {
    try {
      const key = `${this.config.keyPrefix}:${clientId}`
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      const redis = await getRedisClient()
      
      // Remove expired entries and get count
      await redis.zremrangebyscore(key, 0, windowStart)
      const count = await redis.zcard(key)
      
      // Get the oldest request to calculate reset time
      const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const resetTime = oldestRequest.length > 0 ? 
        new Date(parseInt(oldestRequest[1]) + this.config.windowMs) :
        new Date(now + this.config.windowMs)

      return {
        count,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - count),
        resetTime,
        windowMs: this.config.windowMs
      }
    } catch (error) {
      logger.error('Failed to get client rate limit stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId
      })
      throw error
    }
  }

  /**
   * Reset rate limit for a client
   */
  async resetClient(clientId: string): Promise<void> {
    try {
      const key = `${this.config.keyPrefix}:${clientId}`
      const redis = await getRedisClient()
      await redis.del(key)
      
      logger.info('Rate limit reset for client', { clientId })
    } catch (error) {
      logger.error('Failed to reset client rate limit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        clientId
      })
      throw error
    }
  }

  /**
   * Get all rate limit keys (for monitoring)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const redis = await getRedisClient()
      const pattern = `${this.config.keyPrefix}:*`
      return await redis.keys(pattern)
    } catch (error) {
      logger.error('Failed to get rate limit keys', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalClients: number
    activeClients: number
    keys: string[]
  }> {
    try {
      const keys = await this.getAllKeys()
      const redis = await getRedisClient()
      const now = Date.now()
      const windowStart = now - this.config.windowMs

      let activeClients = 0
      
      // Check each key for active requests
      for (const key of keys) {
        const count = await redis.zcount(key, windowStart, '+inf')
        if (count > 0) {
          activeClients++
        }
      }

      return {
        totalClients: keys.length,
        activeClients,
        keys
      }
    } catch (error) {
      logger.error('Failed to get rate limit stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'API rate limit exceeded. Please try again later.',
  keyPrefix: 'api_rate_limit'
})

export const authRateLimiter = new RedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 authentication attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
  keyPrefix: 'auth_rate_limit'
})

export const syncRateLimiter = new RedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 sync operations per hour
  message: 'Too many sync operations. Please try again later.',
  keyPrefix: 'sync_rate_limit'
})

// Export middleware functions
export const rateLimitMiddleware = apiRateLimiter.middleware()
export const authRateLimitMiddleware = authRateLimiter.middleware()
export const syncRateLimitMiddleware = syncRateLimiter.middleware()
