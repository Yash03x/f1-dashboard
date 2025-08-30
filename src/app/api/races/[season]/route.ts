import { NextRequest, NextResponse } from 'next/server'
import { f1Repository } from '@/lib/database/repositories/F1Repository'
import { testConnection } from '@/lib/database/connection'
import { rateLimitMiddleware } from '@/lib/middleware/rateLimit'
import { createValidationMiddleware, seasonSchema } from '@/lib/middleware/validation'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const logger = createLogger('api:races')

// Validate season parameter
const validateSeason = (season: string): boolean => {
  return /^\d{4}$/.test(season)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { season: string } }
) {
  const startTime = Date.now()
  
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimitMiddleware(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Validate season parameter
    const { season } = params
    if (!validateSeason(season)) {
      logger.warn('Invalid season parameter', { season })
      return NextResponse.json(
        { 
          error: 'Invalid season parameter',
          message: 'Season must be a 4-digit year (e.g., 2024)',
          received: season
        },
        { status: 400 }
      )
    }

    // Test database connection
    const isConnected = await testConnection()
    if (!isConnected) {
      logger.error('Database connection failed')
      return NextResponse.json(
        { 
          error: 'Service unavailable',
          message: 'Database connection failed. Please try again later.'
        },
        { status: 503 }
      )
    }

    // Get races from database
    logger.info('Fetching races', { season })
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

    const duration = Date.now() - startTime
    logger.info('Races fetched successfully', { 
      season, 
      count: transformedRaces.length,
      duration 
    })

    return NextResponse.json({
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
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Error fetching races', { 
      season: params.season,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration
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

// Handle unsupported methods
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'POST method is not supported for this endpoint'
    },
    { status: 405 }
  )
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'PUT method is not supported for this endpoint'
    },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'DELETE method is not supported for this endpoint'
    },
    { status: 405 }
  )
}
