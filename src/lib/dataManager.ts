import { F1DataService, OpenF1Service } from './api'
import { DataCache } from './dataCache'
import { Race, Driver, Constructor, Standing, SessionInfo, LapData, CarData } from '@/types/f1'

// Main data manager that handles caching and API calls
export class F1DataManager {
  // Get seasons with caching
  static async getSeasons(): Promise<string[]> {
    try {
      // Try cache first
      let seasons = await DataCache.getSeasons()
      
      if (!seasons) {
        // Fetch from API if not in cache
        seasons = await F1DataService.getSeasons()
        await DataCache.setSeasons(seasons)
      }
      
      return seasons
    } catch (error) {
      console.error('Error in getSeasons:', error)
      throw error
    }
  }

  // Get races for a season with caching
  static async getRaces(season: string): Promise<Race[]> {
    try {
      let races = await DataCache.getRaces(season)
      
      if (!races) {
        races = await F1DataService.getRaces(season)
        await DataCache.setRaces(season, races)
      }
      
      return races
    } catch (error) {
      console.error(`Error in getRaces for season ${season}:`, error)
      throw error
    }
  }

  // Get race results with caching
  static async getRaceResults(season: string, round: string): Promise<Race> {
    try {
      let race = await DataCache.getRaceResults(season, round)
      
      if (!race) {
        race = await F1DataService.getRaceResults(season, round)
        await DataCache.setRaceResults(season, round, race)
      }
      
      return race
    } catch (error) {
      console.error(`Error in getRaceResults for ${season}/${round}:`, error)
      throw error
    }
  }

  // Get qualifying results with caching
  static async getQualifyingResults(season: string, round: string): Promise<Race> {
    try {
      let race = await DataCache.getQualifyingResults(season, round)
      
      if (!race) {
        race = await F1DataService.getQualifyingResults(season, round)
        await DataCache.setQualifyingResults(season, round, race)
      }
      
      return race
    } catch (error) {
      console.error(`Error in getQualifyingResults for ${season}/${round}:`, error)
      throw error
    }
  }

  // Get driver standings with caching
  static async getDriverStandings(season: string, round?: string): Promise<Standing[]> {
    try {
      let standings = await DataCache.getDriverStandings(season, round)
      
      if (!standings) {
        standings = await F1DataService.getDriverStandings(season, round)
        await DataCache.setDriverStandings(season, standings, round)
      }
      
      return standings
    } catch (error) {
      console.error(`Error in getDriverStandings for season ${season}:`, error)
      throw error
    }
  }

  // Get constructor standings with caching
  static async getConstructorStandings(season: string, round?: string): Promise<Standing[]> {
    try {
      let standings = await DataCache.getConstructorStandings(season, round)
      
      if (!standings) {
        standings = await F1DataService.getConstructorStandings(season, round)
        await DataCache.setConstructorStandings(season, standings, round)
      }
      
      return standings
    } catch (error) {
      console.error(`Error in getConstructorStandings for season ${season}:`, error)
      throw error
    }
  }

  // Get drivers with caching
  static async getDrivers(season: string): Promise<Driver[]> {
    try {
      let drivers = await DataCache.getDrivers(season)
      
      if (!drivers) {
        drivers = await F1DataService.getDrivers(season)
        await DataCache.setDrivers(season, drivers)
      }
      
      return drivers
    } catch (error) {
      console.error(`Error in getDrivers for season ${season}:`, error)
      throw error
    }
  }

  // Get constructors with caching
  static async getConstructors(season: string): Promise<Constructor[]> {
    try {
      let constructors = await DataCache.getConstructors(season)
      
      if (!constructors) {
        constructors = await F1DataService.getConstructors(season)
        await DataCache.setConstructors(season, constructors)
      }
      
      return constructors
    } catch (error) {
      console.error(`Error in getConstructors for season ${season}:`, error)
      throw error
    }
  }

  // Get lap times with caching
  static async getLapTimes(season: string, round: string): Promise<any> {
    try {
      let laps = await DataCache.getLapTimes(season, round)
      
      if (!laps) {
        laps = await F1DataService.getLapTimes(season, round)
        await DataCache.setLapTimes(season, round, laps)
      }
      
      return laps
    } catch (error) {
      console.error(`Error in getLapTimes for ${season}/${round}:`, error)
      throw error
    }
  }

  // OpenF1 methods (these typically won't be cached as heavily since they're more real-time)
  static async getSessions(year: number): Promise<SessionInfo[]> {
    try {
      return await OpenF1Service.getSessions(year)
    } catch (error) {
      console.error(`Error in getSessions for year ${year}:`, error)
      throw error
    }
  }

  static async getLaps(sessionKey: number, driverNumber?: number): Promise<LapData[]> {
    try {
      return await OpenF1Service.getLaps(sessionKey, driverNumber)
    } catch (error) {
      console.error(`Error in getLaps for session ${sessionKey}:`, error)
      throw error
    }
  }

  static async getCarData(sessionKey: number, driverNumber?: number): Promise<CarData[]> {
    try {
      return await OpenF1Service.getCarData(sessionKey, driverNumber)
    } catch (error) {
      console.error(`Error in getCarData for session ${sessionKey}:`, error)
      throw error
    }
  }

  static async getPositions(sessionKey: number): Promise<any[]> {
    try {
      return await OpenF1Service.getPositions(sessionKey)
    } catch (error) {
      console.error(`Error in getPositions for session ${sessionKey}:`, error)
      throw error
    }
  }

  static async getRadio(sessionKey: number): Promise<any[]> {
    try {
      return await OpenF1Service.getRadio(sessionKey)
    } catch (error) {
      console.error(`Error in getRadio for session ${sessionKey}:`, error)
      throw error
    }
  }

  // Utility methods
  static async clearCache(): Promise<void> {
    await DataCache.clear()
  }

  static async preloadSeasonData(season: string): Promise<void> {
    try {
      console.log(`Preloading data for season ${season}...`)
      
      // Load basic season data
      await Promise.all([
        this.getRaces(season),
        this.getDrivers(season),
        this.getConstructors(season),
        this.getDriverStandings(season),
        this.getConstructorStandings(season)
      ])

      // Load race results and qualifying for all races
      const races = await this.getRaces(season)
      const racePromises = races.map(async (race) => {
        try {
          await Promise.all([
            this.getRaceResults(season, race.round),
            this.getQualifyingResults(season, race.round),
            this.getLapTimes(season, race.round)
          ])
        } catch (error) {
          console.error(`Error preloading race ${race.round} for season ${season}:`, error)
        }
      })

      await Promise.all(racePromises)
      console.log(`Finished preloading data for season ${season}`)
    } catch (error) {
      console.error(`Error preloading season data for ${season}:`, error)
      throw error
    }
  }
}