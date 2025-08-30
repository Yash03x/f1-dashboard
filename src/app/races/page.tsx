'use client'

import { Suspense, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Trophy, Calendar, MapPin, Clock } from 'lucide-react'

// Database query function
async function getRacesFromDatabase(season: string = '2024') {
  const response = await fetch(`/api/races/${season}`, {
    next: { revalidate: 3600 } // Revalidate every hour
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch races')
  }
  
  const result = await response.json()
  return result.data
}

// Races list component
async function RacesList({ season }: { season: string }) {
  const races = await getRacesFromDatabase(season)
  
  return (
    <div className="space-y-4">
      {races.map((race: any) => (
        <Card key={race.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-f1-red text-white rounded-full flex items-center justify-center text-sm font-bold">
                {race.round}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {race.race_name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{race.circuit_country}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(race.race_date).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  race.status === 'completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {race.status === 'completed' ? 'Completed' : 'Upcoming'}
                </span>
              </div>
              {race.race_results && (
                <Trophy className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </div>
          
          {/* Show race results if available */}
          {race.race_results && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Top 3 Results</h5>
              <div className="space-y-1">
                {race.race_results.slice(0, 3).map((result: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="flex items-center">
                      <span className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                        {index + 1}
                      </span>
                      {result.driver_name}
                    </span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">
                      {result.constructor_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// Season selector component
function SeasonSelector({ currentSeason, onSeasonChange }: { 
  currentSeason: string
  onSeasonChange: (season: string) => void 
}) {
  const seasons = ['2024', '2023', '2022', '2021']
  
  return (
    <div className="flex space-x-2 mb-6">
      {seasons.map((season) => (
        <button
          key={season}
          onClick={() => onSeasonChange(season)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentSeason === season
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {season}
        </button>
      ))}
    </div>
  )
}

// Main races page component
export default function RacesPage() {
  const [currentSeason, setCurrentSeason] = useState('2024')

  return (
    <DashboardLayout 
      title="Race Calendar" 
      subtitle={`${currentSeason} Formula 1 World Championship races and results`}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Races</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <Calendar className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Countries</p>
                <p className="text-2xl font-bold">21</p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
                <p className="text-2xl font-bold">1h 35m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Season selector */}
        <SeasonSelector 
          currentSeason={currentSeason} 
          onSeasonChange={(season) => {
            setCurrentSeason(season)
            // This would trigger a page refresh with the new season
            // For now, we'll just update the state
          }} 
        />
        
        {/* Races list with Suspense for loading state */}
        <Card title="Race Calendar" subtitle={`All races in the ${currentSeason} season`}>
          <Suspense fallback={<LoadingSpinner />}>
            <RacesList season={currentSeason} />
          </Suspense>
        </Card>
      </div>
    </DashboardLayout>
  )
}