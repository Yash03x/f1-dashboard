import { NextRequest, NextResponse } from 'next/server'
import { testConnection as testDbConnection } from '@/lib/database/connection'
import { testRedisConnection, getRedisInfo } from '@/lib/redis/connection'
import { performanceMonitor } from '@/lib/performance/monitor'
import { createLogger } from '@/lib/logger'
import { timeOperation } from '@/lib/performance/monitor'

const logger = createLogger('health')

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Comprehensive health check for database, Redis, and performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All systems healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: "Application uptime in seconds"
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "healthy"
 *                         responseTime:
 *                           type: number
 *                           description: "Database response time in milliseconds"
 *                     redis:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "healthy"
 *                         responseTime:
 *                           type: number
 *                           description: "Redis response time in milliseconds"
 *                 performance:
 *                   type: object
 *                   properties:
 *                     totalOperations:
 *                       type: number
 *                     avgResponseTime:
 *                       type: number
 *                     errorRate:
 *                       type: number
 *                     slowOperations:
 *                       type: number
 *       503:
 *         description: One or more services unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "degraded"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   description: "Status of individual services"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                     description: "List of service errors"
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const errors: string[] = []
  const services: Record<string, any> = {}

  try {
    // Check database health
    const dbHealth = await timeOperation('health_check_database', async () => {
      const isConnected = await testDbConnection()
      if (!isConnected) {
        throw new Error('Database connection failed')
      }
      return { status: 'healthy', responseTime: 0 }
    })

    services.database = dbHealth

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error'
    errors.push(`Database: ${errorMessage}`)
    services.database = {
      status: 'unhealthy',
      error: errorMessage,
      responseTime: 0
    }
  }

  // Check Redis health
  try {
    const redisHealth = await timeOperation('health_check_redis', async () => {
      const isConnected = await testRedisConnection()
      if (!isConnected) {
        throw new Error('Redis connection failed')
      }
      
      const info = await getRedisInfo()
      return { 
        status: 'healthy', 
        responseTime: 0,
        info: {
          version: info.redis_version,
          memory: info.used_memory_human,
          connected_clients: info.connected_clients
        }
      }
    })

    services.redis = redisHealth

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error'
    errors.push(`Redis: ${errorMessage}`)
    services.redis = {
      status: 'unhealthy',
      error: errorMessage,
      responseTime: 0
    }
  }

  // Get performance metrics
  let performance: any = {}
  try {
    const report = await performanceMonitor.getPerformanceReport()
    performance = {
      totalOperations: report.summary.totalOperations,
      avgResponseTime: Math.round(report.summary.avgResponseTime),
      errorRate: Math.round(report.summary.errorRate * 100) / 100,
      slowOperations: report.summary.slowOperations,
      topSlowOperations: report.topSlowOperations.slice(0, 5),
      topErrorOperations: report.topErrorOperations.slice(0, 5)
    }
  } catch (error) {
    logger.error('Failed to get performance metrics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    performance = { error: 'Failed to retrieve performance metrics' }
  }

  // Determine overall status
  const overallStatus = errors.length === 0 ? 'healthy' : 'degraded'
  const statusCode = errors.length === 0 ? 200 : 503

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    services,
    performance,
    ...(errors.length > 0 && { errors })
  }

  const duration = Date.now() - startTime

  logger.info('Health check completed', {
    status: overallStatus,
    duration,
    errors: errors.length
  })

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'X-Response-Time': `${duration}ms`,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}

/**
 * @swagger
 * /api/health:
 *   post:
 *     summary: Trigger health check (Not implemented)
 *     description: This endpoint is not implemented in the current version.
 *     tags: [Health]
 *     responses:
 *       405:
 *         description: Method not allowed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Method not allowed"
 *                 message:
 *                   type: string
 *                   example: "POST method is not supported for this endpoint"
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'POST method is not supported for this endpoint'
    },
    { status: 405 }
  )
}
