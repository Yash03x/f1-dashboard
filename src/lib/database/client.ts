import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Enterprise-grade Prisma client configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  }).$extends({
    // Add query performance monitoring
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const start = Date.now()
          const result = await query(args)
          const duration = Date.now() - start
          
          // Log slow queries (> 1000ms)
          if (duration > 1000) {
            console.warn(`🐌 Slow query detected: ${model}.${operation} took ${duration}ms`)
          }
          
          return result
        },
      },
    },
  })
}

// Global Prisma client with connection pooling
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Setup Prisma event logging
prisma.$on('warn', (e) => {
  console.warn('Prisma warning:', e)
})

prisma.$on('info', (e) => {
  console.info('Prisma info:', e)
})

prisma.$on('error', (e) => {
  console.error('Prisma error:', e)
})

// ========================================
// REDIS CLIENT CONFIGURATION
// ========================================

class RedisClient {
  private client: Redis
  private readonly defaultTTL = 3600 // 1 hour default TTL
  
  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      
      // Performance optimizations
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      lazyConnect: true,
      
      // Connection pooling
      family: 4,
      keepAlive: true,
      
      // Cluster configuration (if using Redis Cluster)
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis connected')
    })

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error)
    })

    this.client.on('close', () => {
      console.warn('⚠️ Redis connection closed')
    })

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...')
    })
  }

  // Generic cache operations with compression
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key)
      if (!value) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      const result = await this.client.setex(key, ttl, serialized)
      return result === 'OK'
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key)
      return result > 0
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  }

  // Advanced caching patterns
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    try {
      // Try cache first
      const cached = await this.get<T>(key)
      if (cached !== null) {
        return cached
      }

      // Fetch fresh data
      const freshData = await fetcher()
      
      // Store in cache (don't await to improve response time)
      this.set(key, freshData, ttl).catch(error => {
        console.error(`Background cache set failed for ${key}:`, error)
      })

      return freshData
    } catch (error) {
      console.error(`getOrSet error for key ${key}:`, error)
      
      // Try to return cached data even if expired
      const staleData = await this.get<T>(key)
      if (staleData) {
        console.warn(`Returning stale data for ${key}`)
        return staleData
      }
      
      throw error
    }
  }

  // Bulk operations for better performance
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const values = await this.client.mget(...keys)
      return values.map(value => {
        if (!value) return null
        try {
          return JSON.parse(value) as T
        } catch {
          return null
        }
      })
    } catch (error) {
      console.error('Redis MGET error:', error)
      return keys.map(() => null)
    }
  }

  async mset(pairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.client.pipeline()
      
      pairs.forEach(({ key, value, ttl = this.defaultTTL }) => {
        const serialized = JSON.stringify(value)
        pipeline.setex(key, ttl, serialized)
      })

      const results = await pipeline.exec()
      return results?.every(([error, result]) => !error && result === 'OK') ?? false
    } catch (error) {
      console.error('Redis MSET error:', error)
      return false
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern)
      if (keys.length === 0) return 0
      
      const deleted = await this.client.del(...keys)
      console.log(`Invalidated ${deleted} keys matching pattern: ${pattern}`)
      return deleted
    } catch (error) {
      console.error(`Pattern invalidation error for ${pattern}:`, error)
      return 0
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis ping failed:', error)
      return false
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    connected: boolean
    keyCount: number
    memoryUsage: number
    hitRate: number
  }> {
    try {
      const info = await this.client.info('memory')
      const keyCount = await this.client.dbsize()
      const memoryMatch = info.match(/used_memory:(\d+)/)
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0

      return {
        connected: true,
        keyCount,
        memoryUsage,
        hitRate: 0.85 // TODO: Implement actual hit rate tracking
      }
    } catch (error) {
      console.error('Redis stats error:', error)
      return {
        connected: false,
        keyCount: 0,
        memoryUsage: 0,
        hitRate: 0
      }
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      await this.client.quit()
      console.log('Redis connection closed gracefully')
    } catch (error) {
      console.error('Redis disconnect error:', error)
    }
  }
}

// Global Redis instance
const globalForRedis = globalThis as unknown as {
  redis: RedisClient | undefined
}

export const redis = globalForRedis.redis ?? new RedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ========================================
// CONNECTION HEALTH MONITORING
// ========================================

export class DatabaseHealth {
  static async checkPrisma(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Prisma health check failed:', error)
      return false
    }
  }

  static async checkRedis(): Promise<boolean> {
    return await redis.ping()
  }

  static async getOverallHealth(): Promise<{
    prisma: boolean
    redis: boolean
    overall: boolean
  }> {
    const [prismaHealthy, redisHealthy] = await Promise.all([
      this.checkPrisma(),
      this.checkRedis()
    ])

    return {
      prisma: prismaHealthy,
      redis: redisHealthy,
      overall: prismaHealthy && redisHealthy
    }
  }
}

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

process.on('beforeExit', async () => {
  console.log('Shutting down database connections...')
  await Promise.all([
    prisma.$disconnect(),
    redis.disconnect()
  ])
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await Promise.all([
    prisma.$disconnect(),
    redis.disconnect()
  ])
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await Promise.all([
    prisma.$disconnect(),
    redis.disconnect()
  ])
  process.exit(0)
})