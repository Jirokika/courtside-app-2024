import { AnalyticsManager } from './analytics'
import { apiService } from './api'

/**
 * Points Tracker - Automatically tracks user actions and awards points
 */
export class PointsTracker {
  private static readonly TRACKED_ACTIONS = {
    FIRST_BOOKING: 'first-booking',
    PROFILE_COMPLETE: 'complete-profile',
    MULTIPLE_BOOKINGS: 'multiple-bookings',
    CREDIT_PURCHASE: 'credit-purchase',
    WEEKLY_USAGE: 'weekly-usage',
    SHARE_APP: 'share-app'
  }

  /**
   * Track when user completes their first booking
   */
  static async trackFirstBooking(bookingData: any): Promise<void> {
    try {
      // Track in analytics
      AnalyticsManager.track('points_task_progress', {
        taskId: this.TRACKED_ACTIONS.FIRST_BOOKING,
        action: 'booking_completed',
        bookingId: bookingData.id,
        sport: bookingData.sport
      })

      // Check if this is their first booking
      const events = AnalyticsManager.getEvents()
      const bookingEvents = events.filter(event => event.event === 'booking_complete')
      
      if (bookingEvents.length === 1) {
        // This is their first booking - award points
        await this.awardTaskPoints(this.TRACKED_ACTIONS.FIRST_BOOKING, 100, 'First booking completed!')
      }

      // Also check for multiple bookings milestone
      if (bookingEvents.length === 5) {
        await this.awardTaskPoints(this.TRACKED_ACTIONS.MULTIPLE_BOOKINGS, 200, '5 bookings completed!')
      }

    } catch (error) {
      console.error('Error tracking first booking:', error)
    }
  }

  /**
   * Track when user completes their profile
   */
  static async trackProfileCompletion(profileData: any): Promise<void> {
    try {
      // Check if profile is now complete
      const isComplete = this.isProfileComplete(profileData)
      
      if (isComplete) {
        AnalyticsManager.track('points_task_progress', {
          taskId: this.TRACKED_ACTIONS.PROFILE_COMPLETE,
          action: 'profile_completed'
        })

        await this.awardTaskPoints(this.TRACKED_ACTIONS.PROFILE_COMPLETE, 75, 'Profile completed!')
      }
    } catch (error) {
      console.error('Error tracking profile completion:', error)
    }
  }

  /**
   * Track when user purchases credits
   */
  static async trackCreditPurchase(purchaseData: any): Promise<void> {
    try {
      AnalyticsManager.track('points_task_progress', {
        taskId: this.TRACKED_ACTIONS.CREDIT_PURCHASE,
        action: 'credit_purchased',
        amount: purchaseData.amount,
        package: purchaseData.packageId
      })

      // Check if this is their first credit purchase
      const events = AnalyticsManager.getEvents()
      const creditEvents = events.filter(event => event.event === 'credit_purchase')
      
      if (creditEvents.length === 1) {
        await this.awardTaskPoints(this.TRACKED_ACTIONS.CREDIT_PURCHASE, 150, 'First credit purchase!')
      }

    } catch (error) {
      console.error('Error tracking credit purchase:', error)
    }
  }

  /**
   * Track daily app usage for weekly task
   */
  static async trackDailyUsage(): Promise<void> {
    try {
      const today = new Date().toDateString()
      
      AnalyticsManager.track('daily_app_usage', {
        date: today,
        timestamp: Date.now()
      })

      // Check if user has been active for 7 consecutive days
      if (await this.checkWeeklyUsage()) {
        await this.awardTaskPoints(this.TRACKED_ACTIONS.WEEKLY_USAGE, 50, 'Weekly usage milestone!')
      }

    } catch (error) {
      console.error('Error tracking daily usage:', error)
    }
  }

