import axios from 'axios'
import { Race, Driver, Constructor, Standing, SessionInfo, LapData, CarData } from '@/types/f1'

// API Base URLs
const JOLPICA_API_BASE = 'http://api.jolpi.ca/ergast/f1'
const OPENF1_API_BASE = 'https://api.openf1.org/v1'

// Create axios instances
const jolpicaApi = axios.create({
  baseURL: JOLPICA_API_BASE,
  timeout: 10000,
})

const openF1Api = axios.create({
  baseURL: OPENF1_API_BASE,
  timeout: 10000,
})

// Jolpica F1 API (Ergast replacement) functions
export class F1DataService {
  // Get all seasons
  static async getSeasons(): Promise<string[]> {
    try {
      const response = await jolpicaApi.get('/seasons.json')
      return response.data.MRData.SeasonTable.Seasons.map((s: any) => s.season)
    } catch (error) {
      console.error('Error fetching seasons:', error)
      throw error
    }
  }

  // Get races for a specific season
  static async getRaces(season: string): Promise<Race[]> {
    try {
      const response = await jolpicaApi.get(`/${season}.json`)
      return response.data.MRData.RaceTable.Races
    } catch (error) {
      console.error(`Error fetching races for season ${season}:`, error)
      throw error
    }
  }

  // Get race results for a specific race
  static async getRaceResults(season: string, round: string): Promise<Race> {
    try {
      const response = await jolpicaApi.get(`/${season}/${round}/results.json`)
      return response.data.MRData.RaceTable.Races[0]
    } catch (error) {
      console.error(`Error fetching race results for ${season}/${round}:`, error)
      throw error
    }
  }

  // Get qualifying results
  static async getQualifyingResults(season: string, round: string): Promise<Race> {
    try {
      const response = await jolpicaApi.get(`/${season}/${round}/qualifying.json`)
      return response.data.MRData.RaceTable.Races[0]
    } catch (error) {
      console.error(`Error fetching qualifying results for ${season}/${round}:`, error)
      throw error
    }
  }

  // Get driver standings
  static async getDriverStandings(season: string, round?: string): Promise<Standing[]> {
    try {
      const url = round ? `/${season}/${round}/driverStandings.json` : `/${season}/driverStandings.json`
      const response = await jolpicaApi.get(url)
      return response.data.MRData.StandingsTable.StandingsLists[0].DriverStandings
    } catch (error) {
      console.error(`Error fetching driver standings for ${season}:`, error)
      throw error
    }
  }

  // Get constructor standings
  static async getConstructorStandings(season: string, round?: string): Promise<Standing[]> {
    try {
      const url = round ? `/${season}/${round}/constructorStandings.json` : `/${season}/constructorStandings.json`
      const response = await jolpicaApi.get(url)
      return response.data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings
    } catch (error) {
      console.error(`Error fetching constructor standings for ${season}:`, error)
      throw error
    }
  }

  // Get all drivers for a season
  static async getDrivers(season: string): Promise<Driver[]> {
    try {
      const response = await jolpicaApi.get(`/${season}/drivers.json`)
      return response.data.MRData.DriverTable.Drivers
    } catch (error) {
      console.error(`Error fetching drivers for season ${season}:`, error)
      throw error
    }
  }

  // Get all constructors for a season
  static async getConstructors(season: string): Promise<Constructor[]> {
    try {
      const response = await jolpicaApi.get(`/${season}/constructors.json`)
      return response.data.MRData.ConstructorTable.Constructors
    } catch (error) {
      console.error(`Error fetching constructors for season ${season}:`, error)
      throw error
    }
  }

  // Get lap times for a race
  static async getLapTimes(season: string, round: string, lap?: string): Promise<any> {
    try {
      const url = lap ? `/${season}/${round}/laps/${lap}.json` : `/${season}/${round}/laps.json`
      const response = await jolpicaApi.get(url)
      return response.data.MRData.RaceTable.Races[0].Laps
    } catch (error) {
      console.error(`Error fetching lap times for ${season}/${round}:`, error)
      throw error
    }
  }
}

// OpenF1 API functions for real-time and detailed telemetry data
export class OpenF1Service {
  // Get sessions for a year
  static async getSessions(year: number): Promise<SessionInfo[]> {
    try {
      const response = await openF1Api.get(`/sessions?year=${year}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching sessions for year ${year}:`, error)
      throw error
    }
  }

  // Get lap data for a session
  static async getLaps(sessionKey: number, driverNumber?: number): Promise<LapData[]> {
    try {
      const url = driverNumber 
        ? `/laps?session_key=${sessionKey}&driver_number=${driverNumber}`
        : `/laps?session_key=${sessionKey}`
      const response = await openF1Api.get(url)
      return response.data
    } catch (error) {
      console.error(`Error fetching laps for session ${sessionKey}:`, error)
      throw error
    }
  }

  // Get car data (telemetry) for a session
  static async getCarData(sessionKey: number, driverNumber?: number): Promise<CarData[]> {
    try {
      const url = driverNumber 
        ? `/car_data?session_key=${sessionKey}&driver_number=${driverNumber}`
        : `/car_data?session_key=${sessionKey}`
      const response = await openF1Api.get(url)
      return response.data
    } catch (error) {
      console.error(`Error fetching car data for session ${sessionKey}:`, error)
      throw error
    }
  }

  // Get position data
  static async getPositions(sessionKey: number): Promise<any[]> {
    try {
      const response = await openF1Api.get(`/position?session_key=${sessionKey}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching positions for session ${sessionKey}:`, error)
      throw error
    }
  }

  // Get radio communications
  static async getRadio(sessionKey: number): Promise<any[]> {
    try {
      const response = await openF1Api.get(`/team_radio?session_key=${sessionKey}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching radio for session ${sessionKey}:`, error)
      throw error
    }
  }
}