#!/usr/bin/env tsx

/**
 * Database Initialization Script
 * 
 * This script initializes the PostgreSQL database with the F1 dashboard schema.
 * It creates tables, indexes, views, and functions.
 */

import { query, testConnection } from '../src/lib/database/connection'
import * as fs from 'fs'
import * as path from 'path'

class DatabaseInitializer {
  async initialize(): Promise<void> {
    console.log('🏗️  Initializing F1 Dashboard Database...')

    try {
      // Test connection
      console.log('🔌 Testing database connection...')
      const isConnected = await testConnection()
      if (!isConnected) {
        throw new Error('Database connection failed')
      }
      console.log('✅ Database connected successfully')

      // Read and execute schema file
      console.log('📋 Creating database schema...')
      await this.createSchema()

      // Insert sample data
      console.log('📊 Inserting sample data...')
      await this.insertSampleData()

      console.log('✅ Database initialization completed successfully!')

    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  private async createSchema(): Promise<void> {
    const schemaPath = path.join(__dirname, '../src/lib/database/schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement)
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`)
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.code === '42P07' || error.code === '42710') {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`)
          } else {
            console.error(`❌ Failed to execute: ${statement.substring(0, 50)}...`)
            console.error('Error:', error.message)
            throw error
          }
        }
      }
    }
  }

  private async insertSampleData(): Promise<void> {
    // Check if sample data already exists
    const existingSeasons = await query('SELECT COUNT(*) as count FROM seasons')
    if (existingSeasons.rows[0].count > 0) {
      console.log('⚠️  Sample data already exists, skipping...')
      return
    }

    // Insert sample seasons
    await query(`
      INSERT INTO seasons (id, year, name, is_active) VALUES 
      ('2024', 2024, '2024 Formula 1 World Championship', true),
      ('2023', 2023, '2023 Formula 1 World Championship', false),
      ('2022', 2022, '2022 Formula 1 World Championship', false)
      ON CONFLICT (id) DO NOTHING
    `)

    // Insert sample circuits
    await query(`
      INSERT INTO circuits (id, name, location, country) VALUES
      ('bahrain', 'Bahrain International Circuit', 'Sakhir', 'Bahrain'),
      ('jeddah', 'Jeddah Corniche Circuit', 'Jeddah', 'Saudi Arabia'),
      ('albert_park', 'Albert Park Circuit', 'Melbourne', 'Australia'),
      ('imola', 'Autodromo Enzo e Dino Ferrari', 'Imola', 'Italy'),
      ('monaco', 'Circuit de Monaco', 'Monte Carlo', 'Monaco'),
      ('catalunya', 'Circuit de Barcelona-Catalunya', 'Montmeló', 'Spain'),
      ('red_bull_ring', 'Red Bull Ring', 'Spielberg', 'Austria'),
      ('silverstone', 'Silverstone Circuit', 'Silverstone', 'Great Britain'),
      ('hungaroring', 'Hungaroring', 'Budapest', 'Hungary'),
      ('spa', 'Circuit de Spa-Francorchamps', 'Stavelot', 'Belgium'),
      ('zandvoort', 'Circuit Zandvoort', 'Zandvoort', 'Netherlands'),
      ('monza', 'Autodromo Nazionale di Monza', 'Monza', 'Italy'),
      ('marina_bay', 'Marina Bay Street Circuit', 'Marina Bay', 'Singapore'),
      ('suzuka', 'Suzuka International Racing Course', 'Suzuka', 'Japan'),
      ('losail', 'Losail International Circuit', 'Al Daayen', 'Qatar'),
      ('cota', 'Circuit of the Americas', 'Austin', 'United States'),
      ('rodriguez', 'Autódromo Hermanos Rodríguez', 'Mexico City', 'Mexico'),
      ('interlagos', 'Autódromo José Carlos Pace', 'São Paulo', 'Brazil'),
      ('vegas', 'Las Vegas Strip Circuit', 'Las Vegas', 'United States'),
      ('yas_marina', 'Yas Marina Circuit', 'Abu Dhabi', 'UAE')
      ON CONFLICT (id) DO NOTHING
    `)

    // Insert sample constructors
    await query(`
      INSERT INTO constructors (id, name, nationality) VALUES
      ('red_bull', 'Red Bull Racing', 'Austrian'),
      ('ferrari', 'Scuderia Ferrari', 'Italian'),
      ('mercedes', 'Mercedes', 'German'),
      ('mclaren', 'McLaren', 'British'),
      ('aston_martin', 'Aston Martin', 'British'),
      ('alpine', 'Alpine', 'French'),
      ('williams', 'Williams', 'British'),
      ('rb', 'Visa Cash App RB', 'Italian'),
      ('stake', 'Stake F1 Team Kick Sauber', 'Swiss'),
      ('haas', 'Haas F1 Team', 'American')
      ON CONFLICT (id) DO NOTHING
    `)

    // Insert sample drivers
    await query(`
      INSERT INTO drivers (id, driver_code, first_name, last_name, nationality) VALUES
      ('max_verstappen', 'VER', 'Max', 'Verstappen', 'Dutch'),
      ('charles_leclerc', 'LEC', 'Charles', 'Leclerc', 'Monegasque'),
      ('lewis_hamilton', 'HAM', 'Lewis', 'Hamilton', 'British'),
      ('lando_norris', 'NOR', 'Lando', 'Norris', 'British'),
      ('carlos_sainz', 'SAI', 'Carlos', 'Sainz', 'Spanish'),
      ('george_russell', 'RUS', 'George', 'Russell', 'British'),
      ('fernando_alonso', 'ALO', 'Fernando', 'Alonso', 'Spanish'),
      ('oscar_piastri', 'PIA', 'Oscar', 'Piastri', 'Australian'),
      ('lance_stroll', 'STR', 'Lance', 'Stroll', 'Canadian'),
      ('valtteri_bottas', 'BOT', 'Valtteri', 'Bottas', 'Finnish'),
      ('sergio_perez', 'PER', 'Sergio', 'Pérez', 'Mexican'),
      ('daniel_ricciardo', 'RIC', 'Daniel', 'Ricciardo', 'Australian'),
      ('esteban_ocon', 'OCO', 'Esteban', 'Ocon', 'French'),
      ('alex_albon', 'ALB', 'Alexander', 'Albon', 'Thai'),
      ('yuki_tsunoda', 'TSU', 'Yuki', 'Tsunoda', 'Japanese'),
      ('nico_hulkenberg', 'HUL', 'Nico', 'Hülkenberg', 'German'),
      ('kevin_magnussen', 'MAG', 'Kevin', 'Magnussen', 'Danish'),
      ('guanyu_zhou', 'ZHO', 'Guanyu', 'Zhou', 'Chinese'),
      ('logan_sargeant', 'SAR', 'Logan', 'Sargeant', 'American'),
      ('ollie_bearman', 'BEA', 'Oliver', 'Bearman', 'British')
      ON CONFLICT (id) DO NOTHING
    `)

    console.log('✅ Sample data inserted successfully')
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Initialization Script

Usage:
  npm run db:init
  tsx scripts/init-db.ts

This script will:
1. Test database connection
2. Create all tables, indexes, views, and functions
3. Insert sample data (if not already present)

Environment Variables:
  DB_HOST                 Database host (default: localhost)
  DB_PORT                 Database port (default: 5432)
  DB_NAME                 Database name (default: f1_dashboard)
  DB_USER                 Database user (default: f1_user)
  DB_PASSWORD             Database password
    `)
    return
  }

  const initializer = new DatabaseInitializer()
  await initializer.initialize()
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export { DatabaseInitializer }
