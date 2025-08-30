// F1 Data Types
export interface Season {
  season: string;
  url: string;
}

export interface Circuit {
  circuitId: string;
  url: string;
  circuitName: string;
  location: Location;
}

export interface Location {
  lat: string;
  long: string;
  locality: string;
  country: string;
}

export interface Driver {
  driverId: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
  code?: string;
  permanentNumber?: string;
}

export interface Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface Race {
  season: string;
  round: string;
  url: string;
  raceName: string;
  circuit: Circuit;
  date: string;
  time?: string;
  results?: RaceResult[];
  qualifying?: QualifyingResult[];
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  driver: Driver;
  constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  time?: Time;
  fastestLap?: FastestLap;
}

export interface QualifyingResult {
  number: string;
  position: string;
  driver: Driver;
  constructor: Constructor;
  q1?: string;
  q2?: string;
  q3?: string;
}

export interface Time {
  millis?: string;
  time?: string;
}

export interface FastestLap {
  rank: string;
  lap: string;
  time: Time;
  averageSpeed: AverageSpeed;
}

export interface AverageSpeed {
  units: string;
  speed: string;
}

export interface Standing {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  driver?: Driver;
  constructor?: Constructor;
  constructorStandings?: Standing[];
}

// OpenF1 API Types
export interface SessionInfo {
  country_code: string;
  country_key: number;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  location: string;
  meeting_key: number;
  session_key: number;
  session_name: string;
  session_type: string;
  year: number;
}

export interface LapData {
  date_start: string;
  driver_number: number;
  duration_sector_1?: number;
  duration_sector_2?: number;
  duration_sector_3?: number;
  i1_speed?: number;
  i2_speed?: number;
  is_pit_out_lap: boolean;
  lap_duration?: number;
  lap_number: number;
  meeting_key: number;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
  session_key: number;
  st_speed?: number;
}

export interface CarData {
  brake: number;
  date: string;
  driver_number: number;
  drs: number;
  meeting_key: number;
  n_gear: number;
  rpm: number;
  session_key: number;
  speed: number;
  throttle: number;
}