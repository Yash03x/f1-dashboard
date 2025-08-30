'use client'

import { 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar
} from 'recharts'
import { rechartsTheme } from '@/lib/chartConfig'

interface RechartsLineProps {
  data: any[]
  dataKeys: { key: string; color: string; name?: string }[]
  xAxisKey: string
  height?: number
  title?: string
}

export function RechartsLine({ 
  data, 
  dataKeys, 
  xAxisKey, 
  height = 400, 
  title 
}: RechartsLineProps) {
  return (
    <div style={{ height: `${height}px`, backgroundColor: rechartsTheme.backgroundColor }}>
      {title && (
        <h3 className="text-white text-center mb-4 text-lg font-semibold">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={rechartsTheme.gridColor} />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: rechartsTheme.textColor, fontSize: 12 }}
            axisLine={{ stroke: rechartsTheme.axisColor }}
          />
          <YAxis 
            tick={{ fill: rechartsTheme.textColor, fontSize: 12 }}
            axisLine={{ stroke: rechartsTheme.axisColor }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              color: rechartsTheme.textColor,
              borderRadius: '8px'
            }}
          />
          <Legend 
            wrapperStyle={{ color: rechartsTheme.textColor }}
          />
          {dataKeys.map(({ key, color, name }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              name={name || key}
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface RechartsBarProps {
  data: any[]
  dataKeys: { key: string; color: string; name?: string }[]
  xAxisKey: string
  height?: number
  title?: string
}

export function RechartsBar({ 
  data, 
  dataKeys, 
  xAxisKey, 
  height = 400, 
  title 
}: RechartsBarProps) {
  return (
    <div style={{ height: `${height}px`, backgroundColor: rechartsTheme.backgroundColor }}>
      {title && (
        <h3 className="text-white text-center mb-4 text-lg font-semibold">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={rechartsTheme.gridColor} />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: rechartsTheme.textColor, fontSize: 12 }}
            axisLine={{ stroke: rechartsTheme.axisColor }}
          />
          <YAxis 
            tick={{ fill: rechartsTheme.textColor, fontSize: 12 }}
            axisLine={{ stroke: rechartsTheme.axisColor }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              color: rechartsTheme.textColor,
              borderRadius: '8px'
            }}
          />
          <Legend 
            wrapperStyle={{ color: rechartsTheme.textColor }}
          />
          {dataKeys.map(({ key, color, name }) => (
            <Bar
              key={key}
              dataKey={key}
              fill={color}
              name={name || key}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}