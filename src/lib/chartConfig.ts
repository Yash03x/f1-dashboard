import { ChartOptions } from 'chart.js'

// F1 Team Colors
export const F1_COLORS = {
  RED_BULL: '#3671C6',
  FERRARI: '#E8002D',
  MERCEDES: '#27F4D2',
  MCLAREN: '#FF8000',
  ASTON_MARTIN: '#229971',
  ALPINE: '#FF87BC',
  WILLIAMS: '#64C4FF',
  ALPHATAURI: '#5E8FAA',
  ALFA_ROMEO: '#C92D4B',
  HAAS: '#B6BABD',
} as const

// Chart.js default configuration
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: '#ffffff',
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#374151',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#9CA3AF'
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    },
    y: {
      ticks: {
        color: '#9CA3AF'
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      }
    }
  }
}

// Recharts theme configuration
export const rechartsTheme = {
  backgroundColor: '#111827',
  textColor: '#ffffff',
  axisColor: '#6B7280',
  gridColor: 'rgba(156, 163, 175, 0.1)',
}

// D3 Configuration
export const d3Config = {
  margin: { top: 20, right: 30, bottom: 40, left: 40 },
  colors: Object.values(F1_COLORS),
  darkTheme: {
    backgroundColor: '#111827',
    textColor: '#ffffff',
    axisColor: '#6B7280',
    gridColor: 'rgba(156, 163, 175, 0.1)',
  }
}