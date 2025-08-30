#!/usr/bin/env tsx

/**
 * Database Test Script
 * 
 * This script tests the database connection and basic functionality.
 */

import { testConnection, query } from '../src/lib/database/connection'

async function testDatabase() {
  console.log('🧪 Testing F1 Dashboard Database...')

  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    const isConnected = await testConnection()
    
    if (!isConnected) {
      console.error('❌ Database connection failed')
      process.exit(1)
    }
    
    console.log('✅ Database connection successful')

    // Test basic query
    console.log('📊 Testing basic query...')
    const result = await query('SELECT version()')
    console.log('✅ Database version:', result.rows[0].version)

    // Test if tables exist
    console.log('📋 Checking database schema...')
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('✅ Found tables:', tablesResult.rows.map(row => row.table_name))

    console.log('🎉 Database test completed successfully!')

  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  testDatabase().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export { testDatabase }
