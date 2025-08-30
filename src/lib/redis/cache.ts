import { getRedisClient } from './connection'
import { createLogger } from '@/lib/logger'
import { createPerformanceLogger } from '@/lib/logger'

const logger = createLogger('cache')
const perfLogger = createPerformanceLogger('cache')

interface CacheConfig {
  ttl: number // Time to live in seconds
  prefix: string
  maxSize?: number // Maximum number of keys
  compression?: boolean
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  version?: string
}

export class RedisCache {
  private config: CacheConfig
  private compressionEnabled: boolean

  constructor(config: CacheConfig) {
    this.config = {
      ttl: 3600, // 1 hour default
      prefix: 'cache',
      compression: false,
      ...config
    }
    this.compressionEnabled = this.config.compression || false
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const start = Date.now()
    const cacheKey = this.buildKey(key)

    try {
      const redis = await getRedisClient()
      const cached = await redis.get(cacheKey)

      if (!cached) {
        perfLogger.logCacheMiss(key, Date.now() - start)
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if entry is expired
      if (Date.now() > entry.timestamp + entry.ttl * 1000) {
        await this.delete(key)
        perfLogger.logCacheMiss(key, Date.now() - start)
        return null
      }

      perfLogger.logCacheHit(key, Date.now() - start)
      return entry.data

    } catch (error) {
      logger.error('Cache get failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheKey = this.buildKey(key)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      version: '1.0'
    }

    try {
      const redis = await getRedisClient()
      const serialized = JSON.stringify(entry)
      
      await redis.setex(cacheKey, ttl || this.config.ttl, serialized)
      
      logger.debug('Cache set successful', { key, ttl: ttl || this.config.ttl })

    } catch (error) {
      logger.error('Cache set failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.buildKey(key)

    try {
      const redis = await getRedisClient()
      await redis.del(cacheKey)
      
      logger.debug('Cache delete successful', { key })

    } catch (error) {
      logger.error('Cache delete failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const cacheKey = this.buildKey(key)

    try {
      const redis = await getRedisClient()
      const exists = await redis.exists(cacheKey)
      return exists === 1

    } catch (error) {
      logger.error('Cache exists check failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    // Execute fallback function
    const data = await fallback()
    
    // Cache the result
    await this.set(key, data, ttl)
    
    return data
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern)

    try {
      const redis = await getRedisClient()
      const keys = await redis.keys(fullPattern)
      
      if (keys.length > 0) {
        await redis.del(...keys)
        logger.info('Cache invalidation successful', { pattern, count: keys.length })
      }

      return keys.length

    } catch (error) {
      logger.error('Cache invalidation failed', {
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return 0
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<number> {
    return await this.invalidatePattern('*')
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number
    memoryUsage: number
    hitRate: number
    keys: string[]
  }> {
    try {
      const redis = await getRedisClient()
      const pattern = this.buildKey('*')
      const keys = await redis.keys(pattern)
      
      // Get memory usage
      const info = await redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:(\S+)/)
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0B'

      // Calculate hit rate (this would need to be tracked separately in production)
      const hitRate = 0.85 // Placeholder

      return {
        totalKeys: keys.length,
        memoryUsage: memoryUsage as any,
        hitRate,
        keys: keys.map(key => key.replace(this.config.prefix + ':', ''))
      }

    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmCache<T>(
    keys: string[],
    dataProvider: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    logger.info('Starting cache warming', { keyCount: keys.length })

    const promises = keys.map(async (key) => {
      try {
        const data = await dataProvider(key)
        await this.set(key, data, ttl)
        logger.debug('Cache warmed', { key })
      } catch (error) {
        logger.error('Cache warming failed for key', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    await Promise.allSettled(promises)
    logger.info('Cache warming completed')
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.config.prefix}:${key}`
  }
}

// Pre-configured cache instances
export const apiCache = new RedisCache({
  ttl: 3600, // 1 hour
  prefix: 'api_cache',
  maxSize: 10000
})

export const dataCache = new RedisCache({
  ttl: 1800, // 30 minutes
  prefix: 'data_cache',
  maxSize: 5000
})

export const sessionCache = new RedisCache({
  ttl: 86400, // 24 hours
  prefix: 'session_cache',
  maxSize: 1000
})

// Cache decorator for functions
export function cached<T>(
  cache: RedisCache,
  keyGenerator: (...args: any[]) => string,
  ttl?: number
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args)
      return await cache.getOrSet(key, () => method.apply(this, args), ttl)
    }
  }
}

// Cache middleware for API routes
export function createCacheMiddleware(
  cache: RedisCache,
  keyGenerator: (request: Request) => string,
  ttl?: number
) {
  return async (request: Request, next: () => Promise<Response>) => {
    const key = keyGenerator(request)
    const cached = await cache.get(key)

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      })
    }

    const response = await next()
    
    if (response.ok) {
      const data = await response.json()
      await cache.set(key, data, ttl)
    }

    return response
  }
}
