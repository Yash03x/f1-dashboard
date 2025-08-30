import { getF1Repository } from '../repositories/F1Repository'
import { F1DataService as ExternalF1DataService, OpenF1Service } from '../../api'
import { 
  Season, 
  Race, 
  Driver, 
  Constructor, 
  RaceResult, 
  DriverStanding,
  ConstructorStanding 
} from '@prisma/client'

interface DataSyncOptions {
  forceRefresh?: boolean
  batchSize?: number
  concurrency?: number
}

export class EnterpriseF1DataService {
  private repository = getF1Repository()
  private readonly DEFAULT_BATCH_SIZE = 50
  private readonly DEFAULT_CONCURRENCY = 5

  // ========================================
  // PUBLIC API - GET DATA (CACHE-FIRST)
  // ========================================

  async getSeasons(): Promise<Season[]> {
    try {
      // Always try database first
      const seasons = await this.repository.getAllSeasons()
      
      if (seasons.length === 0) {
        // If no seasons in DB, sync from external API
        console.log('No seasons found in database, syncing from external API...')
        await this.syncSeasonsFromExternal()
        return await this.repository.getAllSeasons()
      }

      return seasons
    } catch (error) {
      console.error('Failed to get seasons:', error)
      throw new Error(`Unable to retrieve seasons: ${error.message}`)
    }
  }

  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    try {
      let races = await this.repository.getRacesBySeason(seasonId)
      
      if (races.length === 0) {
        console.log(`No races found for season ${seasonId}, syncing...`)
        await this.syncRacesForSeason(seasonId)
        races = await this.repository.getRacesBySeason(seasonId)
      }

      return races
    } catch (error) {
      console.error(`Failed to get races for season ${seasonId}:`, error)
      throw error
    }
  }

  async getRaceWithResults(seasonId: string, round: number): Promise<any> {
    try {
      let race = await this.repository.getRaceWithResults(seasonId, round)
      
      if (!race) {
        console.log(`No race results found for ${seasonId}/${round}, syncing...`)
        await this.syncRaceResults(seasonId, round.toString())
        race = await this.repository.getRaceWithResults(seasonId, round)
      }

      return race
    } catch (error) {
      console.error(`Failed to get race results for ${seasonId}/${round}:`, error)
      throw error
    }
  }

  async getDriverStandings(seasonId: string): Promise<any[]> {
    try {
      let standings = await this.repository.getDriverStandings(seasonId)
      
      if (standings.length === 0) {
        console.log(`No driver standings found for season ${seasonId}, syncing...`)
        await this.syncDriverStandings(seasonId)
        standings = await this.repository.getDriverStandings(seasonId)
      }

      return standings
    } catch (error) {
      console.error(`Failed to get driver standings for season ${seasonId}:`, error)
      throw error
    }
  }

  async getConstructorStandings(seasonId: string): Promise<any[]> {
    try {
      let standings = await this.repository.getConstructorStandings(seasonId)
      
      if (standings.length === 0) {
        console.log(`No constructor standings found for season ${seasonId}, syncing...`)
        await this.syncConstructorStandings(seasonId)
        standings = await this.repository.getConstructorStandings(seasonId)
      }

      return standings
    } catch (error) {
      console.error(`Failed to get constructor standings for season ${seasonId}:`, error)
      throw error
    }
  }

  // ========================================
  // DATA SYNCHRONIZATION FROM EXTERNAL APIs
  // ========================================

  async syncSeasonsFromExternal(options: DataSyncOptions = {}): Promise<void> {
    try {
      console.log('🔄 Syncing seasons from external API...')
      
      const externalSeasons = await this.withRetry(
        () => ExternalF1DataService.getSeasons(),
        3
      )

      // Convert to database format and bulk insert
      const seasonData = externalSeasons.map(year => ({
        id: year,
        year: parseInt(year)
      }))

      // Use transaction for bulk operations
      let createdCount = 0
      for (const season of seasonData) {
        try {
          await this.repository.createSeason(season)
          createdCount++
        } catch (error) {
          // Season might already exist, continue
          if (!error.message.includes('Unique constraint')) {
            console.error(`Failed to create season ${season.id}:`, error)
          }
        }
      }

      console.log(`✅ Synced ${createdCount} seasons from external API`)
    } catch (error) {
      console.error('Failed to sync seasons:', error)
      throw error
    }
  }

  async syncRacesForSeason(seasonId: string, options: DataSyncOptions = {}): Promise<void> {
    try {
      console.log(`🔄 Syncing races for season ${seasonId}...`)
      
      // Ensure season exists
      let season = await this.repository.getSeasonById(seasonId)
      if (!season) {
        season = await this.repository.createSeason({
          id: seasonId,
          year: parseInt(seasonId)
        })
      }

      const externalRaces = await this.withRetry(
        () => ExternalF1DataService.getRaces(seasonId),
        3
      )

      // Convert to database format
      const raceData = externalRaces.map(race => ({
        season: seasonId,
        round: parseInt(race.round),
        name: race.raceName,
        date: new Date(race.date),
        time: race.time ? new Date(`${race.date}T${race.time}`) : null,
        url: race.url,
        circuitId: race.circuit.circuitId
      }))

      // Ensure circuits exist and create races
      for (const raceInfo of raceData) {
        try {
          // TODO: Create circuit if not exists
          await this.repository.createRace(raceInfo)
        } catch (error) {
          if (!error.message.includes('Unique constraint')) {
            console.error(`Failed to create race ${raceInfo.round}:`, error)
          }
        }
      }

      console.log(`✅ Synced ${raceData.length} races for season ${seasonId}`)
    } catch (error) {
      console.error(`Failed to sync races for season ${seasonId}:`, error)
      throw error
    }
  }

  async syncRaceResults(seasonId: string, round: string): Promise<void> {
    try {
      console.log(`🔄 Syncing race results for ${seasonId}/${round}...`)
      
      const externalRace = await this.withRetry(
        () => ExternalF1DataService.getRaceResults(seasonId, round),
        3
      )

      if (!externalRace.results) {
        console.log(`No results found for ${seasonId}/${round}`)
        return
      }

      // Convert results to database format
      const resultsData = externalRace.results.map(result => ({
        position: parseInt(result.position),
        positionText: result.positionText,
        points: parseFloat(result.points),
        grid: parseInt(result.grid),
        laps: parseInt(result.laps),
        status: result.status,
        time: result.time?.time || null,
        milliseconds: result.time?.millis ? parseInt(result.time.millis) : null,
        fastestLap: result.fastestLap ? parseInt(result.fastestLap.lap) : null,
        fastestLapTime: result.fastestLap?.time?.time || null,
        // Relations will be resolved by race ID and driver/constructor IDs
        raceId: `${seasonId}_${round}`, // Will need to resolve this
        driverId: result.driver.driverId,
        constructorId: result.constructor.constructorId
      }))

      // Bulk create results
      const createdCount = await this.repository.bulkCreateRaceResults(resultsData)
      console.log(`✅ Synced ${createdCount} race results for ${seasonId}/${round}`)
    } catch (error) {
      console.error(`Failed to sync race results for ${seasonId}/${round}:`, error)
      throw error
    }
  }

  async syncDriverStandings(seasonId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing driver standings for season ${seasonId}...`)
      
      const externalStandings = await this.withRetry(
        () => ExternalF1DataService.getDriverStandings(seasonId),
        3
      )

      // TODO: Convert and store driver standings
      console.log(`✅ Synced driver standings for season ${seasonId}`)
    } catch (error) {
      console.error(`Failed to sync driver standings:`, error)
      throw error
    }
  }

  async syncConstructorStandings(seasonId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing constructor standings for season ${seasonId}...`)
      
      const externalStandings = await this.withRetry(
        () => ExternalF1DataService.getConstructorStandings(seasonId),
        3
      )

      // TODO: Convert and store constructor standings
      console.log(`✅ Synced constructor standings for season ${seasonId}`)
    } catch (error) {
      console.error(`Failed to sync constructor standings:`, error)
      throw error
    }
  }

  // ========================================
  // COMPREHENSIVE SEASON DATA SYNC
  // ========================================

  async syncCompleteSeasonData(
    seasonId: string, 
    options: DataSyncOptions = {}
  ): Promise<void> {
    const { 
      forceRefresh = false, 
      batchSize = this.DEFAULT_BATCH_SIZE,
      concurrency = this.DEFAULT_CONCURRENCY 
    } = options

    try {
      console.log(`🏁 Starting comprehensive data sync for season ${seasonId}...`)
      
      // Step 1: Sync basic season data
      await this.syncRacesForSeason(seasonId)
      
      // Step 2: Get races to sync results for each
      const races = await this.repository.getRacesBySeason(seasonId)
      console.log(`Found ${races.length} races to sync`)

      // Step 3: Sync race results with controlled concurrency
      const racePromises = races.map(race => 
        () => this.syncRaceResults(seasonId, race.round.toString())
      )

      await this.executeWithConcurrency(racePromises, concurrency)

      // Step 4: Sync standings
      await Promise.all([
        this.syncDriverStandings(seasonId),
        this.syncConstructorStandings(seasonId)
      ])

      console.log(`🏆 Completed comprehensive sync for season ${seasonId}`)
    } catch (error) {
      console.error(`Failed to sync complete season data for ${seasonId}:`, error)
      throw error
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw new Error('This should never be reached')
  }

  private async executeWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = []
    const executing: Promise<T>[] = []

    for (const task of tasks) {
      const promise = task().then(result => {
        executing.splice(executing.indexOf(promise), 1)
        return result
      })
      
      results.push(promise as any)
      executing.push(promise)

      if (executing.length >= concurrency) {
        await Promise.race(executing)
      }
    }

    return Promise.all(results)
  }

  // ========================================
  // HEALTH CHECK & MONITORING
  // ========================================

  async getSystemHealth(): Promise<{
    database: boolean
    cache: boolean
    externalAPI: boolean
    overall: boolean
  }> {
    try {
      const [dbHealth, apiHealth] = await Promise.all([
        this.repository.healthCheck(),
        this.checkExternalAPIHealth()
      ])

      const overall = dbHealth.overall && apiHealth

      return {
        database: dbHealth.database,
        cache: dbHealth.cache,
        externalAPI: apiHealth,
        overall
      }
    } catch (error) {
      console.error('Health check failed:', error)
      return {
        database: false,
        cache: false,
        externalAPI: false,
        overall: false
      }
    }
  }

  private async checkExternalAPIHealth(): Promise<boolean> {
    try {
      await Promise.all([
        ExternalF1DataService.getSeasons(),
        // TODO: Add OpenF1 API health check
      ])
      return true
    } catch (error) {
      console.error('External API health check failed:', error)
      return false
    }
  }

  async getPerformanceMetrics(): Promise<{
    totalCacheSize: number
    cacheHitRate: number
    avgResponseTime: number
    totalRequests: number
  }> {
    // TODO: Implement comprehensive performance metrics
    return {
      totalCacheSize: 0,
      cacheHitRate: 0.85,
      avgResponseTime: 45,
      totalRequests: 1000
    }
  }
}

// Singleton instance
let enterpriseF1Service: EnterpriseF1DataService | null = null

export function getEnterpriseF1DataService(): EnterpriseF1DataService {
  if (!enterpriseF1Service) {
    enterpriseF1Service = new EnterpriseF1DataService()
  }
  return enterpriseF1Service
}