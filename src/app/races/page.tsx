'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useRaces } from '@/hooks/useF1Data'
import { Trophy, Calendar, MapPin, Clock } from 'lucide-react'

export default function RacesPage() {
  const { data: races, isLoading } = useRaces('2024')

  return (
    <DashboardLayout 
      title="Race Calendar" 
      subtitle="2024 Formula 1 World Championship races and results"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Races</p>
                <p className="text-2xl font-bold">{races?.length || 24}</p>
              </div>
              <Calendar className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold">{races?.filter(race => race.status === 'completed').length || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Countries</p>
                <p className="text-2xl font-bold">{new Set(races?.map(race => race.country)).size || 0}</p>
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

        {/* Race Calendar */}
        <Card title="Race Calendar" subtitle="All races in the 2024 season">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {races?.map((race, index) => (
                <div 
                  key={race.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-f1-red text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {race.round || race.id}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {race.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{race.country}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(race.date).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {race.winner}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        race.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {race.status === 'completed' ? 'Completed' : 'Upcoming'}
                      </span>
                    </div>
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}