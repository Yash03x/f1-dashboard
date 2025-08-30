import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'

export interface StorageOptions {
  baseDir: string
  maxSize?: number // Max file size in bytes
  compression?: boolean
  encryption?: boolean
  backupCount?: number
  ttl?: number // Time to live in milliseconds
}

export interface StorageMetadata {
  key: string
  size: number
  created: number
  lastAccessed: number
  lastModified: number
  ttl?: number
  checksum: string
  version: string
}

export class RobustStorage {
  private baseDir: string
  private metadataDir: string
  private backupDir: string
  private maxSize: number
  private backupCount: number
  private defaultTTL: number

  constructor(options: StorageOptions) {
    this.baseDir = path.resolve(options.baseDir)
    this.metadataDir = path.join(this.baseDir, '.metadata')
    this.backupDir = path.join(this.baseDir, '.backups')
    this.maxSize = options.maxSize || 100 * 1024 * 1024 // 100MB default
    this.backupCount = options.backupCount || 3
    this.defaultTTL = options.ttl || 24 * 60 * 60 * 1000 // 24 hours
  }

  // Initialize storage system
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.baseDir, { recursive: true }),
        fs.mkdir(this.metadataDir, { recursive: true }),
        fs.mkdir(this.backupDir, { recursive: true })
      ])
      
      // Verify write permissions
      const testFile = path.join(this.baseDir, '.write-test')
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)
      
      console.log(`Storage engine initialized: ${this.baseDir}`)
    } catch (error) {
      console.error('Failed to initialize storage:', error)
      throw new Error(`Storage initialization failed: ${error}`)
    }
  }

  // Generate safe file key
  private sanitizeKey(key: string): string {
    return key
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .toLowerCase()
      .substring(0, 100) // Limit key length
  }

  // Generate checksum
  private generateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex')
  }

  // Get file paths
  private getFilePaths(key: string) {
    const safeKey = this.sanitizeKey(key)
    return {
      data: path.join(this.baseDir, `${safeKey}.json`),
      metadata: path.join(this.metadataDir, `${safeKey}.meta.json`),
      backup: path.join(this.backupDir, `${safeKey}.backup.json`)
    }
  }

  // Store data with full robustness
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const paths = this.getFilePaths(key)
    const jsonData = JSON.stringify(data, null, 2)
    const checksum = this.generateChecksum(jsonData)
    const now = Date.now()

    // Check size limits
    if (Buffer.byteLength(jsonData, 'utf8') > this.maxSize) {
      throw new Error(`Data exceeds maximum size limit: ${this.maxSize} bytes`)
    }

    try {
      // Create backup if file exists
      try {
        await fs.access(paths.data)
        await this.createBackup(key)
      } catch {
        // File doesn't exist, no backup needed
      }

      // Create metadata
      const metadata: StorageMetadata = {
        key,
        size: Buffer.byteLength(jsonData, 'utf8'),
        created: now,
        lastAccessed: now,
        lastModified: now,
        ttl: ttl || this.defaultTTL,
        checksum,
        version: '1.0.0'
      }

      // Atomic write: write to temp files first
      const tempDataPath = `${paths.data}.tmp`
      const tempMetaPath = `${paths.metadata}.tmp`

      await Promise.all([
        fs.writeFile(tempDataPath, jsonData, 'utf8'),
        fs.writeFile(tempMetaPath, JSON.stringify(metadata, null, 2), 'utf8')
      ])

      // Atomic rename to final locations
      await Promise.all([
        fs.rename(tempDataPath, paths.data),
        fs.rename(tempMetaPath, paths.metadata)
      ])

      console.log(`✓ Stored ${key} (${metadata.size} bytes)`)
    } catch (error) {
      console.error(`Failed to store ${key}:`, error)
      
      // Cleanup temp files
      try {
        await Promise.all([
          fs.unlink(`${paths.data}.tmp`).catch(() => {}),
          fs.unlink(`${paths.metadata}.tmp`).catch(() => {})
        ])
      } catch {}
      
      throw error
    }
  }

  // Retrieve data with integrity checking
  async get<T>(key: string): Promise<T | null> {
    const paths = this.getFilePaths(key)

    try {
      // Check if files exist
      await Promise.all([
        fs.access(paths.data),
        fs.access(paths.metadata)
      ])

      // Load metadata first
      const metadataRaw = await fs.readFile(paths.metadata, 'utf8')
      const metadata: StorageMetadata = JSON.parse(metadataRaw)

      // Check TTL
      if (metadata.ttl && Date.now() - metadata.created > metadata.ttl) {
        console.log(`Cache expired for ${key}, removing...`)
        await this.delete(key)
        return null
      }

      // Load and verify data
      const dataRaw = await fs.readFile(paths.data, 'utf8')
      const currentChecksum = this.generateChecksum(dataRaw)

      if (currentChecksum !== metadata.checksum) {
        console.error(`Data integrity check failed for ${key}`)
        
        // Try to restore from backup
        const restored = await this.restoreFromBackup(key)
        if (restored) {
          return restored as T
        }
        
        throw new Error(`Data corruption detected for ${key}`)
      }

      // Update last accessed time
      metadata.lastAccessed = Date.now()
      await fs.writeFile(paths.metadata, JSON.stringify(metadata, null, 2), 'utf8')

      return JSON.parse(dataRaw) as T
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null // File doesn't exist
      }
      
      console.error(`Failed to retrieve ${key}:`, error)
      
      // Try backup recovery
      const restored = await this.restoreFromBackup(key)
      if (restored) {
        return restored as T
      }
      
      return null
    }
  }

  // Create backup
  private async createBackup(key: string): Promise<void> {
    const paths = this.getFilePaths(key)
    
    try {
      // Create timestamped backup
      const timestamp = Date.now()
      const backupPath = path.join(this.backupDir, `${this.sanitizeKey(key)}_${timestamp}.json`)
      
      await fs.copyFile(paths.data, backupPath)
      
      // Cleanup old backups (keep only backupCount most recent)
      await this.cleanupOldBackups(key)
    } catch (error) {
      console.error(`Failed to create backup for ${key}:`, error)
    }
  }

  // Restore from backup
  private async restoreFromBackup(key: string): Promise<any | null> {
    try {
      const backupPattern = `${this.sanitizeKey(key)}_`
      const files = await fs.readdir(this.backupDir)
      
      const backups = files
        .filter(f => f.startsWith(backupPattern) && f.endsWith('.json'))
        .sort()
        .reverse() // Most recent first

      for (const backupFile of backups) {
        try {
          const backupPath = path.join(this.backupDir, backupFile)
          const data = await fs.readFile(backupPath, 'utf8')
          const parsed = JSON.parse(data)
          
          console.log(`✓ Restored ${key} from backup: ${backupFile}`)
          
          // Re-store the restored data
          await this.set(key, parsed)
          return parsed
        } catch (error) {
          console.error(`Failed to restore from backup ${backupFile}:`, error)
          continue
        }
      }
      
      return null
    } catch (error) {
      console.error(`Backup restoration failed for ${key}:`, error)
      return null
    }
  }

  // Cleanup old backups
  private async cleanupOldBackups(key: string): Promise<void> {
    try {
      const backupPattern = `${this.sanitizeKey(key)}_`
      const files = await fs.readdir(this.backupDir)
      
      const backups = files
        .filter(f => f.startsWith(backupPattern) && f.endsWith('.json'))
        .sort()
        .reverse() // Most recent first

      // Keep only the most recent backups
      const toDelete = backups.slice(this.backupCount)
      
      await Promise.all(
        toDelete.map(file => 
          fs.unlink(path.join(this.backupDir, file)).catch(() => {})
        )
      )
    } catch (error) {
      console.error(`Failed to cleanup backups for ${key}:`, error)
    }
  }

  // Delete data and metadata
  async delete(key: string): Promise<void> {
    const paths = this.getFilePaths(key)
    
    try {
      await Promise.all([
        fs.unlink(paths.data).catch(() => {}),
        fs.unlink(paths.metadata).catch(() => {})
      ])
      
      console.log(`✓ Deleted ${key}`)
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error)
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    const paths = this.getFilePaths(key)
    
    try {
      await fs.access(paths.data)
      return true
    } catch {
      return false
    }
  }

  // Get storage statistics
  async getStats(): Promise<{
    totalFiles: number
    totalSize: number
    cacheHits: number
    cacheMisses: number
  }> {
    try {
      const files = await fs.readdir(this.baseDir)
      const dataFiles = files.filter(f => f.endsWith('.json') && !f.includes('.tmp'))
      
      let totalSize = 0
      for (const file of dataFiles) {
        try {
          const filePath = path.join(this.baseDir, file)
          const stats = await fs.stat(filePath)
          totalSize += stats.size
        } catch {}
      }

      return {
        totalFiles: dataFiles.length,
        totalSize,
        cacheHits: 0, // TODO: Implement proper metrics
        cacheMisses: 0
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return { totalFiles: 0, totalSize: 0, cacheHits: 0, cacheMisses: 0 }
    }
  }

  // Clear all data
  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.baseDir)
      const deletePromises = files
        .filter(f => !f.startsWith('.'))
        .map(f => fs.unlink(path.join(this.baseDir, f)).catch(() => {}))
      
      await Promise.all(deletePromises)
      console.log('✓ Storage cleared')
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }

  // Perform maintenance operations
  async maintenance(): Promise<void> {
    console.log('Running storage maintenance...')
    
    try {
      // Remove expired files
      const files = await fs.readdir(this.metadataDir)
      const now = Date.now()
      
      for (const file of files.filter(f => f.endsWith('.meta.json'))) {
        try {
          const metaPath = path.join(this.metadataDir, file)
          const metadata: StorageMetadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
          
          if (metadata.ttl && now - metadata.created > metadata.ttl) {
            const key = file.replace('.meta.json', '')
            await this.delete(key)
            console.log(`✓ Expired: ${key}`)
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error)
        }
      }
      
      // Cleanup orphaned metadata files
      await this.cleanupOrphanedFiles()
      
      console.log('✓ Storage maintenance completed')
    } catch (error) {
      console.error('Storage maintenance failed:', error)
    }
  }

  private async cleanupOrphanedFiles(): Promise<void> {
    try {
      const metaFiles = await fs.readdir(this.metadataDir)
      const dataFiles = await fs.readdir(this.baseDir)
      
      for (const metaFile of metaFiles) {
        if (!metaFile.endsWith('.meta.json')) continue
        
        const key = metaFile.replace('.meta.json', '')
        const dataFile = `${key}.json`
        
        if (!dataFiles.includes(dataFile)) {
          await fs.unlink(path.join(this.metadataDir, metaFile))
          console.log(`✓ Removed orphaned metadata: ${metaFile}`)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error)
    }
  }
}