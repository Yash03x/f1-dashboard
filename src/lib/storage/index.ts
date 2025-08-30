export { RobustStorage } from './StorageEngine'
export { F1DataStorage } from './F1DataStorage'

// Create singleton instance
import { F1DataStorage } from './F1DataStorage'

let f1Storage: F1DataStorage | null = null

export function getF1Storage(): F1DataStorage {
  if (!f1Storage) {
    f1Storage = new F1DataStorage()
  }
  return f1Storage
}

// Initialize storage on first import
export async function initializeF1Storage(): Promise<F1DataStorage> {
  const storage = getF1Storage()
  await storage.initialize()
  return storage
}