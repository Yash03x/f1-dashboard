import winston from 'winston'

// Log levels configuration
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Log colors for development
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaString}`
  })
)

// JSON format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create logger instance
const createLogger = (module: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    levels: logLevels,
    format: isDevelopment ? developmentFormat : productionFormat,
    defaultMeta: { 
      module,
      service: 'f1-dashboard',
      version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
      // Console transport
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
      
      // File transport for errors in production
      ...(process.env.NODE_ENV === 'production' ? [
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ] : [])
    ],
    // Don't exit on error in production
    exitOnError: process.env.NODE_ENV === 'development',
  })

  // Add request ID tracking for API requests
  const originalLog = logger.log.bind(logger)
  logger.log = (level: string, message: string, meta?: any) => {
    const requestId = (global as any).requestId
    if (requestId) {
      meta = { ...meta, requestId }
    }
    return originalLog(level, message, meta)
  }

  return logger
}

// Performance monitoring logger
export const createPerformanceLogger = (module: string) => {
  const logger = createLogger(`${module}:performance`)
  
  return {
    logQuery: (query: string, duration: number, rows?: number) => {
      if (duration > 1000) {
        logger.warn('Slow query detected', { query, duration, rows })
      } else {
        logger.debug('Query executed', { query, duration, rows })
      }
    },
    
    logApiCall: (endpoint: string, method: string, duration: number, statusCode: number) => {
      if (duration > 500) {
        logger.warn('Slow API call detected', { endpoint, method, duration, statusCode })
      } else {
        logger.debug('API call completed', { endpoint, method, duration, statusCode })
      }
    },
    
    logCacheHit: (key: string, duration: number) => {
      logger.debug('Cache hit', { key, duration })
    },
    
    logCacheMiss: (key: string, duration: number) => {
      logger.debug('Cache miss', { key, duration })
    }
  }
}

// Request logger for API routes
export const createRequestLogger = () => {
  const logger = createLogger('request')
  
  return {
    logRequest: (req: any, res: any, duration: number) => {
      const { method, url, ip, userAgent } = req
      const { statusCode } = res
      
      logger.info('HTTP Request', {
        method,
        url,
        ip,
        userAgent,
        statusCode,
        duration,
        requestId: (global as any).requestId
      })
    },
    
    logError: (error: Error, req?: any) => {
      logger.error('Request Error', {
        error: error.message,
        stack: error.stack,
        url: req?.url,
        method: req?.method,
        requestId: (global as any).requestId
      })
    }
  }
}

// Health check logger
export const createHealthLogger = () => {
  const logger = createLogger('health')
  
  return {
    logHealthCheck: (service: string, status: 'healthy' | 'degraded' | 'critical', details?: any) => {
      if (status === 'critical') {
        logger.error('Health check failed', { service, status, details })
      } else if (status === 'degraded') {
        logger.warn('Health check degraded', { service, status, details })
      } else {
        logger.info('Health check passed', { service, status, details })
      }
    }
  }
}

export { createLogger }
export default createLogger
