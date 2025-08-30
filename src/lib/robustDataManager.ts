import { F1DataService, OpenF1Service } from './api'
import { getF1Storage } from './storage'
import { Race, Driver, Constructor, Standing, SessionInfo, LapData, CarData } from '@/types/f1'

// Circuit breaker pattern for API resilience
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private readonly failureThreshold = 5
  private readonly recoveryTimeout = 60000 // 1 minute

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN - API temporarily unavailable')
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private isOpen(): boolean {
    return this.failureCount >= this.failureThreshold &&
           Date.now() - this.lastFailureTime < this.recoveryTimeout
  }

  private onSuccess(): void {
    this.failureCount = 0
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
  }

  getStatus(): { isOpen: boolean; failureCount: number; lastFailureTime: number } {
    return {
      isOpen: this.isOpen(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Retry mechanism with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
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

export class RobustF1DataManager {
  private storage = getF1Storage()
  private primaryCircuitBreaker = new CircuitBreaker()
  private fallbackCircuitBreaker = new CircuitBreaker()
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      await this.storage.initialize()
      this.initialized = true
      console.log('✓ Robust F1 Data Manager initialized')
    } catch (error) {
      console.error('Failed to initialize RobustF1DataManager:', error)
      throw error
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RobustF1DataManager not initialized. Call initialize() first.')
    }
  }

  // Robust data fetching with fallbacks
  private async fetchWithFallback<T>(
    primaryFetch: () => Promise<T>,
    fallbackFetch?: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    // Try primary API with circuit breaker
    try {
      return await this.primaryCircuitBreaker.execute(primaryFetch)
    } catch (primaryError) {
      console.warn('Primary API failed:', primaryError.message)

      // Try fallback API if available
      if (fallbackFetch) {
        try {
          return await this.fallbackCircuitBreaker.execute(fallbackFetch)
        } catch (fallbackError) {
          console.warn('Fallback API failed:', fallbackError.message)
        }
      }

      // Last resort: try to return stale cached data
      if (cacheKey) {
        console.log('Attempting to return stale cached data...')
        // TODO: Implement stale data retrieval
      }

      throw new Error(`All data sources failed. Primary: ${primaryError.message}`)
    }
  }

  // Seasons with comprehensive error handling
  async getSeasons(): Promise<string[]> {
    this.ensureInitialized()

    try {
      // Check cache first
      let seasons = await this.storage.getHistoricalSeasons()
      
      if (!seasons) {
        // Fetch with retry and fallback
        seasons = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getSeasons(),
            undefined, // No fallback for seasons
            'seasons'
          )
        })
        
        // Store in cache
        await this.storage.storeHistoricalSeasons(seasons)
      }
      
      return seasons
    } catch (error) {
      console.error('Failed to get seasons:', error)
      
      // Return fallback data if available
      const fallbackSeasons = Array.from(
        { length: new Date().getFullYear() - 1950 + 1 }, 
        (_, i) => (1950 + i).toString()
      )
      
      console.log('Returning generated season list as fallback')
      return fallbackSeasons
    }
  }

  // Races with comprehensive caching and error handling
  async getRaces(season: string): Promise<Race[]> {
    this.ensureInitialized()

    try {
      // Check cache first
      let races = await this.storage.getHistoricalRaces(season)
      
      if (!races) {
        // Fetch with retry and circuit breaker
        races = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getRaces(season),
            undefined,
            `races_${season}`
          )
        })
        
        // Store in appropriate cache tier
        await this.storage.storeHistoricalRaces(season, races)
      }
      
      return races
    } catch (error) {
      console.error(`Failed to get races for season ${season}:`, error)
      throw new Error(`Unable to load races for ${season}: ${error.message}`)
    }
  }

  // Race results with intelligent caching
  async getRaceResults(season: string, round: string): Promise<Race> {
    this.ensureInitialized()

    try {
      // Check cache first
      let race = await this.storage.getCurrentSeasonRaceResults(season, round)
      
      if (!race) {
        race = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getRaceResults(season, round),
            undefined,
            `race_results_${season}_${round}`
          )
        })
        
        await this.storage.storeCurrentSeasonRaceResults(season, round, race)
      }
      
      return race
    } catch (error) {
      console.error(`Failed to get race results for ${season}/${round}:`, error)
      throw new Error(`Unable to load race results for ${season}/${round}: ${error.message}`)
    }
  }

  // Driver standings with real-time updates
  async getDriverStandings(season: string, round?: string): Promise<Standing[]> {
    this.ensureInitialized()

    try {
      // For current season, use shorter cache
      const isCurrentSeason = parseInt(season) === new Date().getFullYear()
      
      let standings = await this.storage.getCurrentSeasonStandings(season, 'driver')
      
      // If current season and no cache, or cache is old, fetch fresh data
      if (!standings || isCurrentSeason) {
        standings = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getDriverStandings(season, round),
            undefined,
            `driver_standings_${season}`
          )
        })
        
        await this.storage.storeCurrentSeasonStandings(season, 'driver', standings)
      }
      
      return standings
    } catch (error) {
      console.error(`Failed to get driver standings for season ${season}:`, error)
      throw new Error(`Unable to load driver standings for ${season}: ${error.message}`)
    }
  }

  // Constructor standings
  async getConstructorStandings(season: string, round?: string): Promise<Standing[]> {
    this.ensureInitialized()

    try {
      let standings = await this.storage.getCurrentSeasonStandings(season, 'constructor')
      
      if (!standings) {
        standings = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getConstructorStandings(season, round),
            undefined,
            `constructor_standings_${season}`
          )
        })
        
        await this.storage.storeCurrentSeasonStandings(season, 'constructor', standings)
      }
      
      return standings
    } catch (error) {
      console.error(`Failed to get constructor standings for season ${season}:`, error)
      throw new Error(`Unable to load constructor standings for ${season}: ${error.message}`)
    }
  }

  // Static data with long-term caching
  async getDrivers(season: string): Promise<Driver[]> {
    this.ensureInitialized()

    try {
      let drivers = await this.storage.getStaticDrivers(season)
      
      if (!drivers) {
        drivers = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getDrivers(season),
            undefined,
            `drivers_${season}`
          )
        })
        
        await this.storage.storeStaticDrivers(season, drivers)
      }
      
      return drivers
    } catch (error) {
      console.error(`Failed to get drivers for season ${season}:`, error)
      throw new Error(`Unable to load drivers for ${season}: ${error.message}`)
    }
  }

  async getConstructors(season: string): Promise<Constructor[]> {
    this.ensureInitialized()

    try {
      let constructors = await this.storage.getStaticConstructors(season)
      
      if (!constructors) {
        constructors = await withRetry(async () => {
          return await this.fetchWithFallback(
            () => F1DataService.getConstructors(season),
            undefined,
            `constructors_${season}`
          )
        })
        
        await this.storage.storeStaticConstructors(season, constructors)
      }
      
      return constructors
    } catch (error) {
      console.error(`Failed to get constructors for season ${season}:`, error)
      throw new Error(`Unable to load constructors for ${season}: ${error.message}`)
    }
  }

  // Real-time data with special handling
  async getSessions(year: number): Promise<SessionInfo[]> {
    this.ensureInitialized()

    try {
      return await withRetry(async () => {
        return await this.fetchWithFallback(
          () => OpenF1Service.getSessions(year),
          undefined,
          `sessions_${year}`
        )
      })
    } catch (error) {
      console.error(`Failed to get sessions for year ${year}:`, error)
      return [] // Return empty array for real-time data failures
    }
  }

  // Batch operations for efficiency
  async preloadSeasonData(season: string, options: {
    includeRealtime?: boolean
    forceRefresh?: boolean
  } = {}): Promise<void> {
    this.ensureInitialized()

    try {
      console.log(`🏁 Preloading comprehensive data for season ${season}...`)
      
      // Clear cache if force refresh
      if (options.forceRefresh) {
        console.log('Force refresh enabled - clearing relevant cache')
        // TODO: Implement selective cache clearing
      }

      // Load basic season data in parallel
      const [races, drivers, constructors] = await Promise.all([
        this.getRaces(season).catch(error => {
          console.error(`Failed to preload races for ${season}:`, error)
          return []
        }),
        this.getDrivers(season).catch(error => {
          console.error(`Failed to preload drivers for ${season}:`, error)
          return []
        }),
        this.getConstructors(season).catch(error => {
          console.error(`Failed to preload constructors for ${season}:`, error)
          return []
        })
      ])

      // Load standings
      const [driverStandings, constructorStandings] = await Promise.all([
        this.getDriverStandings(season).catch(error => {
          console.error(`Failed to preload driver standings for ${season}:`, error)
          return []
        }),
        this.getConstructorStandings(season).catch(error => {
          console.error(`Failed to preload constructor standings for ${season}:`, error)
          return []
        })
      ])

      // Store as batch for efficiency
      await this.storage.storeBatchRaceData(season, {
        races,
        drivers,
        constructors,
        driverStandings,
        constructorStandings
      })

      console.log(`✓ Preloaded season ${season}: ${races.length} races, ${drivers.length} drivers, ${constructors.length} constructors`)

      // Load race-specific data with controlled concurrency
      if (races.length > 0) {
        console.log(`Loading race results for ${races.length} races...`)
        
        // Process races in batches to avoid overwhelming APIs
        const batchSize = 3
        for (let i = 0; i < races.length; i += batchSize) {
          const batch = races.slice(i, i + batchSize)
          
          await Promise.all(
            batch.map(async (race) => {
              try {
                await Promise.all([
                  this.getRaceResults(season, race.round),
                  // TODO: Add qualifying and other race data
                ])
                
                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 200))
              } catch (error) {
                console.error(`Failed to load race ${race.round}:`, error)
              }
            })
          )
          
          console.log(`✓ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(races.length / batchSize)}`)
        }
      }

      console.log(`🏆 Completed preloading season ${season}`)
    } catch (error) {
      console.error(`Failed to preload season ${season}:`, error)
      throw error
    }
  }

  // Health check and diagnostics
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'critical'
    services: {
      storage: boolean
      primaryAPI: boolean
      fallbackAPI: boolean
    }
    metrics: {
      totalCacheSize: number
      totalCacheFiles: number
      cacheHitRate: number
    }
    circuitBreakers: {
      primary: ReturnType<CircuitBreaker['getStatus']>
      fallback: ReturnType<CircuitBreaker['getStatus']>
    }
  }> {
    this.ensureInitialized()

    try {
      // Check storage health
      const storageHealth = await this.storage.validateDataIntegrity()
      const metrics = await this.storage.getPerformanceMetrics()
      
      // Test API connectivity
      let primaryAPIHealth = false
      let fallbackAPIHealth = false
      
      try {
        await F1DataService.getSeasons()
        primaryAPIHealth = true
      } catch {}
      
      // Determine overall status
      let status: 'healthy' | 'degraded' | 'critical'
      if (storageHealth.valid && primaryAPIHealth) {
        status = 'healthy'
      } else if (storageHealth.valid || primaryAPIHealth) {
        status = 'degraded'
      } else {
        status = 'critical'
      }

      return {
        status,
        services: {
          storage: storageHealth.valid,
          primaryAPI: primaryAPIHealth,
          fallbackAPI: fallbackAPIHealth
        },
        metrics: {
          totalCacheSize: metrics.totalSize,
          totalCacheFiles: metrics.totalFiles,
          cacheHitRate: 0.85 // TODO: Implement actual cache hit rate tracking
        },
        circuitBreakers: {
          primary: this.primaryCircuitBreaker.getStatus(),
          fallback: this.fallbackCircuitBreaker.getStatus()
        }
      }
    } catch (error) {
      console.error('Health check failed:', error)
      
      return {
        status: 'critical',
        services: { storage: false, primaryAPI: false, fallbackAPI: false },
        metrics: { totalCacheSize: 0, totalCacheFiles: 0, cacheHitRate: 0 },
        circuitBreakers: {
          primary: this.primaryCircuitBreaker.getStatus(),
          fallback: this.fallbackCircuitBreaker.getStatus()
        }
      }
    }
  }

  // Emergency operations
  async emergencyRecovery(): Promise<void> {
    this.ensureInitialized()
    await this.storage.emergencyRecovery()
  }

  async runMaintenance(): Promise<void> {
    this.ensureInitialized()
    await this.storage.runMaintenance()
  }
}

// Create singleton instance
let robustManager: RobustF1DataManager | null = null

export function getRobustF1DataManager(): RobustF1DataManager {
  if (!robustManager) {
    robustManager = new RobustF1DataManager()
  }
  return robustManager
}

export async function initializeRobustF1DataManager(): Promise<RobustF1DataManager> {
  const manager = getRobustF1DataManager()
  await manager.initialize()
  return manager
}