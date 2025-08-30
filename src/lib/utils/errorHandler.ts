import { createLogger } from '@/lib/logger'

const logger = createLogger('error-handler')

// Custom error types
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR'
  public readonly statusCode = 400
  public readonly details: any

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class DatabaseError extends Error {
  public readonly code = 'DATABASE_ERROR'
  public readonly statusCode = 503
  public readonly originalError: Error

  constructor(message: string, originalError: Error) {
    super(message)
    this.name = 'DatabaseError'
    this.originalError = originalError
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND'
  public readonly statusCode = 404
  public readonly resource: string

  constructor(resource: string, id?: string | number) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`
    super(message)
    this.name = 'NotFoundError'
    this.resource = resource
  }
}

export class AuthenticationError extends Error {
  public readonly code = 'AUTHENTICATION_ERROR'
  public readonly statusCode = 401

  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  public readonly code = 'AUTHORIZATION_ERROR'
  public readonly statusCode = 403

  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class RateLimitError extends Error {
  public readonly code = 'RATE_LIMIT_EXCEEDED'
  public readonly statusCode = 429
  public readonly retryAfter: number

  constructor(retryAfter: number) {
    super('Rate limit exceeded')
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

export class ExternalApiError extends Error {
  public readonly code = 'EXTERNAL_API_ERROR'
  public readonly statusCode = 502
  public readonly service: string
  public readonly originalError: Error

  constructor(service: string, message: string, originalError: Error) {
    super(message)
    this.name = 'ExternalApiError'
    this.service = service
    this.originalError = originalError
  }
}

// Error handler class
export class ErrorHandler {
  /**
   * Handle and log errors appropriately
   */
  static handle(error: Error, context?: { 
    operation?: string
    userId?: string
    requestId?: string
    additionalData?: any
  }) {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: (error as any).statusCode,
      context
    }

    // Log based on error type
    if (error instanceof ValidationError) {
      logger.warn('Validation error', errorInfo)
    } else if (error instanceof DatabaseError) {
      logger.error('Database error', errorInfo)
    } else if (error instanceof NotFoundError) {
      logger.info('Resource not found', errorInfo)
    } else if (error instanceof AuthenticationError) {
      logger.warn('Authentication error', errorInfo)
    } else if (error instanceof AuthorizationError) {
      logger.warn('Authorization error', errorInfo)
    } else if (error instanceof RateLimitError) {
      logger.warn('Rate limit exceeded', errorInfo)
    } else if (error instanceof ExternalApiError) {
      logger.error('External API error', errorInfo)
    } else {
      logger.error('Unexpected error', errorInfo)
    }
  }

  /**
   * Convert error to API response format
   */
  static toApiResponse(error: Error, includeDetails: boolean = false) {
    const baseResponse = {
      error: true,
      message: error.message,
      code: (error as any).code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    }

    if (includeDetails && process.env.NODE_ENV === 'development') {
      return {
        ...baseResponse,
        details: {
          name: error.name,
          stack: error.stack,
          ...(error as any).details
        }
      }
    }

    return baseResponse
  }

  /**
   * Get appropriate HTTP status code for error
   */
  static getStatusCode(error: Error): number {
    if (error instanceof ValidationError) return 400
    if (error instanceof AuthenticationError) return 401
    if (error instanceof AuthorizationError) return 403
    if (error instanceof NotFoundError) return 404
    if (error instanceof RateLimitError) return 429
    if (error instanceof DatabaseError) return 503
    if (error instanceof ExternalApiError) return 502
    
    return 500
  }

  /**
   * Check if error should be reported to monitoring service
   */
  static shouldReport(error: Error): boolean {
    // Don't report expected errors
    if (error instanceof ValidationError) return false
    if (error instanceof NotFoundError) return false
    if (error instanceof AuthenticationError) return false
    if (error instanceof AuthorizationError) return false
    if (error instanceof RateLimitError) return false

    // Report unexpected errors
    return true
  }

  /**
   * Create error with context
   */
  static createError(
    ErrorClass: new (...args: any[]) => Error,
    ...args: any[]
  ): Error {
    return new ErrorClass(...args)
  }

  /**
   * Wrap async operations with error handling
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    context?: { operation?: string; userId?: string; requestId?: string }
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      this.handle(error as Error, context)
      throw error
    }
  }

  /**
   * Wrap sync operations with error handling
   */
  static wrapSync<T>(
    operation: () => T,
    context?: { operation?: string; userId?: string; requestId?: string }
  ): T {
    try {
      return operation()
    } catch (error) {
      this.handle(error as Error, context)
      throw error
    }
  }
}

// Utility functions for common error scenarios
export const createValidationError = (message: string, details?: any) => 
  new ValidationError(message, details)

export const createDatabaseError = (message: string, originalError: Error) => 
  new DatabaseError(message, originalError)

export const createNotFoundError = (resource: string, id?: string | number) => 
  new NotFoundError(resource, id)

export const createAuthenticationError = (message?: string) => 
  new AuthenticationError(message)

export const createAuthorizationError = (message?: string) => 
  new AuthorizationError(message)

export const createRateLimitError = (retryAfter: number) => 
  new RateLimitError(retryAfter)

export const createExternalApiError = (service: string, message: string, originalError: Error) => 
  new ExternalApiError(service, message, originalError)

// Error response helper for Next.js API routes
export const createErrorResponse = (error: Error, includeDetails: boolean = false) => {
  const statusCode = ErrorHandler.getStatusCode(error)
  const response = ErrorHandler.toApiResponse(error, includeDetails)
  
  return {
    statusCode,
    response
  }
}
