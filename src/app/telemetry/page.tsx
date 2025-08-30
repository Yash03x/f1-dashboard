'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { LineChart } from '@/components/charts'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useLiveTelemetry } from '@/hooks/useF1Data'
import { Activity, Gauge, Zap, Clock } from 'lucide-react'

const mockTelemetryData = {
  speed: {
    labels: ['0s', '10s', '20s', '30s', '40s', '50s', '60s'],
    datasets: [{
      label: 'Speed (km/h)',
      data: [0, 120, 280, 320, 310, 290, 315],
      borderColor: '#E8002D',
      backgroundColor: 'rgba(232, 0, 45, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  throttleBrake: {
    labels: ['0s', '10s', '20s', '30s', '40s', '50s', '60s'],
    datasets: [
      {
        label: 'Throttle (%)',
        data: [0, 85, 100, 95, 80, 90, 100],
        borderColor: '#00C851',
        backgroundColor: 'rgba(0, 200, 81, 0.1)',
        tension: 0.4
      },
      {
        label: 'Brake (%)',
        data: [0, 0, 0, 85, 100, 60, 0],
        borderColor: '#FF3547',
        backgroundColor: 'rgba(255, 53, 71, 0.1)',
        tension: 0.4
      }
    ]
  },
  gForces: {
    labels: ['0s', '10s', '20s', '30s', '40s', '50s', '60s'],
    datasets: [
      {
        label: 'Lateral G',
        data: [0, -2.1, 3.2, -1.8, 2.9, -3.1, 1.5],
        borderColor: '#3671C6',
        backgroundColor: 'rgba(54, 113, 198, 0.1)',
        tension: 0.4
      },
      {
        label: 'Longitudinal G',
        data: [0, 1.2, -4.8, 2.1, -3.2, 1.8, -2.1],
        borderColor: '#FF8000',
        backgroundColor: 'rgba(255, 128, 0, 0.1)',
        tension: 0.4
      }
    ]
  }
}

export default function TelemetryPage() {
  const { data: telemetryData, isLoading } = useLiveTelemetry()

  return (
    <DashboardLayout 
      title="Telemetry Analysis" 
      subtitle="Real-time car data and performance metrics from the 2024 season"
    >
      <div className="space-y-6">
        {/* Telemetry Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Max Speed</p>
                <p className="text-2xl font-bold">342</p>
                <p className="text-sm text-f1-red">km/h</p>
              </div>
              <Gauge className="h-8 w-8 text-f1-red" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Max G-Force</p>
                <p className="text-2xl font-bold">4.8</p>
                <p className="text-sm text-blue-600">lateral</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Lap Time</p>
                <p className="text-2xl font-bold">1:12.5</p>
                <p className="text-sm text-green-600">Monaco GP</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">DRS Usage</p>
                <p className="text-2xl font-bold">38%</p>
                <p className="text-sm text-purple-600">of lap</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Speed Analysis */}
        <Card title="Speed Trace" subtitle="Vehicle speed throughout a racing lap" icon={Gauge}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            <LineChart
              data={telemetryData?.speed || mockTelemetryData.speed}
              height={300}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Speed (km/h)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Time'
                    }
                  }
                }
              }}
            />
          )}
        </Card>

        {/* Throttle and Brake Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Throttle & Brake" subtitle="Driver inputs during the lap" icon={Activity}>
            <LineChart
              data={mockTelemetryData.throttleBrake}
              height={250}
              options={{
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                      display: true,
                      text: 'Input (%)'
                    }
                  }
                }
              }}
            />
          </Card>

          <Card title="G-Force Analysis" subtitle="Lateral and longitudinal forces" icon={Activity}>
            <LineChart
              data={mockTelemetryData.gForces}
              height={250}
              options={{
                scales: {
                  y: {
                    title: {
                      display: true,
                      text: 'G-Force'
                    }
                  }
                }
              }}
            />
          </Card>
        </div>

        {/* Detailed Telemetry Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Engine Data" subtitle="Power unit metrics">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">RPM</span>
                <span className="font-bold">15,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-f1-red h-2 rounded-full" style={{ width: '83%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">ERS Deployment</span>
                <span className="font-bold">67%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '67%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Fuel Flow</span>
                <span className="font-bold">98 kg/h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
          </Card>

          <Card title="Aerodynamics" subtitle="Downforce and drag">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Front Wing Angle</span>
                  <span className="font-bold">12°</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Rear Wing Angle</span>
                  <span className="font-bold">8°</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>DRS Activations</span>
                  <span className="font-bold">14</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  per lap on main straight
                </div>
              </div>
            </div>
          </Card>

          <Card title="Tire Data" subtitle="Compound and degradation">
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-f1-red rounded-full mb-2">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <p className="font-semibold">Soft Compound</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">12 laps old</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tire Temperature</span>
                  <span className="font-bold">98°C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tire Pressure</span>
                  <span className="font-bold">23.5 PSI</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Degradation</span>
                  <span className="font-bold text-orange-600">Medium</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Session Info */}
        <Card title="Session Information" subtitle="Current telemetry session details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Race Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Circuit</span>
                  <span className="font-medium">Monaco</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lap</span>
                  <span className="font-medium">42 / 78</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Position</span>
                  <span className="font-medium text-f1-red">P1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Gap to Leader</span>
                  <span className="font-medium">-</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Weather Conditions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Air Temperature</span>
                  <span className="font-medium">24°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Track Temperature</span>
                  <span className="font-medium">42°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Humidity</span>
                  <span className="font-medium">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Wind Speed</span>
                  <span className="font-medium">12 km/h</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Performance</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Best Lap Time</span>
                  <span className="font-medium text-green-600">1:12.345</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Lap Time</span>
                  <span className="font-medium">1:12.789</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sector 1 Best</span>
                  <span className="font-medium">23.123</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Top Speed</span>
                  <span className="font-medium">295 km/h</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}