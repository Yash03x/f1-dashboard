# F1 Dashboard Data Management

This directory contains the data management system for the F1 Dashboard, including caching and API integration.

## Structure

- `/cache/` - Local cache files for F1 data (JSON format)
- `dataPreloader.ts` - Script for preloading and maintaining local data cache

## Data Sources

### Primary APIs
1. **Jolpica F1 API** (Ergast replacement) - Historical race data, results, standings
2. **OpenF1 API** - Real-time and detailed telemetry data

### Cache Strategy
- Data is cached locally for 24 hours
- Historical data (race results, standings) cached longer as it doesn't change
- Real-time telemetry data has shorter cache duration
- Automatic cache invalidation and refresh

## Usage

```typescript
import { F1DataManager } from '@/lib/dataManager'

// Get cached or fetch from API
const seasons = await F1DataManager.getSeasons()
const races = await F1DataManager.getRaces('2024')
const results = await F1DataManager.getRaceResults('2024', '1')

// Preload entire season data
await F1DataManager.preloadSeasonData('2024')
```

## Cache Management

The cache system automatically:
- Creates cache directories
- Validates cache expiration
- Handles cache misses gracefully
- Provides cache clearing utilities

All data is stored as JSON files in the `/cache` directory with descriptive naming patterns.