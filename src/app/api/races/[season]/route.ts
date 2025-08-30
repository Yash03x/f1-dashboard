import { NextRequest, NextResponse } from 'next/server'
import { f1Repository } from '@/lib/database/repositories/F1Repository'
import { testConnection } from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: { season: string } }
) {
  try {
    // Test database connection
    const isConnected = await testConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    const { season } = params

    // Validate season parameter
    if (!season || !/^\d{4}$/.test(season)) {
      return NextResponse.json(
        { error: 'Invalid season parameter. Must be a 4-digit year.' },
        { status: 400 }
      )
    }

    // Get races from database
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

    return NextResponse.json({
      data: transformedRaces,
      success: true,
      message: `Found ${transformedRaces.length} races for season ${season}`,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Error fetching races:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch races',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
