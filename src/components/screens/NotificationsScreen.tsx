import React, { useState, useEffect } from 'react'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { ScreenProps, Notification } from '../../types'
import { BottomNavigation } from '../ui/BottomNavigation'
import { LoadingScreen } from './LoadingScreen'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface NotificationsScreenProps extends ScreenProps {}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigateTo,
  appState,
}) => {
  const { showToast } = useToast()
  const { getNotifications, markNotificationAsRead } = useApi()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await getNotifications()
      if (response.success && response.data) {
        setNotifications(response.data)
      } else {
        showToast('error', 'Failed to load notifications')
      }
    } catch (error) {
      showToast('error', 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Get all unread notification IDs
      const unreadNotifications = notifications.filter(n => !n.isRead)
      
      if (unreadNotifications.length === 0) {
        showToast('info', 'All notifications are already read')
        return
      }

      // Mark each unread notification as read
      const markPromises = unreadNotifications.map(notification => 
        markNotificationAsRead(notification.id)
      )
      
      await Promise.all(markPromises)
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      showToast('success', `Marked ${unreadNotifications.length} notifications as read`)
      
    } catch (error) {
      showToast('error', 'Failed to mark notifications as read')
    }
  }

  const handleBack = () => {
    navigateTo('home')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '⏰'
      case 'confirmation':
        return '✅'
      case 'modification':
        return '📝'
      case 'cancellation':
        return '❌'
      case 'payment':
        return '💳'
      default:
        return '📬'
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffMs = now.getTime() - notificationDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return notificationDate.toLocaleDateString()
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="mb-8 pt-8">
            <div className="flex items-center justify-between mb-2">
              <ScaleButton
                onClick={handleBack}
                className="w-10 h-10 text-white hover:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </ScaleButton>
              
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              
              {notifications.some(n => !n.isRead) && (
                <ScaleButton
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
                >
                  <span className="text-sm font-medium">Mark All Read</span>
                </ScaleButton>
              )}
              
              {!notifications.some(n => !n.isRead) && (
                <div className="w-10 h-10" />
              )}
            </div>
            <p className="text-center text-gray-200">Stay updated with your bookings</p>
          </div>
        </FadeIn>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <FadeIn key={notification.id}>
                <div 
                  className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 border transition-all duration-200 ${
                    notification.isRead 
                      ? 'border-white/10' 
                      : 'border-white/30 bg-white/20'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{notification.title}</h3>
                        <span className="text-gray-300 text-sm">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-200 text-sm">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))
          ) : (
            <div className="text-center py-12">
              <BellOff className="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70">No notifications yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="notifications"
          onNavigate={navigateTo}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50 p-4 text-center text-white">
          Navigation unavailable
        </div>
      )}
    </div>
  )
}