  /**
   * Track when user shares the app
   */
  static async trackAppShare(shareMethod: string): Promise<void> {
    try {
      AnalyticsManager.track('points_task_progress', {
        taskId: this.TRACKED_ACTIONS.SHARE_APP,
        action: 'app_shared',
        method: shareMethod
      })

      // Award points for each share (up to max limit)
      const events = AnalyticsManager.getEvents()
      const shareEvents = events.filter(event => 
        event.event === 'points_task_progress' && 
        event.properties?.taskId === this.TRACKED_ACTIONS.SHARE_APP
      )
      
      if (shareEvents.length <= 10) { // Max 10 shares
        await this.awardTaskPoints(this.TRACKED_ACTIONS.SHARE_APP, 25, `App shared! (+25 points)`)
      }

    } catch (error) {
      console.error('Error tracking app share:', error)
    }
  }

  /**
   * Award points for completing a task
   */
  private static async awardTaskPoints(taskId: string, points: number, message: string): Promise<void> {
    try {
      // Track the points award
      AnalyticsManager.track('points_awarded', {
        taskId,
        points,
        timestamp: Date.now()
      })

      // Call backend API to award points (if available)
      try {
        const response = await apiService.completeTask(taskId, { auto_completed: true })
        if (response.success) {
          console.log(`✅ Points awarded via API: ${points} points for ${taskId}`)
        }
      } catch (apiError) {
        console.log(`⚠️ API unavailable, points tracked locally: ${points} points for ${taskId}`)
      }

      // Show notification to user (could integrate with toast system)
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('success', message)
      } else {
        console.log(`🎉 ${message}`)
      }

    } catch (error) {
      console.error('Error awarding task points:', error)
    }
  }

  /**
   * Check if profile is complete
   */
  private static isProfileComplete(profileData: any): boolean {
    return !!(
      profileData?.firstName &&
      profileData?.lastName &&
      profileData?.photoUrl &&
      profileData?.email
    )
  }

  /**
   * Check if user has been active for 7 consecutive days
   */
  private static async checkWeeklyUsage(): Promise<boolean> {
    try {
      const events = AnalyticsManager.getEvents()
      const usageEvents = events.filter(event => event.event === 'daily_app_usage')
      
      // Get last 7 days
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        last7Days.push(date.toDateString())
      }

      // Check if user was active on all 7 days
      return last7Days.every(day => 
        usageEvents.some(event => 
          event.properties?.date === day
        )
      )
    } catch (error) {
      console.error('Error checking weekly usage:', error)
      return false
    }
  }

  /**
   * Get user's progress on all tasks
   */
  static async getUserProgress(): Promise<{
    bookingsCount: number
    profileComplete: boolean
    creditsPurchased: number
    weeklyActive: boolean
    sharesCount: number
  }> {
    try {
      const events = AnalyticsManager.getEvents()
      
      // Count bookings
      const bookingEvents = events.filter(event => event.event === 'booking_complete')
      const bookingsCount = bookingEvents.length

      // Check profile completion (mock for now)
      const profileComplete = Math.random() > 0.7

      // Count credit purchases
      const creditEvents = events.filter(event => event.event === 'credit_purchase')
      const creditsPurchased = creditEvents.length

      // Check weekly activity
      const weeklyActive = await this.checkWeeklyUsage()

      // Count shares
      const shareEvents = events.filter(event => 
        event.event === 'points_task_progress' && 
        event.properties?.taskId === this.TRACKED_ACTIONS.SHARE_APP
      )
      const sharesCount = shareEvents.length

      return {
        bookingsCount,
        profileComplete,
        creditsPurchased,
        weeklyActive,
        sharesCount
      }
    } catch (error) {
      console.error('Error getting user progress:', error)
      return {
        bookingsCount: 0,
        profileComplete: false,
        creditsPurchased: 0,
        weeklyActive: false,
        sharesCount: 0
      }
    }
  }

  /**
   * Initialize daily tracking (call on app start)
   */
  static async initDailyTracking(): Promise<void> {
    try {
      await this.trackDailyUsage()
    } catch (error) {
      console.error('Error initializing daily tracking:', error)
    }
  }
}