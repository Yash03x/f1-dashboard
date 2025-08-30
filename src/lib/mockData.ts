// Fast mock data for development - will be replaced with real API calls

export const mockSeasons = ['2024', '2023', '2022', '2021', '2020']

export const mockDrivers = [
  { id: 'verstappen', code: 'VER', name: 'Max Verstappen', team: 'Red Bull', points: 393, wins: 15, nationality: 'Dutch' },
  { id: 'hamilton', code: 'HAM', name: 'Lewis Hamilton', team: 'Mercedes', points: 234, wins: 2, nationality: 'British' },
  { id: 'leclerc', code: 'LEC', name: 'Charles Leclerc', team: 'Ferrari', points: 218, wins: 1, nationality: 'Monégasque' },
  { id: 'russell', code: 'RUS', name: 'George Russell', team: 'Mercedes', points: 175, wins: 0, nationality: 'British' },
  { id: 'sainz', code: 'SAI', name: 'Carlos Sainz', team: 'Ferrari', points: 156, wins: 0, nationality: 'Spanish' },
  { id: 'norris', code: 'NOR', name: 'Lando Norris', team: 'McLaren', points: 113, wins: 0, nationality: 'British' },
  { id: 'alonso', code: 'ALO', name: 'Fernando Alonso', team: 'Aston Martin', points: 97, wins: 0, nationality: 'Spanish' },
  { id: 'piastri', code: 'PIA', name: 'Oscar Piastri', team: 'McLaren', points: 87, wins: 0, nationality: 'Australian' }
]

export const mockTeams = [
  { id: 'red_bull', name: 'Red Bull Racing', points: 719, wins: 17, color: '#3671C6' },
  { id: 'mercedes', name: 'Mercedes', points: 409, wins: 3, color: '#27F4D2' },
  { id: 'ferrari', name: 'Ferrari', points: 374, wins: 1, color: '#E8002D' },
  { id: 'mclaren', name: 'McLaren', points: 200, wins: 0, color: '#FF8000' },
  { id: 'aston_martin', name: 'Aston Martin', points: 143, wins: 0, color: '#229971' },
  { id: 'alpine', name: 'Alpine', points: 51, wins: 0, color: '#FF87BC' }
]

export const mockRaces = [
  { id: '1', name: 'Bahrain Grand Prix', date: '2024-03-02', country: 'Bahrain', winner: 'Max Verstappen', status: 'completed' },
  { id: '2', name: 'Saudi Arabian Grand Prix', date: '2024-03-09', country: 'Saudi Arabia', winner: 'Max Verstappen', status: 'completed' },
  { id: '3', name: 'Australian Grand Prix', date: '2024-03-24', country: 'Australia', winner: 'Carlos Sainz', status: 'completed' },
  { id: '4', name: 'Japanese Grand Prix', date: '2024-04-07', country: 'Japan', winner: 'Max Verstappen', status: 'completed' },
  { id: '5', name: 'Chinese Grand Prix', date: '2024-04-21', country: 'China', winner: 'Max Verstappen', status: 'completed' },
  { id: '6', name: 'Miami Grand Prix', date: '2024-05-05', country: 'USA', winner: 'Lando Norris', status: 'completed' },
  { id: '7', name: 'Emilia Romagna Grand Prix', date: '2024-05-19', country: 'Italy', winner: 'Max Verstappen', status: 'completed' },
  { id: '8', name: 'Monaco Grand Prix', date: '2024-05-26', country: 'Monaco', winner: 'Charles Leclerc', status: 'completed' }
]

export const mockRaceResults = [
  { position: 1, driver: 'Max Verstappen', team: 'Red Bull', time: '1:30:45.123', points: 25 },
  { position: 2, driver: 'Lewis Hamilton', team: 'Mercedes', time: '+5.234', points: 18 },
  { position: 3, driver: 'Charles Leclerc', team: 'Ferrari', time: '+12.567', points: 15 },
  { position: 4, driver: 'Lando Norris', team: 'McLaren', time: '+25.890', points: 12 },
  { position: 5, driver: 'Fernando Alonso', team: 'Aston Martin', time: '+35.123', points: 10 }
]

export const mockChampionshipData = {
  labels: ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Round 7', 'Round 8'],
  datasets: [
    {
      label: 'Max Verstappen',
      data: [25, 50, 75, 100, 125, 150, 175, 200],
      borderColor: '#3671C6',
      backgroundColor: '#3671C6',
      tension: 0.4
    },
    {
      label: 'Lewis Hamilton',
      data: [18, 36, 54, 72, 90, 108, 126, 144],
      borderColor: '#27F4D2',
      backgroundColor: '#27F4D2',
      tension: 0.4
    },
    {
      label: 'Charles Leclerc',
      data: [15, 30, 45, 60, 75, 90, 105, 120],
      borderColor: '#E8002D',
      backgroundColor: '#E8002D',
      tension: 0.4
    }
  ]
}

// Fast utility functions
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock API functions with realistic delays
export const mockAPI = {
  async getSeasons() {
    await delay(100) // Very fast
    return mockSeasons
  },

  async getDrivers(season?: string) {
    await delay(150)
    return mockDrivers
  },

  async getTeams(season?: string) {
    await delay(150)
    return mockTeams
  },

  async getRaces(season?: string) {
    await delay(200)
    return mockRaces
  },

  async getRaceResults(season?: string, round?: string) {
    await delay(200)
    return mockRaceResults
  },

  async getChampionshipData(season?: string) {
    await delay(250)
    return mockChampionshipData
  }
}