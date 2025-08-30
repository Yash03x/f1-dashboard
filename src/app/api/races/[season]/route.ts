import { NextRequest, NextResponse } from 'next/server'
import { f1Repository } from '@/lib/database/repositories/F1Repository'
import { testConnection } from '@/lib/database/connection'
import { rateLimitMiddleware } from '@/lib/redis/rateLimiter'
import { createValidationMiddleware, seasonSchema } from '@/lib/middleware/validation'
import { apiCache } from '@/lib/redis/cache'
import { createLogger } from '@/lib/logger'
import { ErrorHandler, createValidationError, createDatabaseError } from '@/lib/utils/errorHandler'
import { z } from 'zod'

const logger = createLogger('api:races')

// Validate season parameter
const validateSeason = (season: string): boolean => {
  return /^\d{4}$/.test(season)
}

/**
 * @swagger
 * /api/races/{season}:
 *   get:
 *     summary: Get races for a specific season
 *     description: Retrieve all races for a given Formula 1 season with detailed information including results, qualifying, and circuit details.
 *     tags: [Races]
 *     parameters:
 *       - $ref: '#/components/parameters/SeasonParam'
 *       - name: include_results
 *         in: query
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include race results in the response
 *       - name: include_qualifying
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include qualifying results in the response
 *     responses:
 *       200:
 *         description: Successful response with races data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Race'
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Found 24 races for season 2024"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     season:
 *                       type: string
 *                       example: "2024"
 *                     total_races:
 *                       type: integer
 *                       example: 24
 *                     completed_races:
 *                       type: integer
 *                       example: 12
 *                     upcoming_races:
 *                       type: integer
 *                       example: 12
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Service unavailable"
 *               message: "Database connection failed. Please try again later."
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { season: string } }
) {
  const startTime = Date.now()
  
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimitMiddleware(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Validate season parameter
    const { season } = params
    if (!validateSeason(season)) {
      const error = createValidationError('Invalid season parameter', { 
        received: season,
        expected: '4-digit year format (e.g., 2024)'
      })
      ErrorHandler.handle(error, { operation: 'get_races', requestId: request.headers.get('x-request-id') })
      
      return NextResponse.json(
        { 
          error: 'Invalid season parameter',
          message: 'Season must be a 4-digit year (e.g., 2024)',
          received: season
        },
        { status: 400 }
      )
    }

    // Check cache first
    const cacheKey = `races:${season}`
    const cached = await apiCache.get(cacheKey)
    
    if (cached) {
      logger.info('Cache hit for races', { season })
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Test database connection
    const isConnected = await testConnection()
    if (!isConnected) {
      const error = createDatabaseError('Database connection failed', new Error('Connection test failed'))
      ErrorHandler.handle(error, { operation: 'get_races', requestId: request.headers.get('x-request-id') })
      
      return NextResponse.json(
        { 
          error: 'Service unavailable',
          message: 'Database connection failed. Please try again later.'
        },
        { status: 503 }
      )
    }

    // Get races from database
    logger.info('Fetching races from database', { season })
    const races = await f1Repository.getRacesBySeason(season)

    // Transform data for frontend consumption
    const transformedRaces = races.map(race => ({
      id: race.id,
      round: race.round,
      race_name: race.race_name,
      circuit_name: race.circuit_name,
      circuit_country: race.circuit_country,
      circuit_location: race.circuit_location,
      race_date: race.race_date,
      qualifying_date: race.qualifying_date,
      sprint_date: race.sprint_date,
      status: race.status,
      season_year: race.season_year,
      
      // Include race results if available
      race_results: race.race_results ? 
        race.race_results.slice(0, 10).map((result: any) => ({
          position: result.position,
          driver_name: result.driver_name,
          constructor_name: result.constructor_name,
          grid: result.grid,
          laps: result.laps,
          status: result.status,
          time: result.time,
          points: result.points,
          fastest_lap: result.fastest_lap
        })) : null,
      
      // Include qualifying results if available
      qualifying_results: race.qualifying_results ? 
        race.qualifying_results.slice(0, 10).map((result: any) => ({
          position: result.position,
          driver_name: result.driver_name,
          constructor_name: result.constructor_name,
          q1: result.q1,
          q2: result.q2,
          q3: result.q3
        })) : null
    }))

    const response = {
      data: transformedRaces,
      success: true,
      message: `Found ${transformedRaces.length} races for season ${season}`,
      timestamp: new Date(),
      metadata: {
        season,
        total_races: transformedRaces.length,
        completed_races: transformedRaces.filter(r => r.status === 'completed').length,
        upcoming_races: transformedRaces.filter(r => r.status === 'scheduled').length
      }
    }

    // Cache the response for 30 minutes
    await apiCache.set(cacheKey, response, 1800)

    const duration = Date.now() - startTime
    logger.info('Races fetched successfully', { 
      season, 
      count: transformedRaces.length,
      duration,
      cacheHit: false
    })

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Response-Time': `${duration}ms`,
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    ErrorHandler.handle(error as Error, { 
      operation: 'get_races', 
      requestId: request.headers.get('x-request-id'),
      additionalData: { season: params.season, duration }
    })

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch races. Please try again later.',
        timestamp: new Date()
      },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${duration}ms`
        }
      }
    )
  }
}

/**
 * @swagger
 * /api/races/{season}:
 *   post:
 *     summary: Create a new race (Not implemented)
 *     description: This endpoint is not implemented in the current version.
 *     tags: [Races]
 *     parameters:
 *       - $ref: '#/components/parameters/SeasonParam'
 *     responses:
 *       405:
 *         description: Method not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Method not allowed"
 *               message: "POST method is not supported for this endpoint"
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

/**
 * @swagger
 * /api/races/{season}:
 *   put:
 *     summary: Update races (Not implemented)
 *     description: This endpoint is not implemented in the current version.
 *     tags: [Races]
 *     parameters:
 *       - $ref: '#/components/parameters/SeasonParam'
 *     responses:
 *       405:
 *         description: Method not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Method not allowed"
 *               message: "PUT method is not supported for this endpoint"
 */
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'PUT method is not supported for this endpoint'
    },
    { status: 405 }
  )
}

/**
 * @swagger
 * /api/races/{season}:
 *   delete:
 *     summary: Delete races (Not implemented)
 *     description: This endpoint is not implemented in the current version.
 *     tags: [Races]
 *     parameters:
 *       - $ref: '#/components/parameters/SeasonParam'
 *     responses:
 *       405:
 *         description: Method not allowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Method not allowed"
 *               message: "DELETE method is not supported for this endpoint"
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'DELETE method is not supported for this endpoint'
    },
    { status: 405 }
  )
}
