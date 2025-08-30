#!/usr/bin/env node

/**
 * F1 Data Preloader Script
 * 
 * This script downloads and caches all F1 data for specified seasons.
 * It can be run manually or scheduled to keep data up to date.
 */

import { F1DataManager } from '../lib/dataManager'

interface PreloaderOptions {
  seasons: string[]
  includeRealtime?: boolean
  forceRefresh?: boolean
  verbose?: boolean
}

class F1DataPreloader {
  private verbose: boolean = false

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose || false
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[${new Date().toISOString()}] ${message}`)
    }
  }

  private logError(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`)
    if (error) {
      console.error(error)
    }
  }

  async preloadSeasons(options: PreloaderOptions): Promise<void> {
    const { seasons, forceRefresh = false, verbose = false } = options
    this.verbose = verbose

    this.log(`Starting preload for seasons: ${seasons.join(', ')}`)

    if (forceRefresh) {
      this.log('Force refresh enabled - clearing cache')
      await F1DataManager.clearCache()
    }

    for (const season of seasons) {
      await this.preloadSeason(season)
    }

    this.log('Preload complete!')
  }

  async preloadSeason(season: string): Promise<void> {
    try {
      this.log(`Preloading season ${season}...`)
      
      // Basic season data
      this.log(`- Fetching basic data for ${season}`)
      const [races, drivers, constructors] = await Promise.all([
        F1DataManager.getRaces(season),
        F1DataManager.getDrivers(season),
        F1DataManager.getConstructors(season)
      ])

      this.log(`- Found ${races.length} races, ${drivers.length} drivers, ${constructors.length} constructors`)

      // Standings
      this.log(`- Fetching standings for ${season}`)
      await Promise.all([
        F1DataManager.getDriverStandings(season),
        F1DataManager.getConstructorStandings(season)
      ])

      // Race-specific data
      this.log(`- Fetching race results and qualifying for ${races.length} races`)
      const racePromises = races.map(async (race, index) => {
        try {
          this.log(`  - Race ${race.round}: ${race.raceName}`)
          
          await Promise.all([
            F1DataManager.getRaceResults(season, race.round),
            F1DataManager.getQualifyingResults(season, race.round),
            F1DataManager.getLapTimes(season, race.round)
          ])

          // Add delay to avoid rate limiting
          if (index < races.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (error) {
          this.logError(`Error loading race ${race.round} for season ${season}`, error)
        }
      })

      await Promise.all(racePromises)

      this.log(`✓ Completed preload for season ${season}`)
    } catch (error) {
      this.logError(`Failed to preload season ${season}`, error)
      throw error
    }
  }

  async preloadRecentSeasons(count: number = 3): Promise<void> {
    try {
      this.log('Fetching available seasons...')
      const allSeasons = await F1DataManager.getSeasons()
      
      // Get the most recent seasons
      const recentSeasons = allSeasons
        .sort((a, b) => parseInt(b) - parseInt(a))
        .slice(0, count)

      this.log(`Preloading ${count} most recent seasons: ${recentSeasons.join(', ')}`)

      await this.preloadSeasons({
        seasons: recentSeasons,
        verbose: this.verbose
      })
    } catch (error) {
      this.logError('Failed to preload recent seasons', error)
      throw error
    }
  }

  async preloadCurrentSeason(): Promise<void> {
    const currentYear = new Date().getFullYear().toString()
    
    this.log(`Preloading current season: ${currentYear}`)
    await this.preloadSeason(currentYear)
  }

  async getDataStats(): Promise<void> {
    try {
      this.log('Collecting data statistics...')
      
      const seasons = await F1DataManager.getSeasons()
      this.log(`Total seasons available: ${seasons.length}`)
      
      // Check cache for recent seasons
      const recentSeasons = seasons.slice(-5)
      for (const season of recentSeasons) {
        try {
          const races = await F1DataManager.getRaces(season)
          const drivers = await F1DataManager.getDrivers(season)
          this.log(`Season ${season}: ${races.length} races, ${drivers.length} drivers`)
        } catch (error) {
          this.log(`Season ${season}: No cached data`)
        }
      }
    } catch (error) {
      this.logError('Failed to get data stats', error)
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const preloader = new F1DataPreloader({ verbose: true })

  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
F1 Data Preloader

Usage:
  node dataPreloader.js [options] [seasons...]

Options:
  --current         Preload current season only
  --recent [count]  Preload recent N seasons (default: 3)
  --stats          Show data statistics
  --force          Force refresh (clear cache first)
  --help, -h       Show this help message

Examples:
  node dataPreloader.js --current
  node dataPreloader.js --recent 5
  node dataPreloader.js 2023 2024
  node dataPreloader.js --stats
      `)
      return
    }

    if (args.includes('--stats')) {
      await preloader.getDataStats()
      return
    }

    if (args.includes('--current')) {
      await preloader.preloadCurrentSeason()
      return
    }

    if (args.includes('--recent')) {
      const countIndex = args.indexOf('--recent') + 1
      const count = countIndex < args.length && !isNaN(parseInt(args[countIndex])) 
        ? parseInt(args[countIndex]) 
        : 3
      await preloader.preloadRecentSeasons(count)
      return
    }

    // Specific seasons
    const seasons = args.filter(arg => !arg.startsWith('--') && /^\d{4}$/.test(arg))
    if (seasons.length > 0) {
      await preloader.preloadSeasons({
        seasons,
        verbose: true,
        forceRefresh: args.includes('--force')
      })
      return
    }

    // Default: preload recent 3 seasons
    console.log('No options specified, preloading recent 3 seasons...')
    await preloader.preloadRecentSeasons(3)

  } catch (error) {
    console.error('Preloader failed:', error)
    process.exit(1)
  }
}

// Export for programmatic use
export { F1DataPreloader }

// Run if called directly
if (require.main === module) {
  main()
}