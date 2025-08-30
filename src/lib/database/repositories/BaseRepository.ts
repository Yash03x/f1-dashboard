import { prisma, redis } from '../client'
import { Prisma } from '@prisma/client'

export interface CacheOptions {
  ttl?: number
  tags?: string[]
  bypassCache?: boolean
}

export interface QueryOptions extends CacheOptions {
  limit?: number
  offset?: number
  orderBy?: any
  where?: any
}

export abstract class BaseRepository {
  protected readonly modelName: string
  protected readonly defaultCacheTTL = 3600 // 1 hour

  constructor(modelName: string) {
    this.modelName = modelName
  }

  // Generate cache key with consistent pattern
  protected generateCacheKey(operation: string, params: any = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|')
    
    return `${this.modelName}:${operation}:${Buffer.from(paramString).toString('base64')}`
  }

  // Execute query with intelligent caching
  protected async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultCacheTTL, bypassCache = false } = options

    // Skip cache if requested
    if (bypassCache) {
      const result = await queryFn()
      // Update cache in background
      redis.set(cacheKey, result, ttl).catch(error => {
        console.error(`Background cache update failed for ${cacheKey}:`, error)
      })
      return result
    }

    // Try cache first
    try {
      const cached = await redis.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }
    } catch (error) {
      console.warn(`Cache read failed for ${cacheKey}:`, error)
    }

    // Execute query and cache result
    const result = await queryFn()
    
    // Cache in background to not block response
    redis.set(cacheKey, result, ttl).catch(error => {
      console.error(`Cache write failed for ${cacheKey}:`, error)
    })

    return result
  }

  // Bulk cache operations
  protected async executeBulkWithCache<T>(
    operations: Array<{
      cacheKey: string
      queryFn: () => Promise<T>
      options?: CacheOptions
    }>
  ): Promise<T[]> {
    // First, try to get all from cache
    const cacheKeys = operations.map(op => op.cacheKey)
    const cachedResults = await redis.mget<T>(cacheKeys)

    // Identify which operations need to be executed
    const toExecute = operations
      .map((op, index) => ({ ...op, index, cached: cachedResults[index] }))
      .filter(op => op.cached === null)

    // Execute uncached operations in parallel
    const freshResults = await Promise.all(
      toExecute.map(async (op) => {
        try {
          return await op.queryFn()
        } catch (error) {
          console.error(`Bulk operation failed for ${op.cacheKey}:`, error)
          return null
        }
      })
    )

    // Cache fresh results in background
    const cacheUpdates = toExecute
      .map((op, execIndex) => ({
        key: op.cacheKey,
        value: freshResults[execIndex],
        ttl: op.options?.ttl || this.defaultCacheTTL
      }))
      .filter(update => update.value !== null)

    if (cacheUpdates.length > 0) {
      redis.mset(cacheUpdates).catch(error => {
        console.error('Bulk cache update failed:', error)
      })
    }

    // Combine cached and fresh results
    const finalResults: T[] = new Array(operations.length)
    
    // Fill in cached results
    cachedResults.forEach((cached, index) => {
      if (cached !== null) {
        finalResults[index] = cached
      }
    })

    // Fill in fresh results
    toExecute.forEach((op, execIndex) => {
      if (freshResults[execIndex] !== null) {
        finalResults[op.index] = freshResults[execIndex]
      }
    })

    return finalResults.filter(result => result !== null)
  }

  // Cache invalidation patterns
  protected async invalidateCache(patterns: string[]): Promise<void> {
    const invalidationPromises = patterns.map(pattern => 
      redis.invalidatePattern(`${this.modelName}:*${pattern}*`)
    )
    
    await Promise.all(invalidationPromises)
  }

  // Common query patterns with optimized performance
  protected async findManyOptimized<T>(
    findManyFn: (args: any) => Promise<T[]>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const { limit = 100, offset = 0, orderBy, where, ...cacheOptions } = options
    
    const cacheKey = this.generateCacheKey('findMany', {
      limit,
      offset,
      orderBy,
      where
    })

    return this.executeWithCache(
      cacheKey,
      () => findManyFn({
        take: Math.min(limit, 1000), // Prevent excessive queries
        skip: offset,
        orderBy,
        where
      }),
      cacheOptions
    )
  }

  protected async findUniqueOptimized<T>(
    findUniqueFn: (args: any) => Promise<T | null>,
    where: any,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const cacheKey = this.generateCacheKey('findUnique', { where })

    return this.executeWithCache(
      cacheKey,
      () => findUniqueFn({ where }),
      options
    )
  }

  protected async countOptimized(
    countFn: (args: any) => Promise<number>,
    where: any = {},
    options: CacheOptions = {}
  ): Promise<number> {
    const cacheKey = this.generateCacheKey('count', { where })

    return this.executeWithCache(
      cacheKey,
      () => countFn({ where }),
      { ttl: 600, ...options } // Shorter TTL for counts
    )
  }

  // Transaction wrapper with cache invalidation
  protected async executeTransaction<T>(
    transactionFn: (tx: Prisma.TransactionClient) => Promise<T>,
    invalidationPatterns: string[] = []
  ): Promise<T> {
    const result = await prisma.$transaction(transactionFn)
    
    // Invalidate relevant cache entries
    if (invalidationPatterns.length > 0) {
      await this.invalidateCache(invalidationPatterns)
    }

    return result
  }

  // Health check for repository
  async healthCheck(): Promise<{
    database: boolean
    cache: boolean
    overall: boolean
  }> {
    try {
      const [dbHealth, cacheHealth] = await Promise.all([
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        redis.ping()
      ])

      return {
        database: dbHealth,
        cache: cacheHealth,
        overall: dbHealth && cacheHealth
      }
    } catch (error) {
      console.error(`Health check failed for ${this.modelName}:`, error)
      return {
        database: false,
        cache: false,
        overall: false
      }
    }
  }

  // Performance metrics
  async getPerformanceMetrics(): Promise<{
    modelName: string
    cacheHitRate: number
    avgQueryTime: number
    totalQueries: number
  }> {
    // TODO: Implement actual metrics collection
    return {
      modelName: this.modelName,
      cacheHitRate: 0.85,
      avgQueryTime: 45,
      totalQueries: 1000
    }
  }
}