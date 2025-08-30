import { query, transaction } from '../connection'
import { 
  Season, 
  Race, 
  Driver, 
  Constructor, 
  DriverStanding, 
  ConstructorStanding,
  TelemetryData 
} from '@/types/f1'

export class F1Repository {
  
  // ========================================
  // SEASONS
  // ========================================
  
  async getAllSeasons(): Promise<Season[]> {
    const result = await query(`
      SELECT 
        id,
        year,
        name,
        last_synced,
        data_completeness,
        is_active,
        created_at,
        updated_at
      FROM seasons 
      ORDER BY year DESC
    `)
    return result.rows
  }

  async getSeasonById(id: string): Promise<Season | null> {
    const result = await query(`
      SELECT * FROM seasons WHERE id = $1
    `, [id])
    return result.rows[0] || null
  }

  async createSeason(season: Omit<Season, 'created_at' | 'updated_at'>): Promise<Season> {
    const result = await query(`
      INSERT INTO seasons (id, year, name, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [season.id, season.year, season.name, season.is_active])
    return result.rows[0]
  }

  async updateSeasonSync(id: string, dataCompleteness: number): Promise<void> {
    await query(`
      UPDATE seasons 
      SET last_synced = NOW(), data_completeness = $2, updated_at = NOW()
      WHERE id = $1
    `, [id, dataCompleteness])
  }

  // ========================================
  // RACES
  // ========================================
  
  async getRacesBySeason(seasonId: string): Promise<Race[]> {
    const result = await query(`
      SELECT 
        r.*,
        c.name as circuit_name,
        c.country as circuit_country,
        c.location as circuit_location,
        s.year as season_year
      FROM races r
      JOIN circuits c ON r.circuit_id = c.id
      JOIN seasons s ON r.season_id = s.id
      WHERE r.season_id = $1
      ORDER BY r.round ASC
    `, [seasonId])
    return result.rows
  }

  async getRaceById(id: number): Promise<Race | null> {
    const result = await query(`
      SELECT 
        r.*,
        c.name as circuit_name,
        c.country as circuit_country,
        c.location as circuit_location,
        s.year as season_year
      FROM races r
      JOIN circuits c ON r.circuit_id = c.id
      JOIN seasons s ON r.season_id = s.id
      WHERE r.id = $1
    `, [id])
    return result.rows[0] || null
  }

  async createRace(race: Omit<Race, 'id' | 'created_at' | 'updated_at'>): Promise<Race> {
    const result = await query(`
      INSERT INTO races (
        season_id, circuit_id, round, race_name, race_date, 
        qualifying_date, sprint_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      race.season_id, race.circuit_id, race.round, race.race_name,
      race.race_date, race.qualifying_date, race.sprint_date, race.status
    ])
    return result.rows[0]
  }

  async updateRaceResults(raceId: number, results: any): Promise<void> {
    await query(`
      UPDATE races 
      SET race_results = $2, updated_at = NOW()
      WHERE id = $1
    `, [raceId, JSON.stringify(results)])
  }

  async updateQualifyingResults(raceId: number, results: any): Promise<void> {
    await query(`
      UPDATE races 
      SET qualifying_results = $2, updated_at = NOW()
      WHERE id = $1
    `, [raceId, JSON.stringify(results)])
  }

  async updateLapTimes(raceId: number, lapTimes: any): Promise<void> {
    await query(`
      UPDATE races 
      SET lap_times = $2, updated_at = NOW()
      WHERE id = $1
    `, [raceId, JSON.stringify(lapTimes)])
  }

  // ========================================
  // DRIVERS
  // ========================================
  
  async getAllDrivers(): Promise<Driver[]> {
    const result = await query(`
      SELECT * FROM drivers 
      WHERE is_active = true
      ORDER BY last_name, first_name
    `)
    return result.rows
  }

  async getDriversBySeason(seasonId: string): Promise<Driver[]> {
    const result = await query(`
      SELECT DISTINCT d.*
      FROM drivers d
      JOIN driver_constructor_seasons dcs ON d.id = dcs.driver_id
      WHERE dcs.season_id = $1 AND d.is_active = true
      ORDER BY d.last_name, d.first_name
    `, [seasonId])
    return result.rows
  }

