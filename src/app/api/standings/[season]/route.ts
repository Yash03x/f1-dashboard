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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'driver' // 'driver' or 'constructor'
    const round = searchParams.get('round') ? parseInt(searchParams.get('round')!) : undefined

    // Validate season parameter
    if (!season || !/^\d{4}$/.test(season)) {
      return NextResponse.json(
        { error: 'Invalid season parameter. Must be a 4-digit year.' },
        { status: 400 }
      )
    }

    let standings
    let message

    if (type === 'driver') {
      standings = await f1Repository.getDriverStandings(season, round)
      message = `Found ${standings.length} driver standings for season ${season}`
    } else if (type === 'constructor') {
      standings = await f1Repository.getConstructorStandings(season, round)
      message = `Found ${standings.length} constructor standings for season ${season}`
    } else {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "driver" or "constructor".' },
        { status: 400 }
      )
    }

    // Transform data for frontend consumption
    const transformedStandings = standings.map((standing: any) => {
      if (type === 'driver') {
        return {
          position: standing.position,
          driver_id: standing.driver_id,
          driver_name: `${standing.first_name} ${standing.last_name}`,
          driver_code: standing.driver_code,
          nationality: standing.nationality,
          constructor_name: standing.constructor_name,
          points: standing.points,
          wins: standing.wins,
          podiums: standing.podiums,
          fastest_laps: standing.fastest_laps,
          races_entered: standing.races_entered,
          races_finished: standing.races_finished,
          dnf_count: standing.dnf_count
        }
      } else {
        return {
          position: standing.position,
          constructor_id: standing.constructor_id,
          constructor_name: standing.constructor_name,
          nationality: standing.nationality,
          points: standing.points,
          wins: standing.wins,
          podiums: standing.podiums,
          fastest_laps: standing.fastest_laps,
          races_entered: standing.races_entered,
          races_finished: standing.races_finished,
          dnf_count: standing.dnf_count
        }
      }
    })

    return NextResponse.json({
      data: transformedStandings,
      success: true,
      message,
      timestamp: new Date(),
      metadata: {
        season,
        type,
        round,
        total_entries: transformedStandings.length
      }
    })

  } catch (error) {
    console.error('Error fetching standings:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch standings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
