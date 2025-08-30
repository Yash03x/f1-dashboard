import { query, transaction } from '../connection'
import { createLogger } from '@/lib/logger'
import * as fs from 'fs'
import * as path from 'path'

const logger = createLogger('migrations')

export interface Migration {
  id: string
  name: string
  up: string
  down: string
  executedAt?: Date
  checksum: string
}

export class MigrationManager {
  private migrationsPath: string

  constructor(migrationsPath: string = path.join(process.cwd(), 'src/lib/database/migrations')) {
    this.migrationsPath = migrationsPath
  }

  /**
   * Initialize the migrations table
   */
  async initialize(): Promise<void> {
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          checksum VARCHAR(64) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      
      logger.info('Migrations table initialized')
    } catch (error) {
      logger.error('Failed to initialize migrations table', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Get all executed migrations
   */
  async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const result = await query(`
        SELECT id, name, executed_at, checksum
        FROM migrations
        ORDER BY executed_at ASC
      `)
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        executedAt: row.executed_at,
        checksum: row.checksum,
        up: '', // Not stored in database
        down: '' // Not stored in database
      }))
    } catch (error) {
      logger.error('Failed to get executed migrations', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Get all migration files
   */
  async getMigrationFiles(): Promise<Migration[]> {
    try {
      if (!fs.existsSync(this.migrationsPath)) {
        logger.warn('Migrations directory does not exist', { path: this.migrationsPath })
        return []
      }

      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort()

      const migrations: Migration[] = []

      for (const file of files) {
        const filePath = path.join(this.migrationsPath, file)
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Parse migration file (format: -- UP: ... -- DOWN: ...)
        const upMatch = content.match(/-- UP:\s*\n([\s\S]*?)(?=\n-- DOWN:|$)/)
        const downMatch = content.match(/-- DOWN:\s*\n([\s\S]*?)$/)
        
        if (!upMatch) {
          logger.warn('Invalid migration file format (missing UP section)', { file })
          continue
        }

        const id = file.replace('.sql', '')
        const name = id.replace(/\d+_/, '').replace(/_/g, ' ')
        
        migrations.push({
          id,
          name,
          up: upMatch[1].trim(),
          down: downMatch ? downMatch[1].trim() : '',
          checksum: this.calculateChecksum(content)
        })
      }

      return migrations
    } catch (error) {
      logger.error('Failed to read migration files', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const [executedMigrations, allMigrations] = await Promise.all([
      this.getExecutedMigrations(),
      this.getMigrationFiles()
    ])

    const executedIds = new Set(executedMigrations.map(m => m.id))
    return allMigrations.filter(migration => !executedIds.has(migration.id))
  }

  /**
   * Run pending migrations
   */
  async migrate(target?: string): Promise<void> {
    try {
      await this.initialize()
      
      const pendingMigrations = await this.getPendingMigrations()
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations')
        return
      }

      // If target is specified, only run up to that migration
      const migrationsToRun = target 
        ? pendingMigrations.filter(m => m.id <= target)
        : pendingMigrations

      logger.info(`Running ${migrationsToRun.length} migrations`)

      for (const migration of migrationsToRun) {
        await this.runMigration(migration)
      }

      logger.info('All migrations completed successfully')
    } catch (error) {
      logger.error('Migration failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Run a single migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Running migration: ${migration.name}`, { id: migration.id })

      await transaction(async (client) => {
        // Execute the migration
        await client.query(migration.up)
        
        // Record the migration
        await client.query(`
          INSERT INTO migrations (id, name, checksum)
          VALUES ($1, $2, $3)
        `, [migration.id, migration.name, migration.checksum])
      })

      logger.info(`Migration completed: ${migration.name}`, { id: migration.id })
    } catch (error) {
      logger.error(`Migration failed: ${migration.name}`, { 
        id: migration.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(steps: number = 1): Promise<void> {
    try {
      const executedMigrations = await this.getExecutedMigrations()
      
      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback')
        return
      }

      const migrationsToRollback = executedMigrations
        .slice(-steps)
        .reverse()

      logger.info(`Rolling back ${migrationsToRollback.length} migrations`)

      for (const executedMigration of migrationsToRollback) {
        await this.rollbackMigration(executedMigration)
      }

      logger.info('Rollback completed successfully')
    } catch (error) {
      logger.error('Rollback failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(executedMigration: Migration): Promise<void> {
    try {
      // Get the migration file to get the down SQL
      const allMigrations = await this.getMigrationFiles()
      const migration = allMigrations.find(m => m.id === executedMigration.id)
      
      if (!migration || !migration.down) {
        logger.warn(`Cannot rollback migration ${executedMigration.id} - no down SQL found`)
        return
      }

      logger.info(`Rolling back migration: ${executedMigration.name}`, { id: executedMigration.id })

      await transaction(async (client) => {
        // Execute the rollback
        await client.query(migration.down)
        
        // Remove the migration record
        await client.query(`
          DELETE FROM migrations WHERE id = $1
        `, [executedMigration.id])
      })

      logger.info(`Rollback completed: ${executedMigration.name}`, { id: executedMigration.id })
    } catch (error) {
      logger.error(`Rollback failed: ${executedMigration.name}`, { 
        id: executedMigration.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    total: number
    executed: number
    pending: number
    migrations: Array<{
      id: string
      name: string
      status: 'executed' | 'pending'
      executedAt?: Date
    }>
  }> {
    try {
      const [executedMigrations, allMigrations] = await Promise.all([
        this.getExecutedMigrations(),
        this.getMigrationFiles()
      ])

      const executedIds = new Set(executedMigrations.map(m => m.id))
      const migrations = allMigrations.map(migration => ({
        id: migration.id,
        name: migration.name,
        status: executedIds.has(migration.id) ? 'executed' as const : 'pending' as const,
        executedAt: executedMigrations.find(m => m.id === migration.id)?.executedAt
      }))

      return {
        total: allMigrations.length,
        executed: executedMigrations.length,
        pending: allMigrations.length - executedMigrations.length,
        migrations
      }
    } catch (error) {
      logger.error('Failed to get migration status', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }

  /**
   * Calculate checksum for migration file
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
      const id = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`
      const fileName = `${id}.sql`
      const filePath = path.join(this.migrationsPath, fileName)

      const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- UP:
-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- DOWN:
-- Add your rollback SQL here
-- Example:
-- DROP TABLE example;
`

      if (!fs.existsSync(this.migrationsPath)) {
        fs.mkdirSync(this.migrationsPath, { recursive: true })
      }

      fs.writeFileSync(filePath, template)
      
      logger.info(`Created migration file: ${fileName}`)
      return filePath
    } catch (error) {
      logger.error('Failed to create migration file', { error: error instanceof Error ? error.message : 'Unknown error' })
      throw error
    }
  }
}

// Export singleton instance
export const migrationManager = new MigrationManager()
