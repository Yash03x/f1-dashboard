'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js'
import { defaultChartOptions } from '@/lib/chartConfig'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface LineChartProps {
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
  height?: number
  title?: string
}

export function LineChart({ data, options, height = 400, title }: LineChartProps) {
  const chartOptions: ChartOptions<'line'> = {
    ...defaultChartOptions,
    ...options,
    plugins: {
      ...defaultChartOptions.plugins,
      ...options?.plugins,
      title: title ? {
        display: true,
        text: title,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold'
        }
      } : undefined
    }
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={data} options={chartOptions} />
    </div>
  )
}