import Redis from 'ioredis'
import { createLogger } from '@/lib/logger'

const logger = createLogger('redis')

// Redis configuration
const getRedisConfig = () => {
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    
    // Connection settings
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    
    // Pool settings
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
    
    // Timeout settings
    connectTimeout: 10000,
    commandTimeout: 5000,
    
    // TLS settings for production
    tls: process.env.NODE_ENV === 'production' && process.env.REDIS_TLS === 'true' ? {} : undefined
  }

  // Validate required configuration
  if (!config.host) {
    throw new Error('REDIS_HOST environment variable is required')
  }

  return config
}

// Redis client class with monitoring
class RedisManager {
  private client: Redis | null = null
  private subscriber: Redis | null = null
  private isShuttingDown = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    this.setupEventHandlers()
    this.startHealthMonitoring()
  }

  private setupEventHandlers(): void {
    // Graceful shutdown handling
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('SIGTERM', () => this.gracefulShutdown())
  }

  private startHealthMonitoring(): void {
    // Monitor Redis health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.client && this.client.status === 'ready') {
          const start = Date.now()
          await this.client.ping()
          const duration = Date.now() - start
          
          if (duration > 100) {
            logger.warn('Slow Redis response', { duration })
          }
        }
      } catch (error) {
        logger.error('Redis health check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }, 30000)
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return
    
    this.isShuttingDown = true
    logger.info('Starting graceful Redis shutdown...')
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Close connections
    try {
      if (this.subscriber) {
        await this.subscriber.quit()
        logger.info('Redis subscriber closed')
      }
      
      if (this.client) {
        await this.client.quit()
        logger.info('Redis client closed')
      }
    } catch (error) {
      logger.error('Error closing Redis connections', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * Get Redis client instance
   */
  async getClient(): Promise<Redis> {
    if (this.isShuttingDown) {
      throw new Error('Redis manager is shutting down')
    }

    if (!this.client || this.client.status !== 'ready') {
      await this.connect()
    }

    return this.client!
  }

  /**
   * Get Redis subscriber instance
   */
  async getSubscriber(): Promise<Redis> {
    if (this.isShuttingDown) {
      throw new Error('Redis manager is shutting down')
    }

    if (!this.subscriber || this.subscriber.status !== 'ready') {
      await this.connectSubscriber()
    }

    return this.subscriber!
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      const config = getRedisConfig()
      
      this.client = new Redis(config)
      
      this.client.on('connect', () => {
        logger.info('Redis client connected')
      })

      this.client.on('ready', () => {
        logger.info('Redis client ready')
      })

      this.client.on('error', (error) => {
        logger.error('Redis client error', { 
          error: error.message,
          stack: error.stack
        })
      })

      this.client.on('close', () => {
        logger.warn('Redis client connection closed')
      })

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting')
      })

      // Wait for connection to be ready
      await this.client.ping()
      
    } catch (error) {
      logger.error('Failed to connect to Redis', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Connect subscriber to Redis
   */
  private async connectSubscriber(): Promise<void> {
    try {
      const config = getRedisConfig()
      
      this.subscriber = new Redis(config)
      
      this.subscriber.on('connect', () => {
        logger.info('Redis subscriber connected')
      })

      this.subscriber.on('ready', () => {
        logger.info('Redis subscriber ready')
      })

      this.subscriber.on('error', (error) => {
        logger.error('Redis subscriber error', { 
          error: error.message,
          stack: error.stack
        })
      })

      this.subscriber.on('close', () => {
        logger.warn('Redis subscriber connection closed')
      })

      this.subscriber.on('reconnecting', () => {
        logger.info('Redis subscriber reconnecting')
      })

      // Wait for connection to be ready
      await this.subscriber.ping()
      
    } catch (error) {
      logger.error('Failed to connect Redis subscriber', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient()
      const result = await client.ping()
      return result === 'PONG'
    } catch (error) {
      logger.error('Redis connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<any> {
    try {
      const client = await this.getClient()
      const info = await client.info()
      
      // Parse Redis info
      const lines = info.split('\r\n')
      const parsed: any = {}
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':')
          parsed[key] = value
        }
      }
      
      return parsed
    } catch (error) {
      logger.error('Failed to get Redis info', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.gracefulShutdown()
  }
}

// Create singleton instance
const redisManager = new RedisManager()

// Export functions that use the singleton
export const getRedisClient = () => redisManager.getClient()
export const getRedisSubscriber = () => redisManager.getSubscriber()
export const testRedisConnection = () => redisManager.testConnection()
export const getRedisInfo = () => redisManager.getInfo()
export const closeRedisConnections = () => redisManager.close()

// Export the manager instance for advanced usage
export default redisManager
