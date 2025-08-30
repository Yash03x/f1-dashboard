import { f1Repository } from '../database/repositories/F1Repository'
import { 
  Season, 
  Race, 
  Driver, 
  Constructor, 
  DriverStanding, 
  ConstructorStanding 
} from '@/types/f1'

interface SyncOptions {
  forceRefresh?: boolean
  batchSize?: number
  concurrency?: number
}

export class F1DataSyncService {
  private readonly DEFAULT_BATCH_SIZE = 50
  private readonly DEFAULT_CONCURRENCY = 5

  // ========================================
  // EXTERNAL API CLIENT
  // ========================================
  
  private async fetchFromExternalAPI(endpoint: string): Promise<any> {
    const baseUrl = 'https://ergast.com/api/f1'
    const url = `${baseUrl}/${endpoint}.json`
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'F1-Dashboard/1.0 (Enterprise Data Sync)'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.MRData
    } catch (error) {
      console.error(`Failed to fetch from ${endpoint}:`, error)
      throw error
    }
  }

  // ========================================
  // SEASON SYNC
  // ========================================
  
  async syncSeasons(): Promise<void> {
    const logId = await f1Repository.logDataSync('seasons')
    
    try {
      console.log('🔄 Syncing seasons...')
      
      const data = await this.fetchFromExternalAPI('seasons')
      const seasons = data.SeasonTable.Seasons
      
      let recordsCreated = 0
      let recordsUpdated = 0
      
      for (const seasonData of seasons) {
        const season: Omit<Season, 'created_at' | 'updated_at'> = {
          id: seasonData.season,
          year: parseInt(seasonData.season),
          name: `${seasonData.season} Formula 1 World Championship`,
          data_completeness: 0.0,
          is_active: seasonData.season === '2024'
        }
        
        try {
          await f1Repository.createSeason(season)
          recordsCreated++
        } catch (error: any) {
          if (error.code === '23505') { // Unique constraint violation
            // Season already exists, update if needed
            const existing = await f1Repository.getSeasonById(season.id)
            if (existing && !existing.is_active && season.is_active) {
              await f1Repository.updateSeasonSync(season.id, existing.data_completeness)
              recordsUpdated++
            }
          } else {
            throw error
          }
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', recordsCreated + recordsUpdated)
      console.log(`✅ Synced ${recordsCreated} new seasons, updated ${recordsUpdated}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // RACES SYNC
  // ========================================
  
  async syncRacesForSeason(seasonId: string): Promise<void> {
    const logId = await f1Repository.logDataSync('races', seasonId)
    
    try {
      console.log(`🔄 Syncing races for season ${seasonId}...`)
      
      const data = await this.fetchFromExternalAPI(`${seasonId}`)
      const races = data.RaceTable.Races
      
      let recordsCreated = 0
      
      for (const raceData of races) {
        // First, ensure circuit exists
        await this.ensureCircuitExists(raceData.Circuit)
        
        const race: Omit<Race, 'id' | 'created_at' | 'updated_at'> = {
          season_id: seasonId,
          circuit_id: raceData.Circuit.circuitId,
          round: parseInt(raceData.round),
          race_name: raceData.raceName,
          race_date: new Date(raceData.date),
          qualifying_date: raceData.Qualifying ? new Date(raceData.Qualifying.date) : undefined,
          sprint_date: raceData.Sprint ? new Date(raceData.Sprint.date) : undefined,
          status: 'scheduled'
        }
        
        try {
          await f1Repository.createRace(race)
          recordsCreated++
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore unique constraint violations
            console.error(`Failed to create race ${race.race_name}:`, error)
          }
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', recordsCreated)
      console.log(`✅ Synced ${recordsCreated} races for season ${seasonId}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // DRIVERS SYNC
  // ========================================
  
  async syncDriversForSeason(seasonId: string): Promise<void> {
    const logId = await f1Repository.logDataSync('drivers', seasonId)
    
    try {
      console.log(`🔄 Syncing drivers for season ${seasonId}...`)
      
      const data = await this.fetchFromExternalAPI(`${seasonId}/drivers`)
      const drivers = data.DriverTable.Drivers
      
      let recordsCreated = 0
      
      for (const driverData of drivers) {
        const driver: Omit<Driver, 'created_at' | 'updated_at'> = {
          id: driverData.driverId,
          driver_code: driverData.code,
          first_name: driverData.givenName,
          last_name: driverData.familyName,
          nationality: driverData.nationality,
          date_of_birth: driverData.dateOfBirth ? new Date(driverData.dateOfBirth) : undefined,
          url: driverData.url,
          is_active: true
        }
        
        try {
          await f1Repository.createDriver(driver)
          recordsCreated++
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore unique constraint violations
            console.error(`Failed to create driver ${driver.first_name} ${driver.last_name}:`, error)
          }
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', recordsCreated)
      console.log(`✅ Synced ${recordsCreated} drivers for season ${seasonId}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // CONSTRUCTORS SYNC
  // ========================================
  
  async syncConstructorsForSeason(seasonId: string): Promise<void> {
    const logId = await f1Repository.logDataSync('constructors', seasonId)
    
    try {
      console.log(`🔄 Syncing constructors for season ${seasonId}...`)
      
      const data = await this.fetchFromExternalAPI(`${seasonId}/constructors`)
      const constructors = data.ConstructorTable.Constructors
      
      let recordsCreated = 0
      
      for (const constructorData of constructors) {
        const constructor: Omit<Constructor, 'created_at' | 'updated_at'> = {
          id: constructorData.constructorId,
          name: constructorData.name,
          nationality: constructorData.nationality,
          url: constructorData.url,
          is_active: true
        }
        
        try {
          await f1Repository.createConstructor(constructor)
          recordsCreated++
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore unique constraint violations
            console.error(`Failed to create constructor ${constructor.name}:`, error)
          }
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', recordsCreated)
      console.log(`✅ Synced ${recordsCreated} constructors for season ${seasonId}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // RACE RESULTS SYNC
  // ========================================
  
  async syncRaceResults(seasonId: string, round: number): Promise<void> {
    const logId = await f1Repository.logDataSync('race_results', seasonId, round)
    
    try {
      console.log(`🔄 Syncing race results for ${seasonId} round ${round}...`)
      
      const data = await this.fetchFromExternalAPI(`${seasonId}/${round}/results`)
      const results = data.RaceTable.Races[0]?.Results || []
      
      if (results.length > 0) {
        const race = await f1Repository.getRaceById(round)
        if (race) {
          const transformedResults = results.map((result: any) => ({
            position: parseInt(result.position),
            driver_id: result.Driver.driverId,
            constructor_id: result.Constructor.constructorId,
            driver_name: `${result.Driver.givenName} ${result.Driver.familyName}`,
            constructor_name: result.Constructor.name,
            grid: parseInt(result.grid),
            laps: parseInt(result.laps),
            status: result.status,
            time: result.Time?.time,
            points: parseFloat(result.points),
            fastest_lap: result.FastestLap?.Time?.time,
            fastest_lap_rank: result.FastestLap?.rank ? parseInt(result.FastestLap.rank) : undefined
          }))
          
          await f1Repository.updateRaceResults(race.id, transformedResults)
          
          // Update race status
          await f1Repository.query(`
            UPDATE races SET status = 'completed', updated_at = NOW() WHERE id = $1
          `, [race.id])
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', results.length)
      console.log(`✅ Synced ${results.length} race results for ${seasonId} round ${round}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // QUALIFYING RESULTS SYNC
  // ========================================
  
  async syncQualifyingResults(seasonId: string, round: number): Promise<void> {
    const logId = await f1Repository.logDataSync('qualifying_results', seasonId, round)
    
    try {
      console.log(`🔄 Syncing qualifying results for ${seasonId} round ${round}...`)
      
      const data = await this.fetchFromExternalAPI(`${seasonId}/${round}/qualifying`)
      const results = data.RaceTable.Races[0]?.QualifyingResults || []
      
      if (results.length > 0) {
        const race = await f1Repository.getRaceById(round)
        if (race) {
          const transformedResults = results.map((result: any) => ({
            position: parseInt(result.position),
            driver_id: result.Driver.driverId,
            constructor_id: result.Constructor.constructorId,
            driver_name: `${result.Driver.givenName} ${result.Driver.familyName}`,
            constructor_name: result.Constructor.name,
            q1: result.Q1,
            q2: result.Q2,
            q3: result.Q3
          }))
          
          await f1Repository.updateQualifyingResults(race.id, transformedResults)
        }
      }
      
      await f1Repository.updateDataSyncLog(logId, 'completed', results.length)
      console.log(`✅ Synced ${results.length} qualifying results for ${seasonId} round ${round}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // STANDINGS SYNC
  // ========================================
  
  async syncDriverStandings(seasonId: string, round?: number): Promise<void> {
    const logId = await f1Repository.logDataSync('driver_standings', seasonId, round)
    
    try {
      console.log(`🔄 Syncing driver standings for ${seasonId}...`)
      
      const endpoint = round ? `${seasonId}/${round}/driverStandings` : `${seasonId}/driverStandings`
      const data = await this.fetchFromExternalAPI(endpoint)
      const standings = data.StandingsTable.StandingsLists[0]?.DriverStandings || []
      
      const transformedStandings = standings.map((standing: any) => ({
        season_id: seasonId,
        race_id: round || 1, // Default to 1 if no round specified
        driver_id: standing.Driver.driverId,
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        podiums: 0, // Not provided by API, would need calculation
        fastest_laps: 0, // Not provided by API, would need calculation
        races_entered: 0, // Not provided by API, would need calculation
        races_finished: 0, // Not provided by API, would need calculation
        dnf_count: 0 // Not provided by API, would need calculation
      }))
      
      await f1Repository.updateDriverStandings(transformedStandings)
      
      await f1Repository.updateDataSyncLog(logId, 'completed', standings.length)
      console.log(`✅ Synced ${standings.length} driver standings for ${seasonId}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  async syncConstructorStandings(seasonId: string, round?: number): Promise<void> {
    const logId = await f1Repository.logDataSync('constructor_standings', seasonId, round)
    
    try {
      console.log(`🔄 Syncing constructor standings for ${seasonId}...`)
      
      const endpoint = round ? `${seasonId}/${round}/constructorStandings` : `${seasonId}/constructorStandings`
      const data = await this.fetchFromExternalAPI(endpoint)
      const standings = data.StandingsTable.StandingsLists[0]?.ConstructorStandings || []
      
      const transformedStandings = standings.map((standing: any) => ({
        season_id: seasonId,
        race_id: round || 1, // Default to 1 if no round specified
        constructor_id: standing.Constructor.constructorId,
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        podiums: 0, // Not provided by API, would need calculation
        fastest_laps: 0, // Not provided by API, would need calculation
        races_entered: 0, // Not provided by API, would need calculation
        races_finished: 0, // Not provided by API, would need calculation
        dnf_count: 0 // Not provided by API, would need calculation
      }))
      
      await f1Repository.updateConstructorStandings(transformedStandings)
      
      await f1Repository.updateDataSyncLog(logId, 'completed', standings.length)
      console.log(`✅ Synced ${standings.length} constructor standings for ${seasonId}`)
      
    } catch (error) {
      await f1Repository.updateDataSyncLog(logId, 'failed', 0, error.message)
      throw error
    }
  }

  // ========================================
  // COMPREHENSIVE SEASON SYNC
  // ========================================
  
  async syncCompleteSeasonData(seasonId: string, options: SyncOptions = {}): Promise<void> {
    const { forceRefresh = false, batchSize = this.DEFAULT_BATCH_SIZE, concurrency = this.DEFAULT_CONCURRENCY } = options
    
    try {
      console.log(`🏁 Starting comprehensive data sync for season ${seasonId}...`)
      
      // Step 1: Sync basic season data
      await this.syncSeasons()
      await this.syncRacesForSeason(seasonId)
      await this.syncDriversForSeason(seasonId)
      await this.syncConstructorsForSeason(seasonId)
      
      // Step 2: Get races to sync results for each
      const races = await f1Repository.getRacesBySeason(seasonId)
      console.log(`Found ${races.length} races to sync`)
      
      // Step 3: Sync race results with controlled concurrency
      const racePromises = races.map(race => 
        () => this.syncRaceResults(seasonId, race.round)
      )
      
      await this.executeWithConcurrency(racePromises, concurrency)
      
      // Step 4: Sync qualifying results
      const qualifyingPromises = races.map(race => 
        () => this.syncQualifyingResults(seasonId, race.round)
      )
      
      await this.executeWithConcurrency(qualifyingPromises, concurrency)
      
      // Step 5: Sync standings
      await Promise.all([
        this.syncDriverStandings(seasonId),
        this.syncConstructorStandings(seasonId)
      ])
      
      // Step 6: Update season completeness
      await this.updateSeasonCompleteness(seasonId)
      
      console.log(`🏆 Completed comprehensive sync for season ${seasonId}`)
      
    } catch (error) {
      console.error(`Failed to sync complete season data for ${seasonId}:`, error)
      throw error
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
  
  private async ensureCircuitExists(circuitData: any): Promise<void> {
    try {
      await f1Repository.query(`
        INSERT INTO circuits (id, name, location, country, latitude, longitude, url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        circuitData.circuitId,
        circuitData.circuitName,
        circuitData.Location.locality,
        circuitData.Location.country,
        parseFloat(circuitData.Location.lat),
        parseFloat(circuitData.Location.long),
        circuitData.url
      ])
    } catch (error) {
      console.error(`Failed to ensure circuit exists: ${circuitData.circuitName}`, error)
    }
  }

  private async executeWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    concurrency: number
  ): Promise<T[]> {
    const results: T[] = []
    const executing: Promise<void>[] = []
    
    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result)
      })
      
      executing.push(promise)
      
      if (executing.length >= concurrency) {
        await Promise.race(executing)
        executing.splice(executing.findIndex(p => p === promise), 1)
      }
    }
    
    await Promise.all(executing)
    return results
  }

  private async updateSeasonCompleteness(seasonId: string): Promise<void> {
    try {
      await f1Repository.query(`
        SELECT calculate_season_completeness($1)
      `, [seasonId])
    } catch (error) {
      console.error(`Failed to update season completeness for ${seasonId}:`, error)
    }
  }
}

// Export singleton instance
export const f1DataSyncService = new F1DataSyncService()
