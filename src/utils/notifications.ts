import React from 'react'

// Push notifications utility for booking reminders and updates
export interface NotificationData {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  silent?: boolean
}

export class NotificationManager {
  private static readonly PERMISSION_KEY = 'courtside_notification_permission'

  /**
   * Check if notifications are supported
   */
  static isSupported(): boolean {
    return 'Notification' in window
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      localStorage.setItem(this.PERMISSION_KEY, permission)
      return permission === 'granted'
    } catch (error) {
      console.warn('Failed to request notification permission:', error)
      return false
    }
  }

  /**
   * Check if permission is granted
   */
  static hasPermission(): boolean {
    if (!this.isSupported()) return false
    return Notification.permission === 'granted'
  }

  /**
   * Send a notification
   */
  static sendNotification(data: NotificationData): void {
    if (!this.hasPermission()) {
      console.warn('Notification permission not granted')
      return
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false
      })

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!data.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      return notification
    } catch (error) {
      console.warn('Failed to send notification:', error)
    }
  }

  /**
   * Send booking confirmation notification
   */
  static sendBookingConfirmation(booking: {
    sport: string
    date: string
    time: string
    court: string
  }): void {
    this.sendNotification({
      title: 'Booking Confirmed! 🎾',
      body: `Your ${booking.sport} booking for ${booking.date} at ${booking.time} on Court ${booking.court} has been confirmed.`,
      tag: 'booking-confirmation',
      requireInteraction: true
    })
  }

  /**
   * Send booking modification notification
   */
  static sendBookingModification(booking: {
    sport: string
    date: string
    time: string
    court: string
    changes: string[]
  }): void {
    this.sendNotification({
      title: 'Booking Modified! 🔄',
      body: `Your ${booking.sport} booking has been updated. Changes: ${booking.changes.join(', ')}.`,
      tag: 'booking-modification',
      requireInteraction: true
    })
  }

  /**
   * Send booking cancellation notification
   */
  static sendBookingCancellation(booking: {
    sport: string
    date: string
    time: string
    court: string
    reason?: string
  }): void {
    this.sendNotification({
      title: 'Booking Cancelled! ❌',
      body: `Your ${booking.sport} booking for ${booking.date} at ${booking.time} has been cancelled${booking.reason ? `: ${booking.reason}` : ''}.`,
      tag: 'booking-cancellation',
      requireInteraction: true
    })
  }

  /**
   * Send payment success notification
   */
  static sendPaymentSuccess(amount: number, method: string): void {
    this.sendNotification({
      title: 'Payment Successful! 💳',
      body: `Payment of $${amount} via ${method} has been processed successfully.`,
      tag: 'payment-success',
      requireInteraction: false
    })
  }

  /**
   * Send payment failure notification
   */
  static sendPaymentFailure(amount: number, method: string, error?: string): void {
    this.sendNotification({
      title: 'Payment Failed! ❌',
      body: `Payment of $${amount} via ${method} failed${error ? `: ${error}` : ''}. Please try again.`,
      tag: 'payment-failure',
      requireInteraction: true
    })
  }

  /**
   * Send booking reminder notification
   */
  static sendBookingReminder(booking: {
    sport: string
    date: string
    time: string
    court: string
  }): void {
    this.sendNotification({
      title: 'Upcoming Booking Reminder ⏰',
      body: `Don't forget! You have a ${booking.sport} booking tomorrow at ${booking.time} on Court ${booking.court}.`,
      tag: 'booking-reminder'
    })
  }

  /**
   * Send payment reminder notification
   */
  static sendPaymentReminder(amount: number): void {
    this.sendNotification({
      title: 'Payment Reminder 💳',
      body: `Please complete your payment of $${amount} to confirm your booking.`,
      tag: 'payment-reminder',
      requireInteraction: true
    })
  }

  /**
   * Send credits update notification
   */
  static sendCreditsUpdate(credits: number): void {
    this.sendNotification({
      title: 'Credits Updated 💰',
      body: `Your credits have been updated. You now have ${credits} credits available.`,
      tag: 'credits-update'
    })
  }
}

// React hook for notifications
export const useNotifications = () => {
  const [permission, setPermission] = React.useState<NotificationPermission | 'default'>('default')

  React.useEffect(() => {
    if (NotificationManager.isSupported()) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    const granted = await NotificationManager.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
    return granted
  }

  return {
    isSupported: NotificationManager.isSupported,
    hasPermission: NotificationManager.hasPermission,
    permission,
    requestPermission,
    sendNotification: NotificationManager.sendNotification,
    sendBookingConfirmation: NotificationManager.sendBookingConfirmation,
    sendBookingReminder: NotificationManager.sendBookingReminder,
    sendPaymentReminder: NotificationManager.sendPaymentReminder,
    sendCreditsUpdate: NotificationManager.sendCreditsUpdate
  }
} 