  async getDriverById(id: string): Promise<Driver | null> {
    const result = await query(`
      SELECT * FROM drivers WHERE id = $1
    `, [id])
    return result.rows[0] || null
  }

  async createDriver(driver: Omit<Driver, 'created_at' | 'updated_at'>): Promise<Driver> {
    const result = await query(`
      INSERT INTO drivers (id, driver_code, first_name, last_name, nationality, date_of_birth, url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      driver.id, driver.driver_code, driver.first_name, driver.last_name,
      driver.nationality, driver.date_of_birth, driver.url
    ])
    return result.rows[0]
  }

  // ========================================
  // CONSTRUCTORS
  // ========================================
  
  async getAllConstructors(): Promise<Constructor[]> {
    const result = await query(`
      SELECT * FROM constructors 
      WHERE is_active = true
      ORDER BY name
    `)
    return result.rows
  }

  async getConstructorsBySeason(seasonId: string): Promise<Constructor[]> {
    const result = await query(`
      SELECT DISTINCT c.*
      FROM constructors c
      JOIN driver_constructor_seasons dcs ON c.id = dcs.constructor_id
      WHERE dcs.season_id = $1 AND c.is_active = true
      ORDER BY c.name
    `, [seasonId])
    return result.rows
  }

  async getConstructorById(id: string): Promise<Constructor | null> {
    const result = await query(`
      SELECT * FROM constructors WHERE id = $1
    `, [id])
    return result.rows[0] || null
  }

  async createConstructor(constructor: Omit<Constructor, 'created_at' | 'updated_at'>): Promise<Constructor> {
    const result = await query(`
      INSERT INTO constructors (id, name, nationality, url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [constructor.id, constructor.name, constructor.nationality, constructor.url])
    return result.rows[0]
  }

  // ========================================
  // STANDINGS
  // ========================================
  
  async getDriverStandings(seasonId: string, raceId?: number): Promise<DriverStanding[]> {
    let queryText = `
      SELECT 
        ds.*,
        d.first_name,
        d.last_name,
        d.driver_code,
        d.nationality,
        c.name as constructor_name
      FROM driver_standings ds
      JOIN drivers d ON ds.driver_id = d.id
      JOIN driver_constructor_seasons dcs ON ds.driver_id = dcs.driver_id AND ds.season_id = dcs.season_id
      JOIN constructors c ON dcs.constructor_id = c.id
      WHERE ds.season_id = $1
    `
    const params = [seasonId]

    if (raceId) {
      queryText += ' AND ds.race_id = $2'
      params.push(raceId)
    } else {
      queryText += ' AND ds.race_id = (SELECT MAX(race_id) FROM driver_standings WHERE season_id = $1)'
    }

    queryText += ' ORDER BY ds.position ASC'

    const result = await query(queryText, params)
    return result.rows
  }

  async getConstructorStandings(seasonId: string, raceId?: number): Promise<ConstructorStanding[]> {
    let queryText = `
      SELECT 
        cs.*,
        c.name as constructor_name,
        c.nationality
      FROM constructor_standings cs
      JOIN constructors c ON cs.constructor_id = c.id
      WHERE cs.season_id = $1
    `
    const params = [seasonId]

    if (raceId) {
      queryText += ' AND cs.race_id = $2'
      params.push(raceId)
    } else {
      queryText += ' AND cs.race_id = (SELECT MAX(race_id) FROM constructor_standings WHERE season_id = $1)'
    }

    queryText += ' ORDER BY cs.position ASC'

    const result = await query(queryText, params)
    return result.rows
  }

  async updateDriverStandings(standings: Omit<DriverStanding, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    await transaction(async (client) => {
      for (const standing of standings) {
        await client.query(`
          INSERT INTO driver_standings (
            season_id, race_id, driver_id, position, points, 
            wins, podiums, fastest_laps, races_entered, races_finished, dnf_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (season_id, race_id, driver_id) 
          DO UPDATE SET
            position = EXCLUDED.position,
            points = EXCLUDED.points,
            wins = EXCLUDED.wins,
            podiums = EXCLUDED.podiums,
            fastest_laps = EXCLUDED.fastest_laps,
            races_entered = EXCLUDED.races_entered,
            races_finished = EXCLUDED.races_finished,
            dnf_count = EXCLUDED.dnf_count,
            updated_at = NOW()
        `, [
          standing.season_id, standing.race_id, standing.driver_id,
          standing.position, standing.points, standing.wins, standing.podiums,
          standing.fastest_laps, standing.races_entered, standing.races_finished,
          standing.dnf_count
        ])
      }
    })
  }

  async updateConstructorStandings(standings: Omit<ConstructorStanding, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    await transaction(async (client) => {
      for (const standing of standings) {
        await client.query(`
          INSERT INTO constructor_standings (
            season_id, race_id, constructor_id, position, points, 
            wins, podiums, fastest_laps, races_entered, races_finished, dnf_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (season_id, race_id, constructor_id) 
          DO UPDATE SET
            position = EXCLUDED.position,
            points = EXCLUDED.points,
            wins = EXCLUDED.wins,
            podiums = EXCLUDED.podiums,
            fastest_laps = EXCLUDED.fastest_laps,
            races_entered = EXCLUDED.races_entered,
            races_finished = EXCLUDED.races_finished,
            dnf_count = EXCLUDED.dnf_count,
            updated_at = NOW()
        `, [
          standing.season_id, standing.race_id, standing.constructor_id,
          standing.position, standing.points, standing.wins, standing.podiums,
          standing.fastest_laps, standing.races_entered, standing.races_finished,
          standing.dnf_count
        ])
      }
    })
  }

  // ========================================
  // TELEMETRY
  // ========================================
  
  async getTelemetryData(raceId: number, driverId?: string, lapNumber?: number): Promise<TelemetryData[]> {
    let queryText = `
      SELECT * FROM telemetry_data 
      WHERE race_id = $1
    `
    const params = [raceId]

    if (driverId) {
      queryText += ' AND driver_id = $2'
      params.push(driverId)
    }

    if (lapNumber) {
      queryText += ' AND lap_number = $' + (params.length + 1)
      params.push(lapNumber)
    }

    queryText += ' ORDER BY timestamp ASC'

    const result = await query(queryText, params)
    return result.rows
  }

  async insertTelemetryData(data: Omit<TelemetryData, 'id' | 'created_at'>[]): Promise<void> {
    await transaction(async (client) => {
      for (const record of data) {
        await client.query(`
          INSERT INTO telemetry_data (
            race_id, driver_id, lap_number, sector_number, timestamp,
            speed, throttle, brake, gear, rpm, engine_rpm,
            fuel_flow, fuel_remaining, x_position, y_position, z_position,
            track_temperature, air_temperature, humidity
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          record.race_id, record.driver_id, record.lap_number, record.sector_number,
          record.timestamp, record.speed, record.throttle, record.brake, record.gear,
          record.rpm, record.engine_rpm, record.fuel_flow, record.fuel_remaining,
          record.x_position, record.y_position, record.z_position,
          record.track_temperature, record.air_temperature, record.humidity
        ])
      }
    })
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
  
  async getUpcomingRaces(limit: number = 5): Promise<Race[]> {
    const result = await query(`
      SELECT 
        r.*,
        c.name as circuit_name,
        c.country as circuit_country,
        s.year as season_year
      FROM races r
      JOIN circuits c ON r.circuit_id = c.id
      JOIN seasons s ON r.season_id = s.id
      WHERE r.race_date >= CURRENT_DATE
      ORDER BY r.race_date ASC
      LIMIT $1
    `, [limit])
    return result.rows
  }

  async getCurrentSeason(): Promise<Season | null> {
    const result = await query(`
      SELECT * FROM seasons 
      WHERE is_active = true 
      ORDER BY year DESC 
      LIMIT 1
    `)
    return result.rows[0] || null
  }

  async logDataSync(syncType: string, seasonId?: string, raceId?: number, status: string = 'started'): Promise<number> {
    const result = await query(`
      INSERT INTO data_sync_logs (sync_type, season_id, race_id, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [syncType, seasonId, raceId, status])
    return result.rows[0].id
  }

  async updateDataSyncLog(logId: number, status: string, recordsProcessed: number = 0, errorMessage?: string): Promise<void> {
    await query(`
      UPDATE data_sync_logs 
      SET 
        status = $2,
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        records_processed = $3,
        error_message = $4
      WHERE id = $1
    `, [logId, status, recordsProcessed, errorMessage])
  }
}

// Export singleton instance
export const f1Repository = new F1Repository()