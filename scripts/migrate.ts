#!/usr/bin/env tsx

/**
 * Database Migration Script
 * 
 * This script manages database migrations for the F1 dashboard.
 * 
 * Usage:
 *   npm run migrate:status
 *   npm run migrate:up
 *   npm run migrate:down
 *   npm run migrate:create "Add new table"
 */

import { migrationManager } from '../src/lib/database/migrations/MigrationManager'
import { testConnection } from '../src/lib/database/connection'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const options = args.slice(1)

  try {
    // Test database connection first
    console.log('🔌 Testing database connection...')
    const isConnected = await testConnection()
    if (!isConnected) {
      console.error('❌ Database connection failed')
      process.exit(1)
    }
    console.log('✅ Database connected successfully')

    switch (command) {
      case 'status':
        await showStatus()
        break
      
      case 'up':
      case 'migrate':
        await runMigrations(options[0])
        break
      
      case 'down':
      case 'rollback':
        await rollbackMigrations(parseInt(options[0]) || 1)
        break
      
      case 'create':
        await createMigration(options[0])
        break
      
      case 'reset':
        await resetDatabase()
        break
      
      case 'help':
      case '--help':
      case '-h':
        showHelp()
        break
      
      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function showStatus(): Promise<void> {
  console.log('📊 Migration Status')
  console.log('==================')
  
  const status = await migrationManager.getStatus()
  
  console.log(`Total migrations: ${status.total}`)
  console.log(`Executed: ${status.executed}`)
  console.log(`Pending: ${status.pending}`)
  console.log()
  
  if (status.migrations.length === 0) {
    console.log('No migrations found')
    return
  }
  
  console.log('Migration Details:')
  console.log('ID'.padEnd(20) + 'Name'.padEnd(30) + 'Status'.padEnd(10) + 'Executed At')
  console.log('-'.repeat(80))
  
  for (const migration of status.migrations) {
    const statusIcon = migration.status === 'executed' ? '✅' : '⏳'
    const executedAt = migration.executedAt ? 
      new Date(migration.executedAt).toLocaleString() : '-'
    
    console.log(
      migration.id.padEnd(20) +
      migration.name.padEnd(30) +
      (statusIcon + ' ' + migration.status).padEnd(10) +
      executedAt
    )
  }
}

async function runMigrations(target?: string): Promise<void> {
  console.log('🔄 Running migrations...')
  
  if (target) {
    console.log(`Target migration: ${target}`)
  }
  
  await migrationManager.migrate(target)
  console.log('✅ Migrations completed successfully')
}

async function rollbackMigrations(steps: number): Promise<void> {
  console.log(`🔄 Rolling back ${steps} migration(s)...`)
  
  await migrationManager.rollback(steps)
  console.log('✅ Rollback completed successfully')
}

async function createMigration(name: string): Promise<void> {
  if (!name) {
    console.error('❌ Migration name is required')
    console.log('Usage: npm run migrate:create "Add new table"')
    process.exit(1)
  }
  
  console.log(`📝 Creating migration: ${name}`)
  
  const filePath = await migrationManager.createMigration(name)
  console.log(`✅ Migration file created: ${filePath}`)
  console.log('📝 Edit the file to add your migration SQL')
}

async function resetDatabase(): Promise<void> {
  console.log('⚠️  WARNING: This will reset the entire database!')
  console.log('This action cannot be undone.')
  
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const answer = await new Promise<string>(resolve => {
    rl.question('Are you sure you want to continue? (yes/no): ', resolve)
  })
  
  rl.close()
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Reset cancelled')
    return
  }
  
  console.log('🔄 Resetting database...')
  
  // Get all executed migrations and rollback all
  const executedMigrations = await migrationManager.getExecutedMigrations()
  if (executedMigrations.length > 0) {
    await migrationManager.rollback(executedMigrations.length)
  }
  
  console.log('✅ Database reset completed')
}

function showHelp(): void {
  console.log(`
Database Migration Script

Usage:
  npm run migrate:status                    # Show migration status
  npm run migrate:up                        # Run all pending migrations
  npm run migrate:up <target>               # Run migrations up to target
  npm run migrate:down                      # Rollback last migration
  npm run migrate:down <steps>              # Rollback specified number of migrations
  npm run migrate:create "Description"      # Create new migration file
  npm run migrate:reset                     # Reset entire database (DANGEROUS!)

Examples:
  npm run migrate:status
  npm run migrate:up
  npm run migrate:down 2
  npm run migrate:create "Add user preferences table"
  npm run migrate:up 20241230_initial_schema

Environment Variables:
  DB_HOST                 Database host (default: localhost)
  DB_PORT                 Database port (default: 5432)
  DB_NAME                 Database name (default: f1_dashboard)
  DB_USER                 Database user (default: f1_user)
  DB_PASSWORD             Database password
  `)
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export { migrationManager }
