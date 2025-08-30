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

    // Get drivers from database
    const drivers = await f1Repository.getDriversBySeason(season)

    // Transform data for frontend consumption
    const transformedDrivers = drivers.map(driver => ({
      id: driver.id,
      driver_code: driver.driver_code,
      first_name: driver.first_name,
      last_name: driver.last_name,
      full_name: `${driver.first_name} ${driver.last_name}`,
      nationality: driver.nationality,
      date_of_birth: driver.date_of_birth,
      url: driver.url,
      is_active: driver.is_active
    }))

    return NextResponse.json({
      data: transformedDrivers,
      success: true,
      message: `Found ${transformedDrivers.length} drivers for season ${season}`,
      timestamp: new Date()
    })

  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch drivers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
