#!/usr/bin/env tsx

/**
 * F1 Data Sync Script
 * 
 * This script syncs F1 data from external APIs to our PostgreSQL database.
 * It can be run manually or scheduled via cron jobs.
 * 
 * Usage:
 *   npm run sync:seasons
 *   npm run sync:season 2024
 *   npm run sync:complete 2024
 */

import { f1DataSyncService } from '../src/lib/services/F1DataSyncService'
import { testConnection } from '../src/lib/database/connection'

interface SyncOptions {
  season?: string
  type?: 'seasons' | 'season' | 'complete'
  forceRefresh?: boolean
  concurrency?: number
}

class DataSyncRunner {
  private options: SyncOptions

  constructor(options: SyncOptions = {}) {
    this.options = {
      type: 'complete',
      forceRefresh: false,
      concurrency: 5,
      ...options
    }
  }

  async run(): Promise<void> {
    console.log('🏁 Starting F1 Data Sync...')
    console.log('Options:', this.options)

    try {
      // Test database connection
      console.log('🔌 Testing database connection...')
      const isConnected = await testConnection()
      if (!isConnected) {
        throw new Error('Database connection failed')
      }
      console.log('✅ Database connected successfully')

      // Run appropriate sync based on type
      switch (this.options.type) {
        case 'seasons':
          await this.syncSeasons()
          break
        case 'season':
          if (!this.options.season) {
            throw new Error('Season parameter required for season sync')
          }
          await this.syncSeason(this.options.season)
          break
        case 'complete':
          if (!this.options.season) {
            throw new Error('Season parameter required for complete sync')
          }
          await this.syncCompleteSeason(this.options.season)
          break
        default:
          throw new Error(`Unknown sync type: ${this.options.type}`)
      }

      console.log('🏆 Data sync completed successfully!')

    } catch (error) {
      console.error('❌ Data sync failed:', error)
      process.exit(1)
    }
  }

  private async syncSeasons(): Promise<void> {
    console.log('🔄 Syncing all seasons...')
    await f1DataSyncService.syncSeasons()
    console.log('✅ Seasons sync completed')
  }

  private async syncSeason(season: string): Promise<void> {
    console.log(`🔄 Syncing basic data for season ${season}...`)
    
    await Promise.all([
      f1DataSyncService.syncRacesForSeason(season),
      f1DataSyncService.syncDriversForSeason(season),
      f1DataSyncService.syncConstructorsForSeason(season)
    ])
    
    console.log(`✅ Basic season sync completed for ${season}`)
  }

  private async syncCompleteSeason(season: string): Promise<void> {
    console.log(`🔄 Starting complete sync for season ${season}...`)
    
    await f1DataSyncService.syncCompleteSeasonData(season, {
      forceRefresh: this.options.forceRefresh,
      concurrency: this.options.concurrency
    })
    
    console.log(`✅ Complete season sync completed for ${season}`)
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  // Parse command line arguments
  const options: SyncOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp()
        return
        
      case '--type':
        options.type = args[++i] as 'seasons' | 'season' | 'complete'
        break
        
      case '--season':
        options.season = args[++i]
        break
        
      case '--force':
        options.forceRefresh = true
        break
        
      case '--concurrency':
        options.concurrency = parseInt(args[++i])
        break
        
      default:
        if (!options.season && /^\d{4}$/.test(arg)) {
          options.season = arg
        } else {
          console.error(`Unknown argument: ${arg}`)
          showHelp()
          process.exit(1)
        }
    }
  }

  // Set default type if not specified
  if (!options.type) {
    options.type = options.season ? 'complete' : 'seasons'
  }

  // Validate options
  if (options.type === 'season' || options.type === 'complete') {
    if (!options.season) {
      console.error('Season parameter required for season/complete sync')
      showHelp()
      process.exit(1)
    }
  }

  // Run the sync
  const runner = new DataSyncRunner(options)
  await runner.run()
}

function showHelp(): void {
  console.log(`
F1 Data Sync Script

Usage:
  npm run sync:seasons                    # Sync all seasons
  npm run sync:season 2024               # Sync basic data for 2024
  npm run sync:complete 2024             # Sync complete data for 2024
  
  tsx scripts/sync-data.ts [options] [season]

Options:
  --type <type>           Sync type: seasons, season, complete (default: complete)
  --season <year>         Season year (e.g., 2024)
  --force                 Force refresh (clear cache first)
  --concurrency <num>     Number of concurrent operations (default: 5)
  --help, -h              Show this help message

Examples:
  tsx scripts/sync-data.ts --type seasons
  tsx scripts/sync-data.ts --type season --season 2024
  tsx scripts/sync-data.ts --type complete --season 2024 --force
  tsx scripts/sync-data.ts 2024 --force --concurrency 10

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

export { DataSyncRunner }
