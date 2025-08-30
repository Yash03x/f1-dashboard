import fs from 'fs/promises'
import path from 'path'
import { Race, Driver, Constructor, Standing } from '@/types/f1'

// Cache directory configuration
const CACHE_DIR = path.join(process.cwd(), 'src/data/cache')
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating cache directory:', error)
  }
}

// Cache key generators
function getCacheKey(type: string, ...params: string[]): string {
  return `${type}_${params.join('_')}.json`
}

// Generic cache operations
export class DataCache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      await ensureCacheDir()
      const filePath = path.join(CACHE_DIR, key)
      
      // Check if file exists
      try {
        const stats = await fs.stat(filePath)
        const now = Date.now()
        
        // Check if cache is expired
        if (now - stats.mtime.getTime() > CACHE_DURATION) {
          await fs.unlink(filePath)
          return null
        }
      } catch {
        return null
      }
      
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data) as T
    } catch (error) {
      console.error(`Error reading cache for key ${key}:`, error)
      return null
    }
  }

  static async set<T>(key: string, data: T): Promise<void> {
    try {
      await ensureCacheDir()
      const filePath = path.join(CACHE_DIR, key)
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`Error writing cache for key ${key}:`, error)
    }
  }

  static async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(CACHE_DIR, key)
      await fs.unlink(filePath)
    } catch (error) {
      // File might not exist, which is fine
    }
  }

  static async clear(): Promise<void> {
    try {
      const files = await fs.readdir(CACHE_DIR)
      await Promise.all(files.map(file => fs.unlink(path.join(CACHE_DIR, file))))
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Specific cache methods for F1 data
  static async getSeasons(): Promise<string[] | null> {
    return this.get<string[]>(getCacheKey('seasons'))
  }

  static async setSeasons(seasons: string[]): Promise<void> {
    await this.set(getCacheKey('seasons'), seasons)
  }

  static async getRaces(season: string): Promise<Race[] | null> {
    return this.get<Race[]>(getCacheKey('races', season))
  }

  static async setRaces(season: string, races: Race[]): Promise<void> {
    await this.set(getCacheKey('races', season), races)
  }

  static async getRaceResults(season: string, round: string): Promise<Race | null> {
    return this.get<Race>(getCacheKey('results', season, round))
  }

  static async setRaceResults(season: string, round: string, race: Race): Promise<void> {
    await this.set(getCacheKey('results', season, round), race)
  }

  static async getQualifyingResults(season: string, round: string): Promise<Race | null> {
    return this.get<Race>(getCacheKey('qualifying', season, round))
  }

  static async setQualifyingResults(season: string, round: string, race: Race): Promise<void> {
    await this.set(getCacheKey('qualifying', season, round), race)
  }

  static async getDriverStandings(season: string, round?: string): Promise<Standing[] | null> {
    const key = round 
      ? getCacheKey('driver-standings', season, round)
      : getCacheKey('driver-standings', season)
    return this.get<Standing[]>(key)
  }

  static async setDriverStandings(season: string, standings: Standing[], round?: string): Promise<void> {
    const key = round 
      ? getCacheKey('driver-standings', season, round)
      : getCacheKey('driver-standings', season)
    await this.set(key, standings)
  }

  static async getConstructorStandings(season: string, round?: string): Promise<Standing[] | null> {
    const key = round 
      ? getCacheKey('constructor-standings', season, round)
      : getCacheKey('constructor-standings', season)
    return this.get<Standing[]>(key)
  }

  static async setConstructorStandings(season: string, standings: Standing[], round?: string): Promise<void> {
    const key = round 
      ? getCacheKey('constructor-standings', season, round)
      : getCacheKey('constructor-standings', season)
    await this.set(key, standings)
  }

  static async getDrivers(season: string): Promise<Driver[] | null> {
    return this.get<Driver[]>(getCacheKey('drivers', season))
  }

  static async setDrivers(season: string, drivers: Driver[]): Promise<void> {
    await this.set(getCacheKey('drivers', season), drivers)
  }

  static async getConstructors(season: string): Promise<Constructor[] | null> {
    return this.get<Constructor[]>(getCacheKey('constructors', season))
  }

  static async setConstructors(season: string, constructors: Constructor[]): Promise<void> {
    await this.set(getCacheKey('constructors', season), constructors)
  }

  static async getLapTimes(season: string, round: string): Promise<any | null> {
    return this.get<any>(getCacheKey('laps', season, round))
  }

  static async setLapTimes(season: string, round: string, laps: any): Promise<void> {
    await this.set(getCacheKey('laps', season, round), laps)
  }
}