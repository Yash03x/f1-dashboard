'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface BarChartProps {
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
  height?: number
  title?: string
}

export function BarChart({ data, options, height = 400, title }: BarChartProps) {
  const chartOptions: ChartOptions<'bar'> = {
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
      <Bar data={data} options={chartOptions} />
    </div>
  )
}