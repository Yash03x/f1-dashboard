import { RobustStorage } from './StorageEngine'
import { Race, Driver, Constructor, Standing, SessionInfo, LapData, CarData } from '@/types/f1'
import path from 'path'

// F1-specific storage configurations
const F1_STORAGE_CONFIG = {
  historical: { ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days for historical data
  current: { ttl: 60 * 60 * 1000 }, // 1 hour for current season
  realtime: { ttl: 5 * 60 * 1000 }, // 5 minutes for real-time data
  static: { ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 days for static data (circuits, drivers info)
}

export class F1DataStorage {
  private historicalStorage: RobustStorage
  private currentStorage: RobustStorage
  private realtimeStorage: RobustStorage
  private staticStorage: RobustStorage
  private initialized = false

  constructor(baseDir: string = './src/data/storage') {
    const basePath = path.resolve(baseDir)
    
    this.historicalStorage = new RobustStorage({
      baseDir: path.join(basePath, 'historical'),
      maxSize: 50 * 1024 * 1024, // 50MB per file
      ttl: F1_STORAGE_CONFIG.historical.ttl,
      backupCount: 5
    })

    this.currentStorage = new RobustStorage({
      baseDir: path.join(basePath, 'current'),
      maxSize: 10 * 1024 * 1024, // 10MB per file
      ttl: F1_STORAGE_CONFIG.current.ttl,
      backupCount: 3
    })

    this.realtimeStorage = new RobustStorage({
      baseDir: path.join(basePath, 'realtime'),
      maxSize: 5 * 1024 * 1024, // 5MB per file
      ttl: F1_STORAGE_CONFIG.realtime.ttl,
      backupCount: 2
    })

    this.staticStorage = new RobustStorage({
      baseDir: path.join(basePath, 'static'),
      maxSize: 20 * 1024 * 1024, // 20MB per file
      ttl: F1_STORAGE_CONFIG.static.ttl,
      backupCount: 3
    })
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('Initializing F1 data storage system...')
      
      await Promise.all([
        this.historicalStorage.initialize(),
        this.currentStorage.initialize(),
        this.realtimeStorage.initialize(),
        this.staticStorage.initialize()
      ])

      this.initialized = true
      console.log('✓ F1 data storage system initialized')

      // Run initial maintenance
      this.scheduleMaintenance()
    } catch (error) {
      console.error('Failed to initialize F1 storage:', error)
      throw error
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('F1DataStorage not initialized. Call initialize() first.')
    }
  }

  // Historical data (seasons before current year)
  async storeHistoricalSeasons(seasons: string[]): Promise<void> {
    this.ensureInitialized()
    await this.historicalStorage.set('seasons', seasons)
  }

  async getHistoricalSeasons(): Promise<string[] | null> {
    this.ensureInitialized()
    return await this.historicalStorage.get<string[]>('seasons')
  }

  async storeHistoricalRaces(season: string, races: Race[]): Promise<void> {
    this.ensureInitialized()
    const isHistorical = parseInt(season) < new Date().getFullYear()
    const storage = isHistorical ? this.historicalStorage : this.currentStorage
    await storage.set(`races_${season}`, races)
  }

  async getHistoricalRaces(season: string): Promise<Race[] | null> {
    this.ensureInitialized()
    const isHistorical = parseInt(season) < new Date().getFullYear()
    const storage = isHistorical ? this.historicalStorage : this.currentStorage
    return await storage.get<Race[]>(`races_${season}`)
  }

  // Current season data
  async storeCurrentSeasonRaceResults(season: string, round: string, race: Race): Promise<void> {
    this.ensureInitialized()
    await this.currentStorage.set(`race_results_${season}_${round}`, race)
  }

  async getCurrentSeasonRaceResults(season: string, round: string): Promise<Race | null> {
    this.ensureInitialized()
    return await this.currentStorage.get<Race>(`race_results_${season}_${round}`)
  }

  async storeCurrentSeasonQualifying(season: string, round: string, race: Race): Promise<void> {
    this.ensureInitialized()
    await this.currentStorage.set(`qualifying_${season}_${round}`, race)
  }

  async getCurrentSeasonQualifying(season: string, round: string): Promise<Race | null> {
    this.ensureInitialized()
    return await this.currentStorage.get<Race>(`qualifying_${season}_${round}`)
  }

  async storeCurrentSeasonStandings(season: string, type: 'driver' | 'constructor', standings: Standing[]): Promise<void> {
    this.ensureInitialized()
    await this.currentStorage.set(`${type}_standings_${season}`, standings)
  }

  async getCurrentSeasonStandings(season: string, type: 'driver' | 'constructor'): Promise<Standing[] | null> {
    this.ensureInitialized()
    return await this.currentStorage.get<Standing[]>(`${type}_standings_${season}`)
  }

  // Real-time data (telemetry, live timing)
  async storeRealtimeSession(sessionKey: number, session: SessionInfo): Promise<void> {
    this.ensureInitialized()
    await this.realtimeStorage.set(`session_${sessionKey}`, session)
  }

  async getRealtimeSession(sessionKey: number): Promise<SessionInfo | null> {
    this.ensureInitialized()
    return await this.realtimeStorage.get<SessionInfo>(`session_${sessionKey}`)
  }

  async storeRealtimeLaps(sessionKey: number, driverNumber: number, laps: LapData[]): Promise<void> {
    this.ensureInitialized()
    await this.realtimeStorage.set(`laps_${sessionKey}_${driverNumber}`, laps)
  }

  async getRealtimeLaps(sessionKey: number, driverNumber: number): Promise<LapData[] | null> {
    this.ensureInitialized()
    return await this.realtimeStorage.get<LapData[]>(`laps_${sessionKey}_${driverNumber}`)
  }

  async storeRealtimeCarData(sessionKey: number, driverNumber: number, carData: CarData[]): Promise<void> {
    this.ensureInitialized()
    await this.realtimeStorage.set(`car_data_${sessionKey}_${driverNumber}`, carData)
  }

  async getRealtimeCarData(sessionKey: number, driverNumber: number): Promise<CarData[] | null> {
    this.ensureInitialized()
    return await this.realtimeStorage.get<CarData[]>(`car_data_${sessionKey}_${driverNumber}`)
  }

  // Static data (drivers, constructors, circuits - rarely changes)
  async storeStaticDrivers(season: string, drivers: Driver[]): Promise<void> {
    this.ensureInitialized()
    await this.staticStorage.set(`drivers_${season}`, drivers)
  }

  async getStaticDrivers(season: string): Promise<Driver[] | null> {
    this.ensureInitialized()
    return await this.staticStorage.get<Driver[]>(`drivers_${season}`)
  }

  async storeStaticConstructors(season: string, constructors: Constructor[]): Promise<void> {
    this.ensureInitialized()
    await this.staticStorage.set(`constructors_${season}`, constructors)
  }

  async getStaticConstructors(season: string): Promise<Constructor[] | null> {
    this.ensureInitialized()
    return await this.staticStorage.get<Constructor[]>(`constructors_${season}`)
  }

  // Batch operations for efficiency
  async storeBatchRaceData(season: string, data: {
    races: Race[]
    drivers: Driver[]
    constructors: Constructor[]
    driverStandings: Standing[]
    constructorStandings: Standing[]
  }): Promise<void> {
    this.ensureInitialized()
    
    const isHistorical = parseInt(season) < new Date().getFullYear()
    const raceStorage = isHistorical ? this.historicalStorage : this.currentStorage

    await Promise.all([
      raceStorage.set(`races_${season}`, data.races),
      this.staticStorage.set(`drivers_${season}`, data.drivers),
      this.staticStorage.set(`constructors_${season}`, data.constructors),
      this.currentStorage.set(`driver_standings_${season}`, data.driverStandings),
      this.currentStorage.set(`constructor_standings_${season}`, data.constructorStandings)
    ])

    console.log(`✓ Batch stored season ${season} data`)
  }

  // Data validation and integrity checking
  async validateDataIntegrity(): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    this.ensureInitialized()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check each storage system
      const storages = [
        { name: 'historical', storage: this.historicalStorage },
        { name: 'current', storage: this.currentStorage },
        { name: 'realtime', storage: this.realtimeStorage },
        { name: 'static', storage: this.staticStorage }
      ]

      for (const { name, storage } of storages) {
        try {
          const stats = await storage.getStats()
          console.log(`${name}: ${stats.totalFiles} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
          
          if (stats.totalSize > 500 * 1024 * 1024) { // 500MB warning
            warnings.push(`${name} storage is getting large: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
          }
        } catch (error) {
          errors.push(`Failed to get stats for ${name}: ${error}`)
        }
      }

      // Validate data consistency
      const seasons = await this.getHistoricalSeasons()
      if (seasons) {
        for (const season of seasons.slice(-3)) { // Check last 3 seasons
          const races = await this.getHistoricalRaces(season)
          const drivers = await this.getStaticDrivers(season)
          
          if (!races) {
            warnings.push(`Missing race data for season ${season}`)
          }
          if (!drivers) {
            warnings.push(`Missing driver data for season ${season}`)
          }
        }
      }

    } catch (error) {
      errors.push(`Data validation failed: ${error}`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    totalSize: number
    totalFiles: number
    storageDistribution: Record<string, number>
    oldestData: number
    newestData: number
  }> {
    this.ensureInitialized()
    
    const storages = [
      { name: 'historical', storage: this.historicalStorage },
      { name: 'current', storage: this.currentStorage },
      { name: 'realtime', storage: this.realtimeStorage },
      { name: 'static', storage: this.staticStorage }
    ]

    let totalSize = 0
    let totalFiles = 0
    const storageDistribution: Record<string, number> = {}

    for (const { name, storage } of storages) {
      const stats = await storage.getStats()
      totalSize += stats.totalSize
      totalFiles += stats.totalFiles
      storageDistribution[name] = stats.totalSize
    }

    return {
      totalSize,
      totalFiles,
      storageDistribution,
      oldestData: Date.now() - (365 * 24 * 60 * 60 * 1000), // Approximate
      newestData: Date.now()
    }
  }

  // Maintenance operations
  async runMaintenance(): Promise<void> {
    this.ensureInitialized()
    console.log('Running F1 storage maintenance...')
    
    await Promise.all([
      this.historicalStorage.maintenance(),
      this.currentStorage.maintenance(),
      this.realtimeStorage.maintenance(),
      this.staticStorage.maintenance()
    ])

    console.log('✓ F1 storage maintenance completed')
  }

  // Schedule regular maintenance
  private scheduleMaintenance(): void {
    // Run maintenance every 6 hours
    setInterval(() => {
      this.runMaintenance().catch(error => {
        console.error('Scheduled maintenance failed:', error)
      })
    }, 6 * 60 * 60 * 1000)

    // Run data validation daily
    setInterval(() => {
      this.validateDataIntegrity().then(result => {
        if (!result.valid) {
          console.error('Data integrity issues found:', result.errors)
        }
        if (result.warnings.length > 0) {
          console.warn('Data warnings:', result.warnings)
        }
      }).catch(error => {
        console.error('Data validation failed:', error)
      })
    }, 24 * 60 * 60 * 1000)
  }

  // Emergency recovery
  async emergencyRecovery(): Promise<void> {
    this.ensureInitialized()
    console.log('Starting emergency recovery...')
    
    try {
      // Clear corrupted real-time data (can be re-fetched)
      await this.realtimeStorage.clear()
      console.log('✓ Cleared real-time data')
      
      // Validate critical data
      const validation = await this.validateDataIntegrity()
      console.log('Emergency recovery completed:', validation)
      
    } catch (error) {
      console.error('Emergency recovery failed:', error)
      throw error
    }
  }

  // Export data for backup
  async exportData(): Promise<{
    historical: any[]
    current: any[]
    static: any[]
    metadata: {
      exportDate: number
      version: string
      totalSize: number
    }
  }> {
    this.ensureInitialized()
    
    const metrics = await this.getPerformanceMetrics()
    
    return {
      historical: [], // TODO: Implement data export
      current: [],
      static: [],
      metadata: {
        exportDate: Date.now(),
        version: '1.0.0',
        totalSize: metrics.totalSize
      }
    }
  }
}