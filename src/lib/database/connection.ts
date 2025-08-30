import { Pool, PoolClient, PoolConfig } from 'pg'
import { createLogger } from '@/lib/logger'

const logger = createLogger('database')

// Database configuration with environment validation
const getDatabaseConfig = (): PoolConfig => {
  const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingVars.join(', ')}`)
  }

  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    
    // Statement timeout to prevent long-running queries
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    
    // Query timeout
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000')
  }
}

// Create connection pool with monitoring
class DatabasePool {
  private pool: Pool
  private isShuttingDown = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    const config = getDatabaseConfig()
    this.pool = new Pool(config)
    this.setupEventHandlers()
    this.startHealthMonitoring()
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      logger.info('New database connection established', { 
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      })
    })

    this.pool.on('acquire', (client) => {
      logger.debug('Client acquired from pool', { 
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      })
    })

    this.pool.on('release', (client) => {
      logger.debug('Client released to pool', { 
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      })
    })

    this.pool.on('error', (err, client) => {
      logger.error('Unexpected error on idle client', { 
        error: err.message,
        stack: err.stack,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      })
      
      // Don't exit process in production, let the pool handle reconnection
      if (process.env.NODE_ENV === 'development') {
        process.exit(-1)
      }
    })

    // Graceful shutdown handling
    process.on('SIGINT', () => this.gracefulShutdown())
    process.on('SIGTERM', () => this.gracefulShutdown())
  }

  private startHealthMonitoring(): void {
    // Monitor pool health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      const stats = this.getPoolStats()
      
      // Log warnings for high connection usage
      if (stats.utilization > 0.8) {
        logger.warn('High database connection pool utilization', stats)
      }
      
      // Log errors for pool exhaustion
      if (stats.waitingCount > 0) {
        logger.error('Database connection pool exhausted', stats)
      }
    }, 30000)
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return
    
    this.isShuttingDown = true
    logger.info('Starting graceful database shutdown...')
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Close the pool
    try {
      await this.pool.end()
      logger.info('Database pool closed successfully')
    } catch (error) {
      logger.error('Error closing database pool', { error: error.message })
    }
  }

  // Get pool statistics for monitoring
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      utilization: this.pool.totalCount > 0 ? 
        (this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount : 0
    }
  }

  // Test database connection with timeout
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      const result = await client.query('SELECT NOW() as current_time, version() as version')
      client.release()
      
      logger.info('Database connection test successful', {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version
      })
      
      return true
    } catch (error) {
      logger.error('Database connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  // Get a client from the pool with timeout
  async getClient(): Promise<PoolClient> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down')
    }
    
    return await this.pool.connect()
  }

  // Execute a query with performance monitoring
  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now()
    const queryId = Math.random().toString(36).substring(7)
    
    try {
      logger.debug('Executing database query', { 
        queryId,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0
      })
      
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow database query detected', {
          queryId,
          duration,
          rows: result.rowCount,
          text: text.substring(0, 200) + (text.length > 200 ? '...' : '')
        })
      } else {
        logger.debug('Database query completed', {
          queryId,
          duration,
          rows: result.rowCount
        })
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      logger.error('Database query failed', {
        queryId,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        params: params ? params.length : 0
      })
      throw error
    }
  }

  // Execute a transaction with proper error handling
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      
      logger.debug('Database transaction completed successfully')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Database transaction failed, rolled back', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      client.release()
    }
  }

  // Close the pool (call this when shutting down the app)
  async close(): Promise<void> {
    await this.gracefulShutdown()
  }
}

// Create singleton instance
const databasePool = new DatabasePool()

// Export functions that use the singleton
export const testConnection = () => databasePool.testConnection()
export const getClient = () => databasePool.getClient()
export const query = (text: string, params?: any[]) => databasePool.query(text, params)
export const transaction = <T>(callback: (client: PoolClient) => Promise<T>) => 
  databasePool.transaction(callback)
export const getPoolStats = () => databasePool.getPoolStats()
export const closePool = () => databasePool.close()

// Export the pool instance for advanced usage
export default databasePool
