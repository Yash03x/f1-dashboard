import { useQuery } from '@tanstack/react-query'
import { RealF1DataService } from '@/lib/services/realF1Data'

// Custom hooks for F1 data fetching with real APIs

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: () => RealF1DataService.getSeasons(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - seasons don't change often
    gcTime: 24 * 60 * 60 * 1000,
  })
}

export function useRaces(season: string = '2024') {
  return useQuery({
    queryKey: ['races', season],
    queryFn: () => RealF1DataService.getRaces(season),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!season
  })
}

export function useRaceResults(season: string = '2024', round?: string) {
  return useQuery({
    queryKey: ['raceResults', season, round],
    queryFn: () => RealF1DataService.getRaceResults(season, round),
    staleTime: round ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000, // 24h for specific race, 5min for latest
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!season
  })
}

export function useDriverStandings(season: string = '2024') {
  return useQuery({
    queryKey: ['driverStandings', season],
    queryFn: () => RealF1DataService.getDriverStandings(season),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!season
  })
}

export function useConstructorStandings(season: string = '2024') {
  return useQuery({
    queryKey: ['constructorStandings', season],
    queryFn: () => RealF1DataService.getConstructorStandings(season),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!season
  })
}

export function useDrivers(season: string = '2024') {
  return useQuery({
    queryKey: ['drivers', season],
    queryFn: () => RealF1DataService.getDrivers(season),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!season
  })
}

export function useConstructors(season: string = '2024') {
  return useQuery({
    queryKey: ['constructors', season],
    queryFn: () => RealF1DataService.getConstructors(season),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!season
  })
}

export function useChampionshipProgression(season: string = '2024') {
  return useQuery({
    queryKey: ['championshipProgression', season],
    queryFn: () => RealF1DataService.getChampionshipProgression(season),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    enabled: !!season
  })
}

export function useLiveTelemetry(sessionKey?: number) {
  return useQuery({
    queryKey: ['liveTelemetry', sessionKey],
    queryFn: () => RealF1DataService.getLiveTelemetry(sessionKey),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: true,
    refetchInterval: 30 * 1000 // Refetch every 30 seconds for live data
  })
}

export function useLatestRaceResults(season: string = '2024') {
  return useQuery({
    queryKey: ['latestRaceResults', season],
    queryFn: () => RealF1DataService.getRaceResults(season),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!season
  })
}