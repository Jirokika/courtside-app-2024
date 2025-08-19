// Analytics utility for user behavior tracking
export interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: number
  userId?: string
}

export interface UserAction {
  action: string
  screen: string
  duration?: number
  success?: boolean
  error?: string
}

export class AnalyticsManager {
  private static readonly STORAGE_KEY = 'courtside_analytics'
  private static readonly MAX_EVENTS = 1000
  private static events: AnalyticsEvent[] = []

  /**
   * Track a user event
   */
  static track(event: string, properties?: Record<string, any>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      userId: this.getUserId()
    }

    this.events.push(analyticsEvent)

    // Limit events to prevent memory issues
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS)
    }

    // Store events locally
    this.saveEvents()

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', analyticsEvent)
    }
  }

  /**
   * Track screen view
   */
  static trackScreenView(screen: string): void {
    this.track('screen_view', { screen })
  }

  /**
   * Track button click
   */
  static trackButtonClick(button: string, screen: string): void {
    this.track('button_click', { button, screen })
  }

  /**
   * Track booking flow step
   */
  static trackBookingStep(step: string, data?: Record<string, any>): void {
    this.track('booking_step', { step, ...data })
  }

  /**
   * Track booking completion
   */
  static trackBookingComplete(booking: {
    sport: string
    duration: number
    totalPrice: number
    paymentMethod: string
  }): void {
    this.track('booking_complete', booking)
  }

  /**
   * Track payment event
   */
  static trackPayment(method: string, amount: number, success: boolean): void {
    this.track('payment', { method, amount, success })
  }

  /**
   * Track error
   */
  static trackError(error: string, screen: string, context?: Record<string, any>): void {
    this.track('error', { error, screen, ...context })
  }

  /**
   * Track performance metric
   */
  static trackPerformance(metric: string, value: number, unit: string): void {
    this.track('performance', { metric, value, unit })
  }

  /**
   * Track API performance
   */
  static trackApiPerformance(endpoint: string, duration: number, success: boolean): void {
    this.track('api_performance', { endpoint, duration, success })
  }

  /**
   * Track page load performance
   */
  static trackPageLoad(duration: number, screen: string): void {
    this.track('page_load', { duration, screen })
  }

  /**
   * Track user engagement
   */
  static trackEngagement(action: string, screen: string, duration?: number): void {
    this.track('engagement', { action, screen, duration })
  }

  /**
   * Track system health
   */
  static trackSystemHealth(status: string, details?: Record<string, any>): void {
    this.track('system_health', { status, ...details })
  }

  /**
   * Get user ID (from Telegram or generate)
   */
  private static getUserId(): string {
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    return telegramUser?.id?.toString() || 'anonymous'
  }

  /**
   * Save events to localStorage
   */
  private static saveEvents(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events))
    } catch (error) {
      console.warn('Failed to save analytics events:', error)
    }
  }

  /**
   * Load events from localStorage
   */
  private static loadEvents(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.events = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load analytics events:', error)
    }
  }

  /**
   * Get all tracked events
   */
  static getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  /**
   * Clear all events
   */
  static clearEvents(): void {
    this.events = []
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Get analytics summary
   */
  static getSummary(): {
    totalEvents: number
    uniqueUsers: number
    mostCommonEvents: Array<{ event: string; count: number }>
    averageSessionDuration: number
  } {
    const userIds = new Set(this.events.map(e => e.userId))
    const eventCounts: Record<string, number> = {}
    
    this.events.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1
    })

    const mostCommonEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalEvents: this.events.length,
      uniqueUsers: userIds.size,
      mostCommonEvents,
      averageSessionDuration: 0 // Would calculate from session data
    }
  }

  /**
   * Initialize analytics
   */
  static init(): void {
    this.loadEvents()
    this.track('app_launch', { 
      userAgent: navigator.userAgent,
      platform: window.Telegram?.WebApp?.platform || 'web'
    })
  }
}

// React hook for analytics
export const useAnalytics = () => {
  return {
    track: AnalyticsManager.track,
    trackScreenView: AnalyticsManager.trackScreenView,
    trackButtonClick: AnalyticsManager.trackButtonClick,
    trackBookingStep: AnalyticsManager.trackBookingStep,
    trackBookingComplete: AnalyticsManager.trackBookingComplete,
    trackPayment: AnalyticsManager.trackPayment,
    trackError: AnalyticsManager.trackError,
    trackPerformance: AnalyticsManager.trackPerformance,
    getEvents: AnalyticsManager.getEvents,
    getSummary: AnalyticsManager.getSummary,
    clearEvents: AnalyticsManager.clearEvents
  }
} 