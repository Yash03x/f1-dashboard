'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useDriverStandings } from '@/hooks/useF1Data'
import { User, Trophy, Target, Globe } from 'lucide-react'

export default function DriversPage() {
  const { data: drivers, isLoading } = useDriverStandings('2024')

  return (
    <DashboardLayout 
      title="Driver Standings" 
      subtitle="2024 Formula 1 World Drivers' Championship"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Drivers</p>
                <p className="text-2xl font-bold">{drivers?.length || 0}</p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Race Winners</p>
                <p className="text-2xl font-bold">{drivers?.filter(driver => driver.wins > 0).length || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Championship Leader</p>
                <p className="text-lg font-bold">{drivers?.[0]?.name || 'Loading...'}</p>
              </div>
              <Target className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Countries</p>
                <p className="text-2xl font-bold">{new Set(drivers?.map(driver => driver.nationality)).size || 0}</p>
              </div>
              <Globe className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Driver Standings */}
        <Card title="2024 Driver Standings" subtitle="Current championship positions">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-3">
              {drivers?.map((driver, index) => (
                <div 
                  key={driver.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      driver.position === 1 ? 'bg-yellow-500' : 
                      driver.position === 2 ? 'bg-gray-400' : 
                      driver.position === 3 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {driver.position}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded text-xs flex items-center justify-center font-mono font-bold">
                        {driver.code}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {driver.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {driver.team} • {driver.nationality}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-right">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {driver.points}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Points</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-yellow-600">
                        {driver.wins}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Wins</p>
                    </div>
                    {driver.wins > 0 && (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    )}
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