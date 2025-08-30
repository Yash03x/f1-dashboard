'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useConstructorStandings } from '@/hooks/useF1Data'
import { Users, Trophy, Target, Flag } from 'lucide-react'

export default function TeamsPage() {
  const { data: teams, isLoading } = useConstructorStandings('2024')

  return (
    <DashboardLayout 
      title="Constructor Standings" 
      subtitle="2024 Formula 1 World Constructors' Championship"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Teams</p>
                <p className="text-2xl font-bold">{teams?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teams with Wins</p>
                <p className="text-2xl font-bold">{teams?.filter(team => team.wins > 0).length || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Championship Leader</p>
                <p className="text-lg font-bold">{teams?.[0]?.name || 'Loading...'}</p>
              </div>
              <Target className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Constructors Gap</p>
                <p className="text-2xl font-bold">{teams && teams.length > 1 ? (teams[0].points - teams[1].points) : 0}</p>
              </div>
              <Flag className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Constructor Standings */}
        <Card title="2024 Constructor Standings" subtitle="Current championship positions">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {teams?.map((team, index) => (
                <div 
                  key={team.id}
                  className="flex items-center justify-between p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      team.position === 1 ? 'bg-yellow-500' : 
                      team.position === 2 ? 'bg-gray-400' : 
                      team.position === 3 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {team.position}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-4 h-8 rounded"
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Formula 1 Team
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8 text-right">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {team.points}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Points</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-600">
                        {team.wins}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Wins</p>
                    </div>
                    {team.wins > 0 && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Team Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Top Performing Teams" subtitle="Based on wins and podiums">
            <div className="space-y-4">
              {teams?.slice(0, 3).map((team, index) => (
                <div key={team.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-6 rounded"
                      style={{ backgroundColor: team.color }}
                    ></div>
                    <span className="font-medium">{team.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{team.wins} wins</span>
                    {team.wins > 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Championship Battle" subtitle="Points progression">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-f1-red">
                  {teams && teams.length > 1 ? (teams[0].points - teams[1].points) : 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Points gap between 1st and 2nd
                </p>
              </div>
              <div className="space-y-2">
                {teams?.slice(0, 2).map((team, index) => (
                  <div key={team.id}>
                    <div className="flex justify-between text-sm">
                      <span>{team.name}</span>
                      <span className="font-bold">{team.points} pts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: team.color,
                          width: `${index === 0 ? 100 : teams ? (team.points / teams[0].points) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}