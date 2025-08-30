'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LineChart, BarChart } from '@/components/charts'
import { useDriverStandings, useConstructorStandings, useChampionshipProgression, useRaces } from '@/hooks/useF1Data'
import { Trophy, TrendingUp, Users, Target } from 'lucide-react'

export default function StandingsPage() {
  const { data: drivers, isLoading: loadingDrivers } = useDriverStandings('2024')
  const { data: teams, isLoading: loadingTeams } = useConstructorStandings('2024')
  const { data: championshipData, isLoading: loadingChampionship } = useChampionshipProgression('2024')
  const { data: races } = useRaces('2024')

  return (
    <DashboardLayout 
      title="Championship Standings" 
      subtitle="Complete 2024 Formula 1 World Championship standings and analysis"
    >
      <div className="space-y-6">
        {/* Championship Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Driver Champion</p>
                <p className="text-lg font-bold">{drivers?.[0]?.name || 'Loading...'}</p>
                <p className="text-sm text-f1-red">{drivers?.[0]?.points || 0} points</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Constructor Champion</p>
                <p className="text-lg font-bold">{teams?.[0]?.name || 'Loading...'}</p>
                <p className="text-sm text-f1-red">{teams?.[0]?.points || 0} points</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Races Remaining</p>
                <p className="text-2xl font-bold">{races?.filter(race => race.status !== 'completed').length || 0}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Points Gap</p>
                <p className="text-2xl font-bold">{drivers && drivers.length > 1 ? (drivers[0].points - drivers[1].points) : 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
        </div>

        {/* Championship Progress */}
        <Card title="Championship Battle" subtitle="Points progression throughout the season" icon={TrendingUp}>
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
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Championship Points'
                    }
                  }
                }
              }}
            />
          )}
        </Card>

        {/* Driver and Constructor Standings Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Driver Standings */}
          <Card title="Driver Standings" subtitle="Top 10 drivers" icon={Trophy}>
            {loadingDrivers ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-3">
                {drivers?.slice(0, 10).map((driver, index) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        driver.position === 1 ? 'bg-yellow-500' : 
                        driver.position === 2 ? 'bg-gray-400' : 
                        driver.position === 3 ? 'bg-orange-600' : 'bg-gray-600'
                      }`}>
                        {driver.position}
                      </div>
                      <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded text-xs flex items-center justify-center font-mono font-bold">
                        {driver.code}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{driver.team}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{driver.points}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{driver.wins} wins</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Constructor Standings */}
          <Card title="Constructor Standings" subtitle="All teams" icon={Users}>
            {loadingTeams ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-3">
                {teams?.map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        team.position === 1 ? 'bg-yellow-500' : 
                        team.position === 2 ? 'bg-gray-400' : 
                        team.position === 3 ? 'bg-orange-600' : 'bg-gray-600'
                      }`}>
                        {team.position}
                      </div>
                      <div 
                        className="w-3 h-6 rounded"
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <div>
                        <p className="font-medium text-sm">{team.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{team.points}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{team.wins} wins</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Additional Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Championship Math" subtitle="Points scenarios">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Max points remaining</p>
                <p className="text-xl font-bold">400 points</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Verstappen can clinch in</p>
                <p className="text-xl font-bold text-f1-red">3 races</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mathematical elimination</p>
                <p className="text-xl font-bold">6 drivers</p>
              </div>
            </div>
          </Card>

          <Card title="Season Highlights" subtitle="Key statistics">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Most wins</span>
                <span className="font-bold">Verstappen (15)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Most poles</span>
                <span className="font-bold">Verstappen (9)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Most fastest laps</span>
                <span className="font-bold">Verstappen (5)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Different winners</span>
                <span className="font-bold">4 drivers</span>
              </div>
            </div>
          </Card>

          <Card title="Team Battle" subtitle="Constructor fight">
            <div className="space-y-3">
              {teams?.slice(0, 3).map((team, index) => {
                const nextTeam = teams[index + 1]
                if (!nextTeam) return null
                const pointsGap = team.points - nextTeam.points
                return (
                  <div key={`${team.id}-${nextTeam.id}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{team.name} vs {nextTeam.name}</span>
                      <span className="font-bold">+{pointsGap} pts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: team.color,
                          width: '100%' 
                        }}
                      ></div>
                    </div>
                  </div>
                )
              }) || []}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}