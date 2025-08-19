import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../utils/auth'
import { AuthGuard } from '../auth/AuthGuard'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { getRandomTitle } from '../../utils/dailyTitles'
import { BottomNavigation } from '../ui/BottomNavigation'
import { 
  Home,
  Calendar,
  Plus,
  User,
  ArrowRight,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react'

interface HomeScreenProps extends ScreenProps {}

interface BookingData {
  id: string
  sport: string
  date: string
  time: string
  duration: number
  courts: string[]
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'failed'
  totalAmount: number
  courtName?: string
  courtSport?: string
  createdAt: string
  updatedAt: string
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const { showToast } = useToast()
  const { isAuthenticated, user, error: authError } = useAuth()
  const { healthCheck, getCourts, getBookings, getNotifications, getCurrentUser } = useApi()
  const [upcomingBookings, setUpcomingBookings] = useState<BookingData[]>([])
  const [originalBookings, setOriginalBookings] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [credits, setCredits] = useState<number>(0)
  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  const handleBadmintonQuickBook = () => {
    updateBookingState({
      selectedSport: 'badminton',
      selectedDates: [],
      selectedTimeSlot: '',
      selectedDuration: 1,
      selectedCourts: [],
    })
    navigateTo('date-selection')
  }

  const handlePickleballQuickBook = () => {
    updateBookingState({
      selectedSport: 'pickleball',
      selectedDates: [],
      selectedTimeSlot: '',
      selectedDuration: 1,
      selectedCourts: [],
    })
    navigateTo('date-selection')
  }

  const handleViewAllBookings = () => {
    navigateTo('bookings')
  }

  const handleViewAllNotifications = () => {
    navigateTo('notifications')
  }

  const handleViewCredits = () => {
    navigateTo('credits')
  }

  const handleViewPoints = () => {
    navigateTo('points')
  }

  const handleBook = () => {
    navigateTo('sport-selection')
  }

  const handleProfile = () => {
    showToast('info', 'Profile feature coming soon')
  }

  // Fetch upcoming booking
  const fetchUpcomingBooking = async () => {
    try {
      setLoading(true)
      console.log('🔍 HomeScreen: Fetching upcoming bookings...')
      
      const response = await getBookings()
      console.log('🔍 HomeScreen: API response:', response)
      
      if (response.success && response.data && response.data.length > 0) {
        console.log('✅ HomeScreen: Found bookings:', response.data.length)
        // Transform backend data to frontend format
        const transformedBookings = response.data.map((booking: any) => {
          // Parse UTC time from backend and convert to Cambodia local time
          const startTime = new Date(booking.startTime)
          const endTime = new Date(booking.endTime)
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60))
          
          const validSport = booking.courtsport === 'pickleball' ? 'pickleball' : 'badminton'
          
          return {
            id: booking.id,
            sport: validSport,
            date: startTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              timeZone: 'Asia/Phnom_Penh'
            }),
            time: startTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true,
              timeZone: 'Asia/Phnom_Penh'
            }),
            duration: duration,
            courts: [booking.courtname || 'Court A'],
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            totalAmount: parseFloat(booking.totalPrice) || 0,
            courtName: booking.courtname,
            courtSport: validSport,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt
          }
        })
        
        // Find the next upcoming bookings (both confirmed and pending)
        const now = new Date()
        console.log('🕐 HomeScreen: Current time:', now.toISOString())
        
        const upcomingBookings = transformedBookings.filter((booking, index) => {
          const originalBooking = response.data[index]
          const bookingStartTime = new Date(originalBooking.startTime)
          
          console.log(`📅 HomeScreen: Checking booking ${booking.id}:`, {
            status: booking.status,
            startTime: originalBooking.startTime,
            parsedStartTime: bookingStartTime.toISOString(),
            isUpcoming: bookingStartTime > now,
            rawBooking: originalBooking
          })
          
          return booking.status === 'confirmed' && bookingStartTime > now
        }).sort((a, b) => {
          const originalA = response.data[transformedBookings.indexOf(a)]
          const originalB = response.data[transformedBookings.indexOf(b)]
          
          const dateA = new Date(originalA.startTime)
          const dateB = new Date(originalB.startTime)
          
          return dateA.getTime() - dateB.getTime()
        })
        
        console.log('✅ HomeScreen: Upcoming bookings found:', upcomingBookings.length)
        setUpcomingBookings(upcomingBookings)
        setOriginalBookings(response.data) // Store original booking data for time calculations
        
      } else {
        console.log('⚠️ HomeScreen: No bookings found or API error:', response.error)
        setUpcomingBookings([])
      }
      
    } catch (error) {
      console.error('❌ HomeScreen: Error fetching bookings:', error)
      setUpcomingBookings([])
    } finally {
      setLoading(false)
    }
  }

  // Get time until booking - using original booking data for accurate calculation
  const getTimeUntilBooking = (booking: BookingData) => {
    // Find the original booking data to get the actual start time
    const originalBooking = originalBookings.find(b => b.id === booking.id)
    if (!originalBooking) return 'Upcoming'
    
    // Get the original start time from the backend data
    const startTimeStr = originalBooking.startTime
    if (!startTimeStr) return 'Upcoming'
    
    const bookingDateTime = new Date(startTimeStr)
    const now = new Date()
    
    // Convert both times to Cambodia timezone for accurate calculation
    const bookingCambodiaTime = new Date(bookingDateTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    const nowCambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    console.log('🕐 Time calculation:', {
      bookingDateTime: bookingDateTime.toISOString(),
      now: now.toISOString(),
      bookingCambodiaTime: bookingCambodiaTime.toISOString(),
      nowCambodiaTime: nowCambodiaTime.toISOString(),
      bookingDate: booking.date,
      bookingTime: booking.time,
      originalStartTime: startTimeStr
    })
    
    const diffMs = bookingCambodiaTime.getTime() - nowCambodiaTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffMs < 0) return 'Past'
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} away`
    if (diffHours > 0) {
      // Show hours and minutes for more precise time display
      if (diffMinutes > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} min away`
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} away`
    }
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} away`
    return 'Starting now'
  }

  // Load upcoming booking, notifications, and user data on component mount
  useEffect(() => {
    fetchUpcomingBooking()
    fetchNotifications()
    fetchUserCredits()
  }, [])

  const fetchUserCredits = async () => {
    try {
      const response = await getCurrentUser()
      if (response.success && response.data) {
        setCredits(response.data.credits || 0)
        setPoints(response.data.points || 0)
      }
    } catch (error) {
      console.error('Error fetching user credits:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true)
      const response = await getNotifications()
      if (response.success && response.data) {
        setNotifications(response.data.slice(0, 6)) // Show 6 most recent notifications with scrolling
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoadingNotifications(false)
    }
  }

  // Dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Dynamic title for quick book - uses random titles from dailyTitles utility
  const getQuickBookTitle = () => {
    return getRandomTitle()
  }

  // Get user data from Telegram Web App
  const getUserData = () => {
    // Check if Telegram Web App is available
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      const user = tg.initDataUnsafe?.user
      
      if (user && user.first_name) {
        return {
          name: (user.first_name || 'User') + (user.last_name ? ' ' + user.last_name : ''),
          photoUrl: user.photo_url || null,
          firstName: user.first_name || 'User',
          lastName: user.last_name || ''
        }
      }
    }
    
    // Fallback for when Telegram Web App is not available
    return {
      name: 'User',
      photoUrl: null,
      firstName: 'User',
      lastName: ''
    }
  }

  const userData = getUserData()

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* User Profile Card */}
        <FadeIn delay={0.2}>
          <div className="mb-6 pt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                  {userData.photoUrl ? (
                    <img 
                      src={userData.photoUrl} 
                      alt={userData.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-semibold text-xl mb-1">
                    {getGreeting()}, {isAuthenticated ? user?.firstName : userData.firstName}!
                  </h2>
                  <p className="text-white/80 text-base mb-1">Welcome to Courtside</p>
                  <p className="text-white/60 text-sm">tap, pay, play!</p>
                  
                  {/* Authentication Status */}
                  <div className="mt-2">
                    {isAuthenticated ? (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-400">Authenticated</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{user?.credits || 0} credits</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-400">Guest Mode</span>
                        {authError && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-red-400 text-xs">{authError}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Quick Booking Card */}
        <FadeIn delay={0.4}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            {/* Dynamic Title Inside Quick Book Card */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white text-center">{getQuickBookTitle()}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Badminton Card */}
              <ScaleButton
                onClick={handleBadmintonQuickBook}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">
                    <span>🏸</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Badminton</h3>
                  <p className="text-white/70 text-sm mb-4">Quick Book</p>
                  <div className="w-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border border-white/30 py-3 rounded-xl font-semibold shadow-lg">
                    Book Now
                  </div>
                </div>
              </ScaleButton>

              {/* Pickleball Card */}
              <ScaleButton
                onClick={handlePickleballQuickBook}
                className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">
                    <span>🏓</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Pickleball</h3>
                  <p className="text-white/70 text-sm mb-4">Quick Book</p>
                  <div className="w-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border border-white/30 py-3 rounded-xl font-semibold shadow-lg">
                    Book Now
                  </div>
                </div>
              </ScaleButton>
            </div>
          </div>
        </FadeIn>

        {/* Your Upcoming Booking Card */}
        <FadeIn delay={0.5}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Your Confirmed Bookings</h3>
              <ScaleButton
                onClick={handleViewAllBookings}
                className="text-white/80 hover:text-white flex items-center text-sm"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </ScaleButton>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/70">Loading your confirmed bookings...</p>
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {upcomingBookings.map((booking, index) => (
                  <div key={booking.id} className="bg-white/10 backdrop-blur-md rounded-lg p-3 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-white font-semibold capitalize">{booking.sport}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white/80 text-sm">{getTimeUntilBooking(booking)}</div>
                        <div className="text-white/60 text-xs">{booking.date}</div>
                        <div className="text-white/60 text-xs">{booking.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/70">No confirmed bookings</p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Notifications Card */}
        <FadeIn delay={0.6}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <ScaleButton
                onClick={handleViewAllNotifications}
                className="text-white/80 hover:text-white flex items-center text-sm"
              >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </ScaleButton>
            </div>
            {loadingNotifications ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white/70">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="max-h-64 overflow-y-auto scrollbar-hide">
                <div className="space-y-3 pr-2">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-3 rounded-xl transition-all duration-200 ${
                      notification.isRead 
                        ? 'bg-white/5' 
                        : 'bg-white/10 border border-white/20'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className="text-xl mt-0.5">
                          {notification.type === 'reminder' ? '⏰' :
                           notification.type === 'confirmation' ? '✅' :
                           notification.type === 'modification' ? '📝' :
                           notification.type === 'cancellation' ? '❌' :
                           notification.type === 'payment' ? '💳' :
                           notification.type === 'credits' ? '💎' : '📬'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-white font-medium truncate">{notification.title}</h4>
                            <span className="text-white/50 text-xs whitespace-nowrap">
                              {(() => {
                                const date = new Date(notification.createdAt)
                                const now = new Date()
                                const diffMs = now.getTime() - date.getTime()
                                const diffMins = Math.floor(diffMs / (1000 * 60))
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                                if (diffMins < 60) return `${diffMins}m ago`
                                if (diffHours < 24) return `${diffHours}h ago`
                                if (diffDays < 7) return `${diffDays}d ago`
                                return date.toLocaleDateString()
                              })()}
                            </span>
                          </div>
                          <p className="text-white/70 text-sm truncate">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/70">No notifications yet</p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Credits and Points Section */}
        <FadeIn delay={0.7}>
          <div className="grid grid-cols-2 gap-4 mb-20">
            {/* Credits Card */}
            <ScaleButton
              onClick={handleViewCredits}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
            >
              <h4 className="text-white font-bold mb-2">Your Credits</h4>
              <div className="text-2xl font-bold text-white mb-1">{credits}</div>
              <p className="text-white/70 text-sm">credits available</p>
            </ScaleButton>

            {/* Points Card */}
            <ScaleButton
              onClick={handleViewPoints}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
            >
              <h4 className="text-white font-bold mb-2">Your Points</h4>
              <div className="text-2xl font-bold text-white mb-1">{points}</div>
              <p className="text-white/70 text-sm">points earned</p>
            </ScaleButton>
          </div>
        </FadeIn>
      </div>

      {/* Bottom Navigation Bar */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation
          currentScreen="home"
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