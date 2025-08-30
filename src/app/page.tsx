'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Users, Clock, BarChart3, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="f1-gradient p-2 rounded-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">F1 Analytics Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                2024 Season • Live Data
              </div>
              <Link
                href="/dashboard"
                className="bg-f1-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <span>View Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-6">
            Complete Formula 1 Analytics
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Comprehensive dashboard featuring race results, driver statistics, team performance, 
            telemetry analysis, and historical data from the world of Formula 1.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 bg-f1-red text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors duration-200"
          >
            <span>Explore Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/races" className="dashboard-card p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <span className="text-sm text-gray-400">Champions</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Race Results</h3>
            <p className="text-gray-300 text-sm">Complete race results, qualifying times, and championship standings</p>
          </Link>

          <Link href="/drivers" className="dashboard-card p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-blue-500" />
              <span className="text-sm text-gray-400">Analytics</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Driver Stats</h3>
            <p className="text-gray-300 text-sm">In-depth driver performance analysis and career statistics</p>
          </Link>

          <Link href="/telemetry" className="dashboard-card p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-8 w-8 text-green-500" />
              <span className="text-sm text-gray-400">Telemetry</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Lap Analysis</h3>
            <p className="text-gray-300 text-sm">Detailed lap times, sector analysis, and telemetry data</p>
          </Link>

          <Link href="/teams" className="dashboard-card p-6 bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <span className="text-sm text-gray-400">Teams</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Team Performance</h3>
            <p className="text-gray-300 text-sm">Constructor standings and team performance metrics</p>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6">2024 Season Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-f1-red mb-1">24</div>
              <div className="text-sm text-gray-400">Races</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-1">20</div>
              <div className="text-sm text-gray-400">Drivers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-1">10</div>
              <div className="text-sm text-gray-400">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">∞</div>
              <div className="text-sm text-gray-400">Data Points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}