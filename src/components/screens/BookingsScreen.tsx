import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '../ui/Button'
import { BottomNavigation } from '../ui/BottomNavigation'
import { ScreenProps } from '../../types'
import { RefreshCw, Plus, Calendar, Clock, MapPin, DollarSign, Share2, Edit, X, CheckCircle, MoreVertical, CreditCard, Trash2, Copy, ExternalLink, History, ChevronLeft } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../utils/api'
import { getCurrentUser, isTelegramWebApp, getTelegramWebAppData } from '../../utils/telegram'
import { NotificationManager } from '../../utils/notifications'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface BookingsScreenProps extends ScreenProps {}

interface BookingData {
  id: string
  sport: string
  date: string
  time: string
  duration: number
  courts: string[]
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'failed'
  paymentTrackingId?: string
  paymentMethod?: string
  paymentDate?: string
  totalAmount: number
  courtName?: string
  courtSport?: string
  createdAt: string
  updatedAt: string
  startTime?: string
}

// Get status badge styling
const getStatusBadge = (status: string, paymentStatus: string, isHistory: boolean = false) => {
  const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold border'
  
  // For history view, show different colors for "Refunded" and "Completed"
  if (isHistory) {
    if (status === 'cancelled') {
      return `${baseClasses} bg-orange-500/20 text-orange-300 border-orange-300/30`
    }
    if (status === 'confirmed') {
      return `${baseClasses} bg-gray-500/20 text-gray-300 border-gray-300/30`
    }
  }
  
  switch (status) {
    case 'confirmed':
      return `${baseClasses} bg-green-500/20 text-green-300 border-green-300/30`
    case 'pending':
      return paymentStatus === 'paid' 
        ? `${baseClasses} bg-blue-500/20 text-blue-300 border-blue-300/30`
        : `${baseClasses} bg-yellow-500/20 text-yellow-300 border-yellow-300/30`
    case 'cancelled':
      return `${baseClasses} bg-red-500/20 text-red-300 border-red-300/30`
    case 'completed':
      return `${baseClasses} bg-gray-500/20 text-gray-300 border-gray-300/30`
    default:
      return `${baseClasses} bg-gray-500/20 text-gray-300 border-gray-300/30`
  }
}

const getStatusText = (status: string, paymentStatus: string, isHistory: boolean = false) => {
  if (status === 'pending' && paymentStatus === 'paid') {
    return 'Awaiting Confirmation'
  }
  
  // For history view, show "Refunded" instead of "Cancelled"
  if (isHistory && status === 'cancelled') {
    return 'Refunded'
  }
  
  switch (status) {
    case 'confirmed': 
      // For history view, check if booking time has passed to show "Completed"
      return isHistory ? 'Completed' : 'Confirmed'
    case 'pending': return 'Pending Payment'
    case 'cancelled': return 'Cancelled'
    case 'completed': return 'Completed'
    default: return 'Unknown'
  }
}





