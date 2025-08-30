import { createLogger } from '@/lib/logger'
import { getRedisClient } from '@/lib/redis/connection'

const logger = createLogger('performance')

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
  success: boolean
  error?: string
}

interface PerformanceStats {
  count: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  p99Duration: number
  errorRate: number
  lastUpdated: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private stats: Map<string, PerformanceStats> = new Map()
  private flushInterval: NodeJS.Timeout
  private readonly maxMetrics = 1000
  private readonly flushIntervalMs = 60000 // 1 minute

  private constructor() {
    this.startPeriodicFlush()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Update stats
    this.updateStats(metric)
  }

  /**
   * Time an async operation
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = Date.now()
    let success = true
    let error: string | undefined

    try {
      const result = await fn()
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - start
      this.recordMetric({
        operation,
        duration,
        timestamp: start,
        metadata,
        success,
        error
      })
    }
  }

  /**
   * Time a sync operation
   */
  timeSyncOperation<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = Date.now()
    let success = true
    let error: string | undefined

    try {
      const result = fn()
      return result
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = Date.now() - start
      this.recordMetric({
        operation,
        duration,
        timestamp: start,
        metadata,
        success,
        error
      })
    }
  }

  /**
   * Get performance stats for an operation
   */
  getStats(operation: string): PerformanceStats | null {
    return this.stats.get(operation) || null
  }

  /**
   * Get all performance stats
   */
  getAllStats(): Map<string, PerformanceStats> {
    return new Map(this.stats)
  }

  /**
   * Get slow operations (above threshold)
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.duration > thresholdMs)
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): PerformanceMetric[] {
    return this.metrics.filter(metric => !metric.success)
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return this.metrics.filter(metric => metric.timestamp > cutoff)
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(hours: number = 24): void {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff)
  }

  /**
   * Update stats for an operation
   */
  private updateStats(metric: PerformanceMetric): void {
    const existing = this.stats.get(metric.operation)
    const durations = this.metrics
      .filter(m => m.operation === metric.operation)
      .map(m => m.duration)
      .sort((a, b) => a - b)

    const count = durations.length
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / count
    const minDuration = durations[0]
    const maxDuration = durations[durations.length - 1]
    const p95Index = Math.floor(count * 0.95)
    const p99Index = Math.floor(count * 0.99)
    const p95Duration = durations[p95Index] || avgDuration
    const p99Duration = durations[p99Index] || avgDuration

    const errorCount = this.metrics
      .filter(m => m.operation === metric.operation && !m.success)
      .length
    const errorRate = errorCount / count

    this.stats.set(metric.operation, {
      count,
      avgDuration,
      minDuration,
      maxDuration,
      p95Duration,
      p99Duration,
      errorRate,
      lastUpdated: Date.now()
    })
  }

  /**
   * Start periodic flush to Redis
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushToRedis()
    }, this.flushIntervalMs)
  }

  /**
   * Flush metrics to Redis for persistence
   */
  private async flushToRedis(): Promise<void> {
    try {
      const redis = await getRedisClient()
      const timestamp = Date.now()
      
      // Store recent metrics
      const recentMetrics = this.getRecentMetrics(10) // Last 10 minutes
      if (recentMetrics.length > 0) {
        await redis.setex(
          `perf:metrics:${timestamp}`,
          3600, // 1 hour TTL
          JSON.stringify(recentMetrics)
        )
      }

      // Store current stats
      const statsObject = Object.fromEntries(this.stats.entries())
      await redis.setex(
        `perf:stats:${timestamp}`,
        3600, // 1 hour TTL
        JSON.stringify(statsObject)
      )

      logger.debug('Performance metrics flushed to Redis', {
        metricsCount: recentMetrics.length,
        statsCount: this.stats.size
      })

    } catch (error) {
      logger.error('Failed to flush performance metrics to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(): Promise<{
    summary: {
      totalOperations: number
      avgResponseTime: number
      errorRate: number
      slowOperations: number
    }
    topSlowOperations: Array<{
      operation: string
      avgDuration: number
      count: number
    }>
    topErrorOperations: Array<{
      operation: string
      errorRate: number
      count: number
    }>
    recentMetrics: PerformanceMetric[]
  }> {
    const allStats = this.getAllStats()
    const recentMetrics = this.getRecentMetrics(5) // Last 5 minutes

    const totalOperations = Array.from(allStats.values())
      .reduce((sum, stat) => sum + stat.count, 0)

    const avgResponseTime = Array.from(allStats.values())
      .reduce((sum, stat) => sum + stat.avgDuration, 0) / allStats.size

    const totalErrors = Array.from(allStats.values())
      .reduce((sum, stat) => sum + (stat.count * stat.errorRate), 0)

    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0

    const slowOperations = Array.from(allStats.values())
      .filter(stat => stat.avgDuration > 1000).length

    const topSlowOperations = Array.from(allStats.entries())
      .map(([operation, stat]) => ({
        operation,
        avgDuration: stat.avgDuration,
        count: stat.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)

    const topErrorOperations = Array.from(allStats.entries())
      .map(([operation, stat]) => ({
        operation,
        errorRate: stat.errorRate,
        count: stat.count
      }))
      .filter(item => item.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10)

    return {
      summary: {
        totalOperations,
        avgResponseTime,
        errorRate,
        slowOperations
      },
      topSlowOperations,
      topErrorOperations,
      recentMetrics
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Convenience functions
export const timeOperation = <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
) => performanceMonitor.timeOperation(operation, fn, metadata)

export const timeSyncOperation = <T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
) => performanceMonitor.timeSyncOperation(operation, fn, metadata)

export const recordMetric = (metric: PerformanceMetric) => 
  performanceMonitor.recordMetric(metric)
