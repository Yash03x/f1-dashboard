import { BaseRepository, QueryOptions } from './BaseRepository'
import { prisma } from '../client'
import { 
  Season, 
  Race, 
  Driver, 
  Constructor, 
  RaceResult, 
  QualifyingResult,
  DriverStanding,
  ConstructorStanding,
  LapTime,
  TelemetryData,
  SeasonStats
} from '@prisma/client'

// Extended types for complex queries
type RaceWithResults = Race & {
  raceResults: (RaceResult & {
    driver: Driver
    constructor: Constructor
  })[]
  qualifyingResults: (QualifyingResult & {
    driver: Driver
    constructor: Constructor
  })[]
  circuit: {
    id: string
    name: string
    country: string
  }
}

type DriverWithStats = Driver & {
  _count: {
    raceResults: number
    qualifyingResults: number
  }
  raceResults: {
    points: number
    position: number
  }[]
}

export class F1Repository extends BaseRepository {
  constructor() {
    super('f1')
  }

  // ========================================
  // SEASONS
  // ========================================

  async getAllSeasons(options: QueryOptions = {}): Promise<Season[]> {
    return this.findManyOptimized(
      (args) => prisma.season.findMany({
        ...args,
        orderBy: { year: 'desc' }
      }),
      { 
        ttl: 24 * 3600, // 24 hours - seasons don't change often
        ...options 
      }
    )
  }

  async getSeasonById(seasonId: string): Promise<Season | null> {
    return this.findUniqueOptimized(
      (args) => prisma.season.findUnique(args),
      { id: seasonId },
      { ttl: 24 * 3600 }
    )
  }

  async createSeason(data: { id: string; year: number }): Promise<Season> {
    const season = await prisma.season.create({ data })
    await this.invalidateCache(['season'])
    return season
  }

  // ========================================
  // RACES
  // ========================================

  async getRacesBySeason(seasonId: string, options: QueryOptions = {}): Promise<Race[]> {
    return this.findManyOptimized(
      (args) => prisma.race.findMany({
        ...args,
        where: { season: seasonId },
        include: {
          circuit: {
            select: {
              id: true,
              name: true,
              country: true
            }
          }
        },
        orderBy: { round: 'asc' }
      }),
      { 
        ttl: 3600, // 1 hour
        ...options 
      }
    )
  }

  async getRaceWithResults(seasonId: string, round: number): Promise<RaceWithResults | null> {
    const cacheKey = this.generateCacheKey('raceWithResults', { seasonId, round })

    return this.executeWithCache(
      cacheKey,
      async () => {
        return await prisma.race.findFirst({
          where: { season: seasonId, round },
          include: {
            circuit: {
              select: {
                id: true,
                name: true,
                country: true
              }
            },
            raceResults: {
              include: {
                driver: true,
                constructor: true
              },
              orderBy: { position: 'asc' }
            },
            qualifyingResults: {
              include: {
                driver: true,
                constructor: true
              },
              orderBy: { position: 'asc' }
            }
          }
        }) as RaceWithResults | null
      },
      { ttl: 7200 } // 2 hours
    )
  }

  async createRace(data: any): Promise<Race> {
    const race = await prisma.race.create({ data })
    await this.invalidateCache(['race', `season:${data.season}`])
    return race
  }

  // ========================================
  // DRIVERS
  // ========================================

  async getDriversBySeason(seasonId: string, options: QueryOptions = {}): Promise<Driver[]> {
    return this.findManyOptimized(
      (args) => prisma.driver.findMany({
        ...args,
        where: {
          seasons: {
            some: { id: seasonId }
          }
        },
        orderBy: { familyName: 'asc' }
      }),
      { ttl: 7200, ...options }
    )
  }

  async getDriverWithStats(driverId: string, seasonId?: string): Promise<DriverWithStats | null> {
    const cacheKey = this.generateCacheKey('driverWithStats', { driverId, seasonId })

    return this.executeWithCache(
      cacheKey,
      async () => {
        const whereClause = seasonId ? {
          raceResults: {
            some: {
              race: { season: seasonId }
            }
          }
        } : {}

        return await prisma.driver.findUnique({
          where: { id: driverId },
          include: {
            _count: {
              select: {
                raceResults: seasonId ? {
                  where: { race: { season: seasonId } }
                } : true,
                qualifyingResults: seasonId ? {
                  where: { race: { season: seasonId } }
                } : true
              }
            },
            raceResults: {
              select: {
                points: true,
                position: true
              },
              where: seasonId ? {
                race: { season: seasonId }
              } : {},
              orderBy: {
                race: { round: 'asc' }
              }
            }
          }
        }) as DriverWithStats | null
      },
      { ttl: 1800 } // 30 minutes
    )
  }

