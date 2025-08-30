'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, StatsCard } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Trophy, Users, Clock, BarChart3, Target, Flag, Calendar } from 'lucide-react'
import { LineChart, BarChart } from '@/components/charts'
import { useChampionshipProgression, useDriverStandings, useConstructorStandings, useRaces, useLatestRaceResults } from '@/hooks/useF1Data'

export default function DashboardPage() {
  const { data: championshipData, isLoading: loadingChampionship } = useChampionshipProgression('2024')
  const { data: races, isLoading: loadingRaces } = useRaces('2024')
  const { data: driverStandings, isLoading: loadingDrivers } = useDriverStandings('2024')
  const { data: constructorStandings, isLoading: loadingConstructors } = useConstructorStandings('2024')
  const { data: latestRaceResults } = useLatestRaceResults('2024')

  return (
    <DashboardLayout 
      title="F1 Analytics Dashboard" 
      subtitle="Real-time Formula 1 data and insights for the 2024 season"
    >
      <div className="space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Races Completed"
            value={races?.filter(race => race.status === 'completed').length?.toString() || "0"}
            subtitle={`out of ${races?.length || 24} races`}
            icon={Flag}
            trend="neutral"
          />
          <StatsCard
            title="Championship Leader"
            value={driverStandings?.[0]?.name || "Loading..."}
            subtitle={`${driverStandings?.[0]?.points || 0} points`}
            icon={Trophy}
            trend="up"
            trendValue={`+${driverStandings?.[0]?.wins || 0} wins`}
          />
          <StatsCard
            title="Latest Winner"
            value={latestRaceResults?.results?.[0]?.driver || "Loading..."}
            subtitle={latestRaceResults?.raceName || "Recent race"}
            icon={Clock}
            trend="up"
            trendValue={latestRaceResults?.results?.[0]?.time || ""}
          />
          <StatsCard
            title="Active Drivers"
            value={driverStandings?.length?.toString() || "20"}
            subtitle={`across ${constructorStandings?.length || 10} teams`}
            icon={Users}
            trend="neutral"
          />
        </div>

        {/* Championship Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Driver Championship" subtitle="Points progression through the season" icon={Trophy}>
            {loadingChampionship ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <LineChart
                data={championshipData || { labels: [], datasets: [] }}
                height={300}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom' as const
                    }
                  }
                }}
              />
            )}
          </Card>

          <Card title="Constructor Standings" subtitle="Current team rankings" icon={BarChart3}>
            {loadingConstructors ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <BarChart
                data={{
                  labels: constructorStandings?.slice(0, 5).map(c => c.name) || [],
                  datasets: [
                    {
                      label: 'Constructor Points',
                      data: constructorStandings?.slice(0, 5).map(c => c.points) || [],
                      backgroundColor: constructorStandings?.slice(0, 5).map(c => c.color) || []
                    }
                  ]
                }}
                height={300}
                options={{
                  indexAxis: 'y' as const,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            )}
          </Card>
        </div>

        {/* Recent Races and Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Recent Race Results" subtitle="Latest race finishes" icon={Target}>
            {loadingRaces ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {latestRaceResults?.results?.slice(0, 5).map((result, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                        {result.position}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{result.driver}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{result.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-gray-900 dark:text-white">{result.time}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{result.points} pts</p>
                    </div>
                  </div>
                )) || []}
              </div>
            )}
          </Card>

          <Card title="Upcoming Races" subtitle="Next races in the calendar" icon={Calendar}>
            {loadingRaces ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {races?.filter(race => race.status === 'upcoming').slice(0, 4).map((race, index) => (
                  <div key={race.id} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{race.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{race.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900 dark:text-white">{new Date(race.date).toLocaleDateString()}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        index === 0 
                          ? 'bg-f1-red text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {index === 0 ? 'Next' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                )) || []}
              </div>
            )}
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card title="Season Performance Overview" subtitle="Key metrics and insights" icon={BarChart3}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-f1-red mb-2">85%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Red Bull Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-f1-red mb-2">1:05.432</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Fastest Lap</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-f1-red mb-2">47</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Overtakes</div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}