export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  navigateTo,
  updateBookingState,
}) => {
  const { showToast } = useToast()
  const { getBookings, cancelBooking, confirmBooking, authenticateTelegram } = useApi()
  const currentUser = getCurrentUser()
  
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [showHistory, setShowHistory] = useState(false)

  // Helper function to parse date safely for both mock and real data
  const parseBookingDate = (dateString: string) => {
    // Try parsing as formatted date (for real data: "Saturday, December 15, 2025")
    const dateMatch = dateString.match(/(\w+), (\w+ \d+, \d{4})/)
    if (dateMatch) {
      const dateStr = dateMatch[2]
      const parsedDate = new Date(dateStr)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
    }
    
    // Try parsing as ISO date (for mock data: "2025-12-15")
    const isoDate = new Date(dateString)
    if (!isNaN(isoDate.getTime())) {
      return isoDate
    }
    
    // If both fail, return a past date to avoid counting as upcoming
    console.warn('⚠️ Could not parse booking date:', dateString)
    return new Date('2020-01-01')
  }

  // Separate current/upcoming and past bookings
  const { currentBookings, pastBookings, bookingStats } = useMemo(() => {
    const now = new Date()
    
    const current = bookings.filter(b => {
      // Use the original UTC time from backend for accurate comparison
      let bookingStartTime = new Date(b.createdAt ? b.createdAt : new Date().toISOString())
      // For bookings with startTime, use that instead
      if (b.startTime) {
        bookingStartTime = new Date(b.startTime)
      }
      
      return (b.status === 'confirmed' || b.status === 'pending') && bookingStartTime > now
    })
    
    const past = bookings.filter(b => {
      // Use the original UTC time from backend for accurate comparison
      let bookingStartTime = new Date(b.createdAt ? b.createdAt : new Date().toISOString())
      // For bookings with startTime, use that instead
      if (b.startTime) {
        bookingStartTime = new Date(b.startTime)
      }
      
      return b.status === 'completed' || b.status === 'cancelled' || bookingStartTime < now
    })
    
    return {
      currentBookings: current,
      pastBookings: past,
      bookingStats: {
        upcoming: current.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        past: past.length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        total: bookings.length
      }
    }
  }, [bookings])

  // Fetch bookings from API with retry mechanism
  const fetchBookings = async (retryCount = 0) => {
    try {
      setLoading(true)
      console.log('📱 BookingsScreen: Fetching bookings...')
      
      // Check if user is authenticated
      if (!currentUser) {
        setBookings([])
        setLoading(false)
        return
      }

      // Try to authenticate if we don't have a token
      const authToken = localStorage.getItem('auth_token')
      
      if (!authToken && currentUser.id !== 123456789) {
        try {
          const authResponse = await authenticateTelegram(currentUser)
          if (!authResponse.success) {
            showToast('error', 'Authentication failed')
            setBookings([])
            setLoading(false)
            return
          }
        } catch (error) {
          showToast('error', 'Authentication error')
          setBookings([])
          setLoading(false)
          return
        }
      }
      
      const response = await getBookings()
      
      if (response.success && response.data) {
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
            paymentTrackingId: booking.paymentTrackingId,
            paymentMethod: booking.paymentMethod,
            paymentDate: booking.paymentDate,
            totalAmount: parseFloat(booking.totalPrice) || 0,
            courtName: booking.courtname,
            courtSport: validSport,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
            startTime: booking.startTime
          }
        })
        
        setBookings(transformedBookings)
        showToast('info', `Loaded ${transformedBookings.length} bookings`)
      } else {
        // Retry logic for network errors
        if (retryCount < 3 && !response.error?.includes('authentication')) {
          setTimeout(() => fetchBookings(retryCount + 1), 1000 * (retryCount + 1))
          return
        }
        
        showToast('error', response.error || 'Failed to load bookings')
        setBookings([])
      }
    } catch (error) {
      // Retry logic for network errors
      if (retryCount < 3) {
        setTimeout(() => fetchBookings(retryCount + 1), 1000 * (retryCount + 1))
        return
      }
      
      showToast('error', 'Network error - please check your connection')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  // Handle booking actions
  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const response = await cancelBooking(bookingId, reason)
      if (response.success) {
        showToast('info', 'Booking cancelled successfully')
        
        // Send cancellation notification
        const booking = bookings.find(b => b.id === bookingId)
        if (booking) {
          NotificationManager.sendBookingCancellation({
            sport: booking.sport,
            date: booking.date,
            time: booking.time,
            court: booking.courtName || 'Court',
            reason: reason
          })
        }
        
        setDetailsOpen(false)
        fetchBookings() // Refresh bookings
      } else {
        showToast('error', response.error || 'Failed to cancel booking')
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      showToast('error', 'Failed to cancel booking')
    }
  }

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const response = await confirmBooking(bookingId)
      if (response.success) {
        showToast('info', 'Booking confirmed successfully')
        fetchBookings() // Refresh bookings
      } else {
        showToast('error', response.error || 'Failed to confirm booking')
      }
    } catch (error) {
      console.error('Error confirming booking:', error)
      showToast('error', 'Failed to confirm booking')
    }
  }

  const handleShareBooking = async (booking: BookingData) => {
    try {
      const shareData = {
        title: 'Courtside Booking',
        text: `I have a ${booking.sport} booking at ${booking.courtName} on ${booking.date} at ${booking.time}`,
        url: window.location.href
      }
      
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.text)
        showToast('info', 'Booking details copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing booking:', error)
      showToast('error', 'Failed to share booking')
    }
  }

  const handlePayBooking = async (booking: BookingData) => {
    try {
      // Check if booking is already paid
      if (booking.paymentStatus === 'paid') {
        showToast('info', 'Booking is already paid')
        return
      }

      // Show payment modal
      setDetailsOpen(false)
      setShowPayModal(true)
      setBooking(booking)
    } catch (error) {
      console.error('Error processing payment:', error)
      showToast('error', 'Failed to process payment')
    }
  }

  const handleModifyBooking = async (booking: BookingData) => {
    try {
      // Check if booking can be modified
      if (booking.status === 'cancelled' || booking.status === 'completed') {
        showToast('error', 'This booking cannot be modified')
        return
      }

      // Convert the real booking data to the format expected by modification screen
      const bookingForModification = {
        ...booking,
        id: booking.id, // Use real booking ID
        date: booking.date, // Use real booking date
        time: booking.time, // Use real booking time
        duration: booking.duration, // Use real booking duration
        sport: booking.sport, // Use real booking sport
        court: booking.courtName || booking.courts[0], // Use real court name
        status: booking.status, // Use real booking status
        paymentMethod: booking.paymentMethod || 'credits', // Use real payment method
        originalAmount: booking.totalAmount, // Use real booking amount
        modificationCount: 0 // Start with 0 modifications
      }

      // Navigate to modification screen with real booking data
      setDetailsOpen(false)
      updateBookingState({
        selectedBooking: bookingForModification
      })
      navigateTo('booking-modification')
    } catch (error) {
      console.error('Error modifying booking:', error)
      showToast('error', 'Failed to modify booking')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBookings()
    setRefreshing(false)
    showToast('info', 'Bookings refreshed')
  }

  const handleNewBooking = () => {
    navigateTo('sport-selection')
  }

  const handleShowHistory = () => {
    setShowHistory(true)
  }

  const handleBackToBookings = () => {
    setShowHistory(false)
  }



  // Load bookings on component mount
  useEffect(() => {
    fetchBookings()
  }, [])

  // Debug information for authentication issues
  useEffect(() => {
    console.log('🔍 BookingsScreen Debug Information:')
    console.log('  - Current User:', currentUser)
    console.log('  - Is Telegram WebApp:', isTelegramWebApp())
    console.log('  - WebApp Data:', getTelegramWebAppData())
    console.log('  - Window Telegram:', typeof window !== 'undefined' ? !!window.Telegram : 'SSR')
    console.log('  - Window Telegram WebApp:', typeof window !== 'undefined' ? !!window.Telegram?.WebApp : 'SSR')
    
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      console.log('  - WebApp initData:', window.Telegram.WebApp.initData)
      console.log('  - WebApp initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe)
      console.log('  - WebApp user:', window.Telegram.WebApp.initDataUnsafe.user)
    }

  }, [currentUser])

  // WebSocket real-time updates (disabled for now)
  useEffect(() => {
    console.log('📱 BookingsScreen: WebSocket disabled - backend support coming soon')
    
    // Note: vendor.js error is a development-only Vite HMR issue, not affecting functionality
    // This error won't appear in production or Telegram WebApp
    
    // TODO: Enable WebSocket when backend supports it
    // let ws: WebSocket | null = null
    // 
    // const connectWebSocket = () => {
    //   try {
    //     ws = new WebSocket('wss://courtside-backend-production.up.railway.app')
    //     
    //     ws.onopen = () => {
    //       console.log('📱 BookingsScreen: WebSocket connected')
    //     }
    //     
    //     ws.onmessage = (event) => {
    //       try {
    //         const data = JSON.parse(event.data)
    //         if (data.type === 'BOOKING_UPDATE' && data.userId === currentUser?.id) {
    //           console.log('📱 BookingsScreen: Real-time booking update received')
    //           fetchBookings() // Refresh bookings
    //         }
    //     } catch (error) {
    //       console.error('📱 BookingsScreen: Error parsing WebSocket message:', error)
    //     }
    //   }
    //   
    //   ws.onerror = (error) => {
    //     console.error('📱 BookingsScreen: WebSocket error:', error)
    //   }
    //   
    //   ws.onclose = () => {
    //     console.log('📱 BookingsScreen: WebSocket disconnected, attempting to reconnect...')
    //     setTimeout(connectWebSocket, 5000) // Reconnect after 5 seconds
    //   }
    // } catch (error) {
    //   console.error('📱 BookingsScreen: WebSocket connection failed:', error)
    // }
    // }
    // 
    // if (currentUser) {
    //   connectWebSocket()
    // }
    // 
    // return () => {
    //   if (ws) {
    //     try {
    //       ws.close()
    //     } catch (error) {
    //       console.log('📱 BookingsScreen: WebSocket cleanup error:', error)
    //     }
    //   }
    // }
  }, [currentUser])

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <div className="flex items-center space-x-3">
            {showHistory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToBookings}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">
                {showHistory ? 'Booking History' : 'My Bookings'}
              </h1>
              <p className="text-gray-200">
                {showHistory ? 'View your past bookings' : 'Manage your court reservations'}
              </p>
            </div>
          </div>
          {!showHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowHistory}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20 px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span className="text-sm font-medium">History</span>
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <FadeIn delay={0.1}>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {showHistory ? bookingStats.past : bookingStats.upcoming}
                </div>
                <div className="text-gray-300 text-sm">
                  {showHistory ? 'Past' : 'Upcoming'}
                </div>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {showHistory ? bookingStats.cancelled : bookingStats.pending}
                </div>
                <div className="text-gray-300 text-sm">
                  {showHistory ? 'Refunded' : 'Pending'}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Main Content - Bookings List or Calendar */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-gray-300">Loading your bookings...</p>
            </div>
          ) : (showHistory ? pastBookings : currentBookings).length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-red-400" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {showHistory ? 'No Booking History' : 'No Current Bookings'}
              </h2>
              <p className="text-gray-300 mb-6">
                {showHistory 
                  ? 'You don\'t have any past bookings yet.' 
                  : 'You don\'t have any upcoming bookings.'}
              </p>
              
              {!showHistory && (
                <div className="space-y-3">
                  <Button
                    onClick={handleNewBooking}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-8 py-3 rounded-xl"
                  >
                    Book A Court
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(showHistory ? pastBookings : currentBookings).map((booking, index) => (
              <FadeIn key={booking.id} delay={0.4 + index * 0.1}>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {booking.sport === 'badminton' ? '🏸' : '🏓'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white capitalize">{booking.sport}</h3>
                        <p className="text-gray-300 text-sm">Booking #{booking.id.slice(-8)}</p>
                      </div>
                    </div>
                    <div className={getStatusBadge(booking.status, booking.paymentStatus, showHistory)}>
                      {getStatusText(booking.status, booking.paymentStatus, showHistory)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-300" />
                      <div>
                        <p className="text-gray-300 text-xs">Date & Time</p>
                        <p className="text-white font-semibold text-sm">{booking.date} at {booking.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-300" />
                      <div>
                        <p className="text-gray-300 text-xs">Duration</p>
                        <p className="text-white font-semibold text-sm">{booking.duration}h</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-300" />
                      <div>
                        <p className="text-gray-300 text-xs">Court</p>
                        <p className="text-white font-semibold text-sm">{booking.courtName || 'Court 1'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-300" />
                      <div>
                        <p className="text-gray-300 text-xs">Amount</p>
                        <p className="text-white font-semibold text-sm">${booking.totalAmount}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Simple Actions - Modify and Cancel with 2-hour rule */}
                  {!showHistory && (() => {
                    // Check if booking is within 2 hours of start time
                    const isBookingTooClose = (): boolean => {
                      const now = new Date()
                      const cambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
                      
                      const [year, month, day] = booking.date.split('-')
                      const [hour, minute] = booking.time.split(':')
                      
                      const yearNum = parseInt(year)
                      const monthNum = parseInt(month) - 1
                      const dayNum = parseInt(day)
                      const hourNum = parseInt(hour)
                      const minuteNum = parseInt(minute)
                      
                      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum)) {
                        console.error('❌ Invalid date/time components:', { year, month, day, hour, minute })
                        return false
                      }
                      
                      const bookingDateTime = new Date(yearNum, monthNum, dayNum, hourNum, minuteNum)
                      const timeDiff = bookingDateTime.getTime() - cambodiaTime.getTime()
                      const hoursDiff = timeDiff / (1000 * 60 * 60)
                      
                      return hoursDiff <= 2
                    }
                    
                    const tooClose = isBookingTooClose()
                    const isInFuture = new Date(booking.date) > new Date()
                    
                    return (
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex space-x-2">
                          {/* Modify Button - Only for confirmed bookings more than 2 hours away */}
                          {booking.status === 'confirmed' && isInFuture && !tooClose && (
                            <ScaleButton>
                              <Button
                                onClick={() => handleModifyBooking(booking)}
                                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-300/30 rounded-lg text-xs"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Modify
                              </Button>
                            </ScaleButton>
                          )}
                          
                          {/* Cancel Button - Only for confirmed bookings more than 2 hours away */}
                          {booking.status === 'confirmed' && isInFuture && !tooClose && (
                            <ScaleButton>
                              <Button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-300/30 rounded-lg text-xs"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </ScaleButton>
                          )}
                          
                          {/* Too Close Warning - Show when booking is within 2 hours */}
                          {booking.status === 'confirmed' && isInFuture && tooClose && (
                            <div className="text-orange-300 text-xs px-2 py-1 bg-orange-500/20 border border-orange-400/30 rounded">
                              ⏰ Too close to modify/cancel
                            </div>
                          )}
                          
                          {/* Pending Payment Button */}
                          {booking.status === 'pending' && booking.paymentStatus === 'pending' && (
                            <ScaleButton>
                              <Button
                                onClick={() => handlePayBooking(booking)}
                                className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-300/30 rounded-lg text-xs"
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Pay Now
                              </Button>
                            </ScaleButton>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  </div>
                </FadeIn>
              ))}
                </div>
          )}
        </div>
      </div>



      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="bookings"
          onNavigate={(screen: string) => navigateTo(screen as any)}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50 p-4 text-center text-white">
          Navigation unavailable
        </div>
      )}

    </div>
  )
} 