  // ========================================
  // CONSTRUCTORS
  // ========================================

  async getConstructorsBySeason(seasonId: string): Promise<Constructor[]> {
    return this.findManyOptimized(
      (args) => prisma.constructor.findMany({
        ...args,
        where: {
          seasons: {
            some: { id: seasonId }
          }
        },
        orderBy: { name: 'asc' }
      }),
      { ttl: 7200 }
    )
  }

  // ========================================
  // STANDINGS
  // ========================================

  async getDriverStandings(seasonId: string, options: QueryOptions = {}): Promise<(DriverStanding & { driver: Driver })[]> {
    const cacheKey = this.generateCacheKey('driverStandings', { seasonId })

    return this.executeWithCache(
      cacheKey,
      async () => {
        return await prisma.driverStanding.findMany({
          where: { seasonId },
          include: {
            driver: true
          },
          orderBy: { position: 'asc' }
        })
      },
      { ttl: 1800, ...options }
    )
  }

  async getConstructorStandings(seasonId: string, options: QueryOptions = {}): Promise<(ConstructorStanding & { constructor: Constructor })[]> {
    const cacheKey = this.generateCacheKey('constructorStandings', { seasonId })

    return this.executeWithCache(
      cacheKey,
      async () => {
        return await prisma.constructorStanding.findMany({
          where: { seasonId },
          include: {
            constructor: true
          },
          orderBy: { position: 'asc' }
        })
      },
      { ttl: 1800, ...options }
    )
  }

  // ========================================
  // LAP TIMES & TELEMETRY
  // ========================================

  async getLapTimes(raceId: string, driverId?: string, options: QueryOptions = {}): Promise<LapTime[]> {
    const whereClause = {
      raceId,
      ...(driverId && { driverId })
    }

    return this.findManyOptimized(
      (args) => prisma.lapTime.findMany({
        ...args,
        where: whereClause,
        orderBy: { lap: 'asc' }
      }),
      { ttl: 7200, ...options }
    )
  }

  async getFastestLapsForRace(raceId: string): Promise<LapTime[]> {
    const cacheKey = this.generateCacheKey('fastestLaps', { raceId })

    return this.executeWithCache(
      cacheKey,
      async () => {
        return await prisma.lapTime.findMany({
          where: { raceId },
          include: {
            driver: {
              select: {
                id: true,
                code: true,
                givenName: true,
                familyName: true
              }
            }
          },
          orderBy: { milliseconds: 'asc' },
          take: 20 // Top 20 fastest laps
        })
      },
      { ttl: 3600 }
    )
  }

  async getTelemetryData(raceId: string, driverId: string, options: QueryOptions = {}): Promise<TelemetryData[]> {
    const { limit = 1000, offset = 0 } = options

    return this.findManyOptimized(
      (args) => prisma.telemetryData.findMany({
        ...args,
        where: { raceId, driverId },
        orderBy: { timestamp: 'asc' }
      }),
      { 
        ttl: 600, // 10 minutes - telemetry data changes frequently
        limit,
        offset,
        ...options 
      }
    )
  }

  // ========================================
  // ANALYTICS & COMPUTED DATA
  // ========================================

  async getSeasonStats(seasonId: string): Promise<SeasonStats | null> {
    const cacheKey = this.generateCacheKey('seasonStats', { seasonId })

    return this.executeWithCache(
      cacheKey,
      async () => {
        // Try to get existing computed stats
        let stats = await prisma.seasonStats.findUnique({
          where: { season: seasonId }
        })

        // If not found or outdated (older than 1 hour), recompute
        if (!stats || Date.now() - stats.computedAt.getTime() > 3600000) {
          stats = await this.computeSeasonStats(seasonId)
        }

        return stats
      },
      { ttl: 1800 }
    )
  }

