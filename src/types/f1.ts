// F1 Dashboard Enterprise Types
// These types match our PostgreSQL database schema

export interface Season {
  id: string
  year: number
  name: string
  last_synced?: Date
  data_completeness: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Circuit {
  id: string
  name: string
  location?: string
  country?: string
  latitude?: number
  longitude?: number
  altitude?: number
  url?: string
  created_at: Date
}

export interface Constructor {
  id: string
  name: string
  nationality?: string
  url?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Driver {
  id: string
  driver_code?: string
  first_name: string
  last_name: string
  nationality?: string
  date_of_birth?: Date
  url?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Race {
  id: number
  season_id: string
  circuit_id?: string
  round: number
  race_name: string
  race_date?: Date
  qualifying_date?: Date
  sprint_date?: Date
  
  // Pre-loaded data (JSONB)
  race_results?: RaceResult[]
  qualifying_results?: QualifyingResult[]
  sprint_results?: SprintResult[]
  lap_times?: LapTime[]
  pit_stops?: PitStop[]
  fastest_laps?: FastestLap[]
  
  // Metadata
  status: string
  weather_data?: WeatherData
  track_conditions?: TrackConditions
  
  // Joined data
  circuit_name?: string
  circuit_country?: string
  circuit_location?: string
  season_year?: number
  
  created_at: Date
  updated_at: Date
}

export interface RaceResult {
  position: number
  driver_id: string
  constructor_id: string
  driver_name?: string
  constructor_name?: string
  grid: number
  laps: number
  status: string
  time?: string
  points: number
  fastest_lap?: string
  fastest_lap_rank?: number
}

export interface QualifyingResult {
  position: number
  driver_id: string
  constructor_id: string
  driver_name?: string
  constructor_name?: string
  q1?: string
  q2?: string
  q3?: string
}

export interface SprintResult {
  position: number
  driver_id: string
  constructor_id: string
  driver_name?: string
  constructor_name?: string
  grid: number
  laps: number
  status: string
  time?: string
  points: number
}

export interface LapTime {
  driver_id: string
  lap: number
  position: number
  time: string
  milliseconds: number
}

export interface PitStop {
  driver_id: string
  stop: number
  lap: number
  time: string
  duration: string
  milliseconds: number
}

export interface FastestLap {
  driver_id: string
  lap: number
  time: string
  rank: number
}

export interface WeatherData {
  temperature: number
  humidity: number
  pressure: number
  wind_speed: number
  wind_direction: number
  conditions: string
}

export interface TrackConditions {
  track_temperature: number
  air_temperature: number
  humidity: number
  grip_level: string
}

export interface DriverStanding {
  id: number
  season_id: string
  race_id: number
  driver_id: string
  position: number
  points: number
  wins: number
  podiums: number
  fastest_laps: number
  races_entered: number
  races_finished: number
  dnf_count: number
  
  // Joined data
  first_name?: string
  last_name?: string
  driver_code?: string
  nationality?: string
  constructor_name?: string
  
  created_at: Date
  updated_at: Date
}

export interface ConstructorStanding {
  id: number
  season_id: string
  race_id: number
  constructor_id: string
  position: number
  points: number
  wins: number
  podiums: number
  fastest_laps: number
  races_entered: number
  races_finished: number
  dnf_count: number
  
  // Joined data
  constructor_name?: string
  nationality?: string
  
  created_at: Date
  updated_at: Date
}

export interface DriverConstructorSeason {
  id: number
  season_id: string
  driver_id: string
  constructor_id: string
  car_number?: number
  is_reserve: boolean
  start_race?: number
  end_race?: number
  created_at: Date
}

export interface TelemetryData {
  id: string
  race_id: number
  driver_id: string
  lap_number: number
  sector_number?: number
  timestamp: Date
  speed?: number
  throttle?: number
  brake?: number
  gear?: number
  rpm?: number
  engine_rpm?: number
  fuel_flow?: number
  fuel_remaining?: number
  x_position?: number
  y_position?: number
  z_position?: number
  track_temperature?: number
  air_temperature?: number
  humidity?: number
  created_at: Date
}

export interface DataSyncLog {
  id: number
  sync_type: string
  season_id?: string
  race_id?: number
  status: string
  records_processed: number
  records_created: number
  records_updated: number
  records_failed: number
  started_at: Date
  completed_at?: Date
  duration_ms?: number
  error_message?: string
  error_stack?: string
  created_at: Date
}

export interface CacheInvalidation {
  id: number
  cache_key: string
  invalidation_reason?: string
  invalidated_at: Date
  processed_at?: Date
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: Date
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  success: boolean
  message?: string
  timestamp: Date
}

// Legacy types for backward compatibility
export interface LegacyRace {
  id: string
  name: string
  date: string
  country: string
  winner?: string
  status: string
  round?: number
}

export interface LegacyDriver {
  id: string
  name: string
  nationality: string
  constructor: string
  points: number
  position: number
}

export interface LegacyConstructor {
  id: string
  name: string
  nationality: string
  points: number
  position: number
}

// Utility types
export type SeasonId = string
export type RaceId = number
export type DriverId = string
export type ConstructorId = string

// Chart data types
export interface ChartDataPoint {
  x: string | number | Date
  y: number
  label?: string
  color?: string
}

export interface ChartSeries {
  name: string
  data: ChartDataPoint[]
  color?: string
}

export interface ChartConfig {
  title: string
  xAxis: {
    title: string
    type: 'category' | 'number' | 'datetime'
  }
  yAxis: {
    title: string
    type: 'number'
  }
  series: ChartSeries[]
}