import React, { useState, useEffect } from 'react'
import { AnalyticsManager } from '../../utils/analytics'

interface PerformanceMetrics {
  apiCalls: number
  averageResponseTime: number
  errorRate: number
  activeUsers: number
  bookingsToday: number
  systemHealth: string
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiCalls: 0,
    averageResponseTime: 0,
    errorRate: 0,
    activeUsers: 0,
    bookingsToday: 0,
    systemHealth: 'healthy'
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Simulate real-time metrics update
    const interval = setInterval(() => {
      updateMetrics()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const updateMetrics = () => {
    // In a real implementation, this would fetch from your analytics API
    setMetrics(prev => ({
      ...prev,
      apiCalls: prev.apiCalls + Math.floor(Math.random() * 10),
      averageResponseTime: Math.random() * 200 + 50,
      errorRate: Math.random() * 5,
      activeUsers: Math.floor(Math.random() * 50) + 10,
      bookingsToday: prev.bookingsToday + Math.floor(Math.random() * 3),
      systemHealth: Math.random() > 0.9 ? 'warning' : 'healthy'
    }))
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Dashboard"
      >
        📊
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">API Calls</span>
          <span className="font-mono text-sm">{metrics.apiCalls}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg Response Time</span>
          <span className="font-mono text-sm">{metrics.averageResponseTime.toFixed(0)}ms</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Error Rate</span>
          <span className="font-mono text-sm">{metrics.errorRate.toFixed(2)}%</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Active Users</span>
          <span className="font-mono text-sm">{metrics.activeUsers}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Bookings Today</span>
          <span className="font-mono text-sm">{metrics.bookingsToday}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">System Health</span>
          <span className={`font-mono text-sm ${getHealthColor(metrics.systemHealth)}`}>
            {metrics.systemHealth}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={updateMetrics}
          className="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Refresh Metrics
        </button>
      </div>
    </div>
  )
} 