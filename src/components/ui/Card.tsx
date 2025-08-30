'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  icon?: LucideIcon
  className?: string
  loading?: boolean
}

export function Card({ children, title, subtitle, icon: Icon, className = '', loading = false }: CardProps) {
  return (
    <div className={`dashboard-card p-6 ${className}`}>
      {(title || subtitle || Icon) && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {title && (
              <div className="flex items-center space-x-3">
                {Icon && <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-f1-red"></div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  className = '' 
}: StatsCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-500'
      case 'down': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className={`dashboard-card p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trendValue && (
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trend === 'up' && '↑'}{trend === 'down' && '↓'}{trendValue}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </div>
        )}
      </div>
    </div>
  )
}