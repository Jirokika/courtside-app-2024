import React from 'react'

// Offline mode utility for caching booking data
export interface CachedBooking {
  id: string
  sport: string
  date: string
  time: string
  duration: number
  court: string
  status: 'pending' | 'confirmed' | 'cancelled'
  timestamp: number
}

export interface CachedUserData {
  credits: number
  points: number
  bookings: CachedBooking[]
  lastSync: number
}

export class OfflineManager {
  private static readonly CACHE_KEY = 'courtside_offline_data'
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Check if device is online
   */
  static isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Save booking data to cache
   */
  static cacheBookingData(data: Partial<CachedUserData>): void {
    try {
      const existing = this.getCachedData()
      const updated = {
        ...existing,
        ...data,
        lastSync: Date.now()
      }
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.warn('Failed to cache booking data:', error)
    }
  }

  /**
   * Get cached booking data
   */
  static getCachedData(): CachedUserData {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached) as CachedUserData
        // Check if cache is still valid
        if (Date.now() - data.lastSync < this.CACHE_DURATION) {
          return data
        }
      }
    } catch (error) {
      console.warn('Failed to get cached data:', error)
    }

    // Return default data if cache is invalid or missing
    return {
      credits: 150,
      points: 0,
      bookings: [],
      lastSync: 0
    }
  }

  /**
   * Clear cached data
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY)
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Check if cache is valid
   */
  static isCacheValid(): boolean {
    const data = this.getCachedData()
    return Date.now() - data.lastSync < this.CACHE_DURATION
  }

  /**
   * Get offline status message
   */
  static getOfflineStatus(): { isOffline: boolean; message: string } {
    const isOffline = !this.isOnline()
    const cacheValid = this.isCacheValid()

    if (isOffline && cacheValid) {
      return {
        isOffline: true,
        message: 'You\'re offline. Showing cached data.'
      }
    } else if (isOffline && !cacheValid) {
      return {
        isOffline: true,
        message: 'You\'re offline. Some features may be limited.'
      }
    } else {
      return {
        isOffline: false,
        message: ''
      }
    }
  }
}

// React hook for offline functionality
export const useOffline = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const [offlineStatus, setOfflineStatus] = React.useState(OfflineManager.getOfflineStatus())

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setOfflineStatus(OfflineManager.getOfflineStatus())
    }

    const handleOffline = () => {
      setIsOnline(false)
      setOfflineStatus(OfflineManager.getOfflineStatus())
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    offlineStatus,
    cacheData: OfflineManager.cacheBookingData,
    getCachedData: OfflineManager.getCachedData,
    clearCache: OfflineManager.clearCache,
    isCacheValid: OfflineManager.isCacheValid
  }
} 