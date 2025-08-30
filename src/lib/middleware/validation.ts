import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('validation')

// Common validation schemas
export const seasonSchema = z.object({
  season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year')
})

export const raceSchema = z.object({
  season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year'),
  round: z.string().optional().transform(val => val ? parseInt(val) : undefined)
})

export const standingsSchema = z.object({
  season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year'),
  type: z.enum(['driver', 'constructor']).default('driver'),
  round: z.string().optional().transform(val => val ? parseInt(val) : undefined)
})

export const telemetrySchema = z.object({
  raceId: z.string().transform(val => parseInt(val)),
  driverId: z.string().optional(),
  lapNumber: z.string().optional().transform(val => val ? parseInt(val) : undefined)
})

export const syncSchema = z.object({
  season: z.string().regex(/^\d{4}$/, 'Season must be a 4-digit year'),
  type: z.enum(['seasons', 'season', 'complete']).default('complete'),
  force: z.string().optional().transform(val => val === 'true'),
  concurrency: z.string().optional().transform(val => val ? parseInt(val) : 5)
})

// Validation middleware factory
export function createValidationMiddleware<T extends z.ZodSchema>(
  schema: T,
  location: 'query' | 'params' | 'body' = 'query'
) {
  return (request: NextRequest) => {
    try {
      let data: any

      switch (location) {
        case 'query':
          const url = new URL(request.url)
          data = Object.fromEntries(url.searchParams.entries())
          break
        case 'params':
          // For Next.js App Router, params are passed separately
          // This is a placeholder - actual params should be passed from the route handler
          data = {}
          break
        case 'body':
          // For body validation, this should be called after parsing the body
          data = {}
          break
      }

      const validatedData = schema.parse(data)
      
      // Attach validated data to request for use in route handlers
      ;(request as any).validatedData = validatedData
      
      return NextResponse.next()
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation failed', {
          errors: error.errors,
          url: request.url,
          method: request.method
        })

        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Invalid request parameters',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          },
          { status: 400 }
        )
      }

      logger.error('Validation error', { error: error instanceof Error ? error.message : 'Unknown error' })
      
      return NextResponse.json(
        {
          error: 'Internal validation error',
          message: 'An unexpected error occurred during validation'
        },
        { status: 500 }
      )
    }
  }
}

// Sanitization middleware
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

// SQL injection prevention
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .trim()
}

// XSS prevention
export function sanitizeHtmlInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Request size limiting middleware
export function createSizeLimitMiddleware(maxSize: number = 1024 * 1024) { // 1MB default
  return (request: NextRequest) => {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Request too large', {
        size: contentLength,
        maxSize,
        url: request.url
      })

      return NextResponse.json(
        {
          error: 'Request too large',
          message: `Request size exceeds maximum allowed size of ${maxSize} bytes`
        },
        { status: 413 }
      )
    }

    return NextResponse.next()
  }
}

// Content type validation middleware
export function createContentTypeMiddleware(allowedTypes: string[] = ['application/json']) {
  return (request: NextRequest) => {
    const contentType = request.headers.get('content-type')
    
    if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
      logger.warn('Invalid content type', {
        contentType,
        allowedTypes,
        url: request.url
      })

      return NextResponse.json(
        {
          error: 'Invalid content type',
          message: `Content type must be one of: ${allowedTypes.join(', ')}`
        },
        { status: 415 }
      )
    }

    return NextResponse.next()
  }
}

// Method validation middleware
export function createMethodValidationMiddleware(allowedMethods: string[]) {
  return (request: NextRequest) => {
    if (!allowedMethods.includes(request.method)) {
      logger.warn('Method not allowed', {
        method: request.method,
        allowedMethods,
        url: request.url
      })

      return NextResponse.json(
        {
          error: 'Method not allowed',
          message: `Method ${request.method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`
        },
        { status: 405 }
      )
    }

    return NextResponse.next()
  }
}

// Combine multiple middleware functions
export function combineMiddleware(...middlewares: Array<(request: NextRequest) => NextResponse | undefined>) {
  return (request: NextRequest) => {
    for (const middleware of middlewares) {
      const result = middleware(request)
      if (result) {
        return result
      }
    }
    return NextResponse.next()
  }
}

// Pre-configured middleware combinations
export const apiValidationMiddleware = combineMiddleware(
  createMethodValidationMiddleware(['GET', 'POST']),
  createSizeLimitMiddleware(1024 * 1024), // 1MB
  createContentTypeMiddleware(['application/json'])
)

export const syncValidationMiddleware = combineMiddleware(
  createMethodValidationMiddleware(['POST']),
  createSizeLimitMiddleware(10 * 1024 * 1024), // 10MB for sync operations
  createContentTypeMiddleware(['application/json'])
)