  private async computeSeasonStats(seasonId: string): Promise<SeasonStats> {
    return await this.executeTransaction(
      async (tx) => {
        // Get basic counts
        const [raceCount, driverCount, constructorCount] = await Promise.all([
          tx.race.count({ where: { season: seasonId } }),
          tx.driver.count({
            where: {
              seasons: { some: { id: seasonId } }
            }
          }),
          tx.constructor.count({
            where: {
              seasons: { some: { id: seasonId } }
            }
          })
        ])

        // Get championship leaders
        const [driverLeader, constructorLeader] = await Promise.all([
          tx.driverStanding.findFirst({
            where: { seasonId },
            include: { driver: true },
            orderBy: { position: 'asc' }
          }),
          tx.constructorStanding.findFirst({
            where: { seasonId },
            include: { constructor: true },
            orderBy: { position: 'asc' }
          })
        ])

        // Get championship gaps
        const [driverSecond, constructorSecond] = await Promise.all([
          tx.driverStanding.findFirst({
            where: { seasonId, position: 2 }
          }),
          tx.constructorStanding.findFirst({
            where: { seasonId, position: 2 }
          })
        ])

        // Compute or update season stats
        const statsData = {
          season: seasonId,
          totalRaces: raceCount,
          totalDrivers: driverCount,
          totalConstructors: constructorCount,
          championshipLeader: driverLeader?.driver.familyName || null,
          championshipLeaderPoints: driverLeader?.points || null,
          championshipGap: driverSecond 
            ? (driverLeader?.points || 0) - driverSecond.points 
            : null,
          constructorLeader: constructorLeader?.constructor.name || null,
          constructorLeaderPoints: constructorLeader?.points || null,
          computedAt: new Date()
        }

        return await tx.seasonStats.upsert({
          where: { season: seasonId },
          create: statsData,
          update: statsData
        })
      },
      ['seasonStats']
    )
  }

  // ========================================
  // BULK OPERATIONS FOR DATA IMPORT
  // ========================================

  async bulkCreateRaceResults(results: any[]): Promise<number> {
    const createdCount = await this.executeTransaction(
      async (tx) => {
        const created = await tx.raceResult.createMany({
          data: results,
          skipDuplicates: true
        })
        return created.count
      },
      ['race', 'raceResults']
    )

    return createdCount
  }

  async bulkCreateLapTimes(lapTimes: any[]): Promise<number> {
    // Process in batches to avoid memory issues
    const batchSize = 5000
    let totalCreated = 0

    for (let i = 0; i < lapTimes.length; i += batchSize) {
      const batch = lapTimes.slice(i, i + batchSize)
      
      const batchCount = await this.executeTransaction(
        async (tx) => {
          const created = await tx.lapTime.createMany({
            data: batch,
            skipDuplicates: true
          })
          return created.count
        },
        i === 0 ? ['lapTime'] : [] // Only invalidate cache on first batch
      )
      
      totalCreated += batchCount
      console.log(`Processed lap times batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lapTimes.length / batchSize)}`)
    }

    return totalCreated
  }

  // ========================================
  // SEARCH & ANALYTICS
  // ========================================

  async searchDrivers(query: string, limit: number = 10): Promise<Driver[]> {
    const cacheKey = this.generateCacheKey('searchDrivers', { query, limit })

    return this.executeWithCache(
      cacheKey,
      async () => {
        return await prisma.driver.findMany({
          where: {
            OR: [
              { givenName: { contains: query, mode: 'insensitive' } },
              { familyName: { contains: query, mode: 'insensitive' } },
              { code: { contains: query, mode: 'insensitive' } }
            ]
          },
          take: limit,
          orderBy: { familyName: 'asc' }
        })
      },
      { ttl: 1800 }
    )
  }

  async getChampionshipBattle(seasonId: string, topN: number = 5): Promise<{
    drivers: (DriverStanding & { driver: Driver })[]
    constructors: (ConstructorStanding & { constructor: Constructor })[]
  }> {
    const cacheKey = this.generateCacheKey('championshipBattle', { seasonId, topN })

    return this.executeWithCache(
      cacheKey,
      async () => {
        const [drivers, constructors] = await Promise.all([
          prisma.driverStanding.findMany({
            where: { seasonId },
            include: { driver: true },
            orderBy: { position: 'asc' },
            take: topN
          }),
          prisma.constructorStanding.findMany({
            where: { seasonId },
            include: { constructor: true },
            orderBy: { position: 'asc' },
            take: topN
          })
        ])

        return { drivers, constructors }
      },
      { ttl: 1800 }
    )
  }
}

// Singleton instance
let f1Repository: F1Repository | null = null

export function getF1Repository(): F1Repository {
  if (!f1Repository) {
    f1Repository = new F1Repository()
  }
  return f1Repository
}