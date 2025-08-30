'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRaces } from '@/hooks/useF1Data'
import { Calendar, MapPin, Clock, Trophy, Flag } from 'lucide-react'

export default function CalendarPage() {
  const { data: races, isLoading } = useRaces('2024')

  const nextRace = races?.find(race => race.status !== 'completed')
  const completedRaces = races?.filter(race => race.status === 'completed').length || 0

  return (
    <DashboardLayout 
      title="Race Calendar" 
      subtitle="2024 Formula 1 World Championship calendar and schedule"
    >
      <div className="space-y-6">
        {/* Calendar Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Next Race</p>
                <p className="text-lg font-bold">{nextRace?.name || 'Season Complete'}</p>
                <p className="text-sm text-f1-red">{nextRace?.country}</p>
              </div>
              <Flag className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Races</p>
                <p className="text-2xl font-bold">{completedRaces}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">of 24</p>
              </div>
              <Trophy className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Countries Visited</p>
                <p className="text-2xl font-bold">{new Set(races?.filter(race => race.status === 'completed').map(race => race.country)).size || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">of {new Set(races?.map(race => race.country)).size || 0}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Season Progress</p>
                <p className="text-2xl font-bold">{races && races.length > 0 ? Math.round((completedRaces / races.length) * 100) : 0}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">complete</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Next Race Highlight */}
        {nextRace && (
          <Card title="Next Race" subtitle="Upcoming Formula 1 Grand Prix">
            <div className="bg-gradient-to-r from-f1-red/10 to-red-600/10 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {nextRace.name}
                  </h3>
                  <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{nextRace.country}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(nextRace.date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-f1-red text-white px-4 py-2 rounded-lg">
                    <p className="text-sm font-medium">Round {nextRace.round || nextRace.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Full Calendar */}
        <Card title="2024 Season Calendar" subtitle="Complete race schedule">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {races?.map((race) => {
                const raceDate = new Date(race.date)
                const isUpcoming = race.status !== 'completed'
                
                return (
                  <div 
                    key={race.id}
                    className={`p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${
                      isUpcoming 
                        ? 'border-f1-red/30 bg-f1-red/5 hover:bg-f1-red/10' 
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        isUpcoming
                          ? 'bg-f1-red text-white'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        Round {race.round || race.id}
                      </div>
                      <span className={`text-xs font-medium ${
                        isUpcoming ? 'text-f1-red' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {isUpcoming ? 'Upcoming' : 'Completed'}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {race.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-3 w-3" />
                        <span>{race.country}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{raceDate.toLocaleDateString()}</span>
                      </div>
                      {!isUpcoming && (
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-3 w-3" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {race.winner}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Season Timeline */}
        <Card title="Season Timeline" subtitle="Visual representation of the 2024 season">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Season Progress</span>
                <span>{completedRaces}/{races?.length || 24} races completed</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-f1-red h-3 rounded-full transition-all duration-500"
                  style={{ width: `${races && races.length > 0 ? (completedRaces / races.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Calendar className="h-6 w-6 text-f1-red mx-auto mb-2" />
                <p className="font-semibold">Season Start</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">March 2, 2024</p>
                <p className="text-xs">Bahrain GP</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Flag className="h-6 w-6 text-f1-red mx-auto mb-2" />
                <p className="font-semibold">Mid-Season</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">July 21, 2024</p>
                <p className="text-xs">Hungarian GP</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Trophy className="h-6 w-6 text-f1-red mx-auto mb-2" />
                <p className="font-semibold">Season Finale</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">December 8, 2024</p>
                <p className="text-xs">Abu Dhabi GP</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}