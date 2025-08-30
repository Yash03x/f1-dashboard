import axios from 'axios'

// Real F1 API endpoints
const JOLPICA_API = 'http://api.jolpi.ca/ergast/f1'
const OPENF1_API = 'https://api.openf1.org/v1'

// Rate limiting and error handling
const createAxiosInstance = (baseURL: string) => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
}

const jolpicaClient = createAxiosInstance(JOLPICA_API)
const openf1Client = createAxiosInstance(OPENF1_API)

// Add request interceptors for error handling
jolpicaClient.interceptors.response.use(
  response => response,
  error => {
    console.error('Jolpica API error:', error.response?.data || error.message)
    throw error
  }
)

openf1Client.interceptors.response.use(
  response => response,
  error => {
    console.error('OpenF1 API error:', error.response?.data || error.message)
    throw error
  }
)

export class RealF1DataService {
  // Get all available seasons
  static async getSeasons(): Promise<string[]> {
    try {
      const response = await jolpicaClient.get('/seasons.json?limit=30')
      const seasons = response.data?.MRData?.SeasonTable?.Seasons || []
      return seasons.map((season: any) => season.season).reverse() // Most recent first
    } catch (error) {
      console.error('Failed to fetch seasons:', error)
      throw new Error('Unable to fetch F1 seasons')
    }
  }

  // Get races for a specific season
  static async getRaces(season: string = '2024'): Promise<any[]> {
    try {
      const response = await jolpicaClient.get(`/${season}.json`)
      const races = response.data?.MRData?.RaceTable?.Races || []
      
      // Transform the data to match our interface
      return races.map((race: any) => ({
        id: race.round,
        name: race.raceName,
        date: race.date,
        country: race.Circuit.Location.country,
        circuit: race.Circuit.circuitName,
        location: race.Circuit.Location.locality,
        round: parseInt(race.round),
        status: new Date(race.date) < new Date() ? 'completed' : 'upcoming',
        winner: null // Will be populated from race results
      }))
    } catch (error) {
      console.error(`Failed to fetch races for season ${season}:`, error)
      throw new Error(`Unable to fetch races for ${season}`)
    }
  }

  // Get race results for a specific race
  static async getRaceResults(season: string = '2024', round?: string): Promise<any> {
    try {
      const url = round ? `/${season}/${round}/results.json` : `/${season}/last/results.json`
      const response = await jolpicaClient.get(url)
      const race = response.data?.MRData?.RaceTable?.Races?.[0]
      
      if (!race || !race.Results) {
        return null
      }

      return {
        raceName: race.raceName,
        date: race.date,
        circuit: race.Circuit.circuitName,
        country: race.Circuit.Location.country,
        results: race.Results.map((result: any) => ({
          position: parseInt(result.position),
          driver: `${result.Driver.givenName} ${result.Driver.familyName}`,
          driverCode: result.Driver.code,
          team: result.Constructor.name,
          time: result.Time?.time || result.status,
          points: parseFloat(result.points),
          grid: parseInt(result.grid),
          laps: parseInt(result.laps),
          status: result.status
        }))
      }
    } catch (error) {
      console.error(`Failed to fetch race results for ${season}/${round}:`, error)
      throw new Error(`Unable to fetch race results`)
    }
  }

  // Get current driver standings
  static async getDriverStandings(season: string = '2024'): Promise<any[]> {
    try {
      const response = await jolpicaClient.get(`/${season}/driverStandings.json`)
      const standings = response.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
      
      return standings.map((standing: any) => ({
        id: standing.Driver.driverId,
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
        code: standing.Driver.code,
        team: standing.Constructors[0]?.name || 'Unknown',
        nationality: standing.Driver.nationality,
        permanentNumber: standing.Driver.permanentNumber
      }))
    } catch (error) {
      console.error(`Failed to fetch driver standings for season ${season}:`, error)
      throw new Error(`Unable to fetch driver standings for ${season}`)
    }
  }

  // Get constructor standings
  static async getConstructorStandings(season: string = '2024'): Promise<any[]> {
    try {
      const response = await jolpicaClient.get(`/${season}/constructorStandings.json`)
      const standings = response.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []
      
      return standings.map((standing: any) => ({
        id: standing.Constructor.constructorId,
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        name: standing.Constructor.name,
        nationality: standing.Constructor.nationality,
        // Add team colors (you can expand this mapping)
        color: this.getTeamColor(standing.Constructor.constructorId)
      }))
    } catch (error) {
      console.error(`Failed to fetch constructor standings for season ${season}:`, error)
      throw new Error(`Unable to fetch constructor standings for ${season}`)
    }
  }

  // Get drivers for a season
  static async getDrivers(season: string = '2024'): Promise<any[]> {
    try {
      const response = await jolpicaClient.get(`/${season}/drivers.json`)
      const drivers = response.data?.MRData?.DriverTable?.Drivers || []
      
      // Get driver standings for additional data
      const standings = await this.getDriverStandings(season)
      const standingsMap = new Map(standings.map(s => [s.id, s]))
      
      return drivers.map((driver: any) => {
        const standing = standingsMap.get(driver.driverId) || {}
        return {
          id: driver.driverId,
          name: `${driver.givenName} ${driver.familyName}`,
          code: driver.code,
          nationality: driver.nationality,
          dateOfBirth: driver.dateOfBirth,
          permanentNumber: driver.permanentNumber,
          points: standing.points || 0,
          wins: standing.wins || 0,
          team: standing.team || 'Unknown',
          position: standing.position || null
        }
      })
    } catch (error) {
      console.error(`Failed to fetch drivers for season ${season}:`, error)
      throw new Error(`Unable to fetch drivers for ${season}`)
    }
  }

  // Get constructors for a season
  static async getConstructors(season: string = '2024'): Promise<any[]> {
    try {
      const response = await jolpicaClient.get(`/${season}/constructors.json`)
      const constructors = response.data?.MRData?.ConstructorTable?.Constructors || []
      
      // Get constructor standings for additional data
      const standings = await this.getConstructorStandings(season)
      const standingsMap = new Map(standings.map(s => [s.id, s]))
      
      return constructors.map((constructor: any) => {
        const standing = standingsMap.get(constructor.constructorId) || {}
        return {
          id: constructor.constructorId,
          name: constructor.name,
          nationality: constructor.nationality,
          points: standing.points || 0,
          wins: standing.wins || 0,
          position: standing.position || null,
          color: this.getTeamColor(constructor.constructorId)
        }
      })
    } catch (error) {
      console.error(`Failed to fetch constructors for season ${season}:`, error)
      throw new Error(`Unable to fetch constructors for ${season}`)
    }
  }

  // Get championship progression data
  static async getChampionshipProgression(season: string = '2024'): Promise<any> {
    try {
      // Get all races for the season
      const races = await this.getRaces(season)
      const completedRaces = races.filter(race => race.status === 'completed')
      
      if (completedRaces.length === 0) {
        return {
          labels: [],
          datasets: []
        }
      }

      // Get standings after each race
      const progressionData = new Map()
      const drivers = new Set()
      
      for (const race of completedRaces) {
        try {
          const response = await jolpicaClient.get(`/${season}/${race.round}/driverStandings.json`)
          const standings = response.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
          
          standings.slice(0, 5).forEach((standing: any) => { // Top 5 drivers only
            const driverKey = standing.Driver.driverId
            const driverName = `${standing.Driver.givenName} ${standing.Driver.familyName}`
            
            drivers.add(driverKey)
            
            if (!progressionData.has(driverKey)) {
              progressionData.set(driverKey, {
                name: driverName,
                code: standing.Driver.code,
                data: [],
                team: standing.Constructors[0]?.name
              })
            }
            
            progressionData.get(driverKey).data.push(parseFloat(standing.points))
          })
        } catch (error) {
          console.error(`Error fetching standings for race ${race.round}:`, error)
        }
      }

      // Convert to chart format
      const labels = completedRaces.map(race => `Round ${race.round}`)
      const datasets = Array.from(progressionData.values()).map((driver: any) => ({
        label: driver.name,
        data: driver.data,
        borderColor: this.getTeamColor(driver.team?.toLowerCase().replace(/\s+/g, '_')),
        backgroundColor: this.getTeamColor(driver.team?.toLowerCase().replace(/\s+/g, '_')),
        tension: 0.4
      }))

      return { labels, datasets }
    } catch (error) {
      console.error(`Failed to fetch championship progression for ${season}:`, error)
      throw new Error('Unable to fetch championship progression')
    }
  }

  // Get live telemetry data from OpenF1 API
  static async getLiveTelemetry(sessionKey?: number): Promise<any> {
    try {
      // If no session key provided, get the latest session
      if (!sessionKey) {
        const sessions = await openf1Client.get('/sessions?year=2024&session_type=Race')
        const latestSession = sessions.data?.[sessions.data.length - 1]
        sessionKey = latestSession?.session_key
      }

      if (!sessionKey) {
        return null
      }

      // Get car data for the session
      const response = await openf1Client.get(`/car_data?session_key=${sessionKey}&driver_number=1`)
      const telemetryData = response.data || []

      // Transform the data for charts
      if (telemetryData.length === 0) {
        return null
      }

      const speed = {
        labels: telemetryData.slice(0, 100).map((_: any, i: number) => `${i}s`),
        datasets: [{
          label: 'Speed (km/h)',
          data: telemetryData.slice(0, 100).map((d: any) => d.speed),
          borderColor: '#E8002D',
          backgroundColor: 'rgba(232, 0, 45, 0.1)',
          tension: 0.4,
          fill: true
        }]
      }

      return { speed }
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error)
      return null
    }
  }

  // Helper method to get team colors
  private static getTeamColor(teamId: string): string {
    const teamColors: Record<string, string> = {
      'red_bull': '#3671C6',
      'ferrari': '#E8002D',
      'mercedes': '#27F4D2',
      'mclaren': '#FF8000',
      'aston_martin': '#229971',
      'alpine': '#FF87BC',
      'williams': '#64C4FF',
      'alphatauri': '#5E8FAA',
      'alpha_tauri': '#5E8FAA',
      'alfa': '#C92D4B',
      'haas': '#B6BABD',
      'kick_sauber': '#C92D4B',
      'rb': '#6692FF'
    }
    
    return teamColors[teamId] || '#000000'
  }

  // Health check method
  static async healthCheck(): Promise<boolean> {
    try {
      await Promise.all([
        jolpicaClient.get('/seasons.json?limit=1'),
        // OpenF1 health check can be added here
      ])
      return true
    } catch (error) {
      console.error('F1 API health check failed:', error)
      return false
    }
  }
}