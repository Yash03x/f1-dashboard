import { NextRequest, NextResponse } from 'next/server'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerOptions from '@/lib/swagger/config'

export async function GET(request: NextRequest) {
  try {
    // Generate the OpenAPI specification
    const spec = swaggerJsdoc(swaggerOptions)
    
    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Failed to generate OpenAPI spec:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate API specification',
        message: 'An error occurred while generating the OpenAPI specification'
      },
      { status: 500 }
    )
  }
}
