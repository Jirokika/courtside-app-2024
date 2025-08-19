import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { ArrowLeft, Calendar, Clock, MapPin, DollarSign, AlertCircle } from 'lucide-react'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { createSubmissionGuard } from '../../utils/debounce'
import { LoadingScreen } from './LoadingScreen'

interface BookingModificationScreenProps extends ScreenProps {}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  hour: number
  isAvailable: boolean
  formattedTime: string
  availableCourtCount: number
}

interface Court {
  id: string
  name: string
  sport: string
  isAvailable: boolean
}

export const BookingModificationScreen: React.FC<BookingModificationScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const api = useApi()
  const { showToast } = useToast()
  
  // Get booking data from app state or use mock data as fallback
  const originalBooking = appState.bookingState?.selectedBooking || {
    id: 'BK001',
    sport: 'badminton',
    date: '2025-12-15',
    time: '18:00',
    duration: 2,
    court: 'Court 1',
    status: 'confirmed',
    paymentMethod: 'credits',
    originalAmount: 24, // $12/hour * 2 hours
    modificationCount: 0
  }

  // State for modification
  const [modifiedSport, setModifiedSport] = useState(originalBooking.sport)
  const [modifiedDate, setModifiedDate] = useState(originalBooking.date)
  const [modifiedTime, setModifiedTime] = useState(originalBooking.time)
  const [modifiedDuration, setModifiedDuration] = useState(originalBooking.duration)
  const [modifiedCourt, setModifiedCourt] = useState(originalBooking.court)
  
  // State for real-time availability
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Format original booking data for display
  const formatOriginalDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatOriginalTime = (timeStr: string) => {
    return timeStr // Keep as is for now, could add AM/PM formatting
  }

  // Get current date and time in Cambodia timezone
  const getCurrentCambodiaDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    })
  }

  const getCurrentCambodiaTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Phnom_Penh'
    })
  }

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    // Generate 42 days (6 weeks) to ensure we have enough
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }

  // Ensure modificationCount is defined for testing
  const modificationCount = originalBooking.modificationCount || 0
  
  // Calculate remaining modifications
  const remainingModifications = 2 - modificationCount

  // Sport-specific courts with mapping to backend IDs
  const getCourtsForSport = (sport: string) => {
    if (sport === 'badminton') {
      return ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 5', 'Court 6', 'Court 7', 'Court 8']
    } else {
      return ['Court 1', 'Court 2', 'Court 3', 'Court 4']
    }
  }

  const getCourtId = (courtName: string, sport: string) => {
    const courtNumber = courtName.split(' ')[1]
    return `${sport}-${courtNumber}`
  }

  const getCourtDisplayName = (courtId: string) => {
    const parts = courtId.split('-')
    if (parts.length >= 2) {
      const sport = parts[0]
      const courtNumber = parts[1]
      return `Court ${courtNumber}`
    }
    return courtId
  }

  // Handle sport change
  const handleSportChange = (newSport: string) => {
    setModifiedSport(newSport)
    // Reset court selection when sport changes
    const courtsForNewSport = getCourtsForSport(newSport)
    setModifiedCourt(courtsForNewSport[0])
    
    // Show info about sport change
    showToast('info', `Sport changed to ${newSport}. Court updated to match.`)
  }

  // Get max duration for modification (same logic as original)
  const getMaxDurationForModification = (): number => {
    const selectedHour = parseInt(modifiedTime.split(':')[0])
    const closingHour = 22 // 10 PM
    const maxDuration = closingHour - selectedHour
    return Math.max(1, Math.min(maxDuration, 4)) // Between 1-4 hours
  }

  // Time validation for modification (2-hour rule)
  const isTimeTooClose = (selectedDate: string, selectedTime: string): boolean => {
    const now = new Date()
    const cambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    const timeDiff = selectedDateTime.getTime() - cambodiaTime.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    return hoursDiff < 2
  }

  // Check if original booking is within 2 hours of start time
  const isOriginalBookingTooClose = (): boolean => {
    const now = new Date()
    const cambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    const originalBookingDateTime = new Date(`${originalBooking.date}T${originalBooking.time}:00`)
    const timeDiff = originalBookingDateTime.getTime() - cambodiaTime.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    return hoursDiff < 2
  }

  const isTimeSlotValid = (date: string, time: string): boolean => {
    return !isTimeTooClose(date, time)
  }

  const getSportPrice = (sport: string) => sport === 'badminton' ? 12 : 14

  // Fetch time slots with real-time availability
  const fetchTimeSlots = useCallback(async () => {
    if (!modifiedDate || !modifiedSport) {
      return
    }

    setLoading(true)
    try {
      // Format date for API
      const dateString = modifiedDate instanceof Date 
        ? `${modifiedDate.getFullYear()}-${String(modifiedDate.getMonth() + 1).padStart(2, '0')}-${String(modifiedDate.getDate()).padStart(2, '0')}`
        : typeof modifiedDate === 'string' 
          ? modifiedDate 
          : new Date().toISOString().split('T')[0]

      // Get all courts for the selected sport
      const courtIds = modifiedSport === 'badminton' 
        ? ['badminton-1', 'badminton-2', 'badminton-3', 'badminton-4', 'badminton-5', 'badminton-6', 'badminton-7', 'badminton-8']
        : ['pickleball-1', 'pickleball-2', 'pickleball-3', 'pickleball-4']
      
      console.log('⏰ Modification: Calling getMultiCourtTimeSlots with:', { courtIds, dateString })
      
      const response = await api.getMultiCourtTimeSlots(courtIds, dateString)
      
      if (response.success && response.data) {
        // Check if ANY court is available for each time slot
        const timeSlotsWithAvailability = response.data.availableSlots.map(slot => {
          const availableCourts = Object.values(slot.courtAvailability).filter(available => available === true)
          const isTimeSlotAvailable = availableCourts.length > 0
          
          return {
            ...slot,
            isAvailable: isTimeSlotAvailable,
            availableCourtCount: availableCourts.length
          }
        })
        
        // Apply 2-hour buffer for modification (only for today's date)
        const filteredSlots = timeSlotsWithAvailability.filter(slot => {
          const slotHour = parseInt(slot.formattedTime.split(':')[0])
          const slotMinutes = slotHour * 60
          
          // Check if this is today's date
          const today = new Date()
          const todayString = today.toISOString().split('T')[0]
          const isToday = dateString === todayString
          
          if (isToday) {
            // Only apply 2-hour buffer for today
            const cambodiaTime = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
            const currentHour = cambodiaTime.getHours()
            const currentMinute = cambodiaTime.getMinutes()
            const currentMinutes = currentHour * 60 + currentMinute
            
            // Add 2-hour buffer (120 minutes)
            const bufferMinutes = currentMinutes + 120
            
            return slotMinutes >= bufferMinutes
          } else {
            // For future dates, show all available slots
            return true
          }
        })
        
        console.log('⏰ Modification: Available time slots:', filteredSlots.length)
        setTimeSlots(filteredSlots)
        showToast('success', 'Real-time availability loaded')
      } else {
        console.error('❌ Modification: API failed:', response.error)
        showToast('error', 'Failed to load time slots')
      }
    } catch (error) {
      console.error('Error fetching time slots:', error)
      showToast('error', 'Failed to load time slots')
    } finally {
      setLoading(false)
    }
  }, [modifiedDate, modifiedSport, api, showToast])

  // Fetch courts with real-time availability
  const fetchCourts = useCallback(async () => {
    if (!modifiedSport || !modifiedDate || !modifiedTime) {
      return
    }

    setLoading(true)
    try {
      const dateString = modifiedDate instanceof Date 
        ? `${modifiedDate.getFullYear()}-${String(modifiedDate.getMonth() + 1).padStart(2, '0')}-${String(modifiedDate.getDate()).padStart(2, '0')}`
        : typeof modifiedDate === 'string' 
          ? modifiedDate 
          : new Date().toISOString().split('T')[0]
      
      console.log('🏸 Modification: Fetching courts for date:', dateString, 'time:', modifiedTime)
      console.log('🏸 Modification: modifiedDate type:', typeof modifiedDate, 'value:', modifiedDate)
      console.log('🏸 Modification: dateString type:', typeof dateString, 'value:', dateString)
      
      const response = await api.getCourtsWithAvailability(modifiedSport, dateString, modifiedTime)
      
      if (response.success && response.data) {
        const courtsWithAvailability = response.data.map((court: any) => ({
          id: court.id,
          name: court.name,
          sport: court.sport,
          isAvailable: court.isAvailable
        }))
        
        console.log('🏸 Modification: Courts with availability:', courtsWithAvailability)
        setCourts(courtsWithAvailability)
        showToast('success', 'Real-time court availability loaded')
      } else {
        console.error('❌ Modification: API failed:', response.error)
        showToast('error', 'Failed to load court availability')
      }
    } catch (error) {
      console.error('Error fetching courts:', error)
      showToast('error', 'Failed to load courts')
    } finally {
      setLoading(false)
    }
  }, [modifiedSport, modifiedDate, modifiedTime, api, showToast])

  // Load time slots when date or sport changes
  useEffect(() => {
    if (modifiedDate && modifiedSport) {
      fetchTimeSlots()
    }
  }, [modifiedDate, modifiedSport, fetchTimeSlots])

  // Load courts when time is selected
  useEffect(() => {
    if (modifiedSport && modifiedDate && modifiedTime) {
      fetchCourts()
    }
  }, [modifiedSport, modifiedDate, modifiedTime, fetchCourts])

  // Calculate price difference
  const originalAmount = originalBooking.originalAmount || (originalBooking.duration * getSportPrice(originalBooking.sport))
  const newAmount = modifiedDuration * getSportPrice(modifiedSport)
  const priceDifference = newAmount - originalAmount
  const isRefund = priceDifference < 0
  const isAdditionalPayment = priceDifference > 0

  const handleBack = () => {
    navigateTo('bookings')
  }

  // Create submission guard for booking modification
  const modificationSubmissionGuard = useMemo(() => {
    return createSubmissionGuard(async (modificationData: any) => {
      try {
        // Validate time slot before proceeding
        if (!isTimeSlotValid(modifiedDate, modifiedTime)) {
          showToast('error', 'Cannot modify to times within 2 hours. Please select a time at least 2 hours in the future.')
          return
        }

        // Validate that court matches sport
        const courtsForSport = getCourtsForSport(modifiedSport)
        if (!courtsForSport.includes(modifiedCourt)) {
          showToast('error', 'Selected court does not match the sport. Please select a valid court.')
          return
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(modifiedDate)) {
          console.error('❌ Invalid date format:', modifiedDate)
          showToast('error', 'Invalid date format. Please select a valid date.')
          return
        }

        // Validate time format (HH:MM)
        const timeRegex = /^\d{2}:\d{2}$/
        if (!timeRegex.test(modifiedTime)) {
          console.error('❌ Invalid time format:', modifiedTime)
          showToast('error', 'Invalid time format. Please select a valid time.')
          return
        }

        // Check if this is a mock booking for testing
        const isMockBooking = originalBooking.id === 'mock-test-booking' || originalBooking.id.startsWith('mock-')
        
        if (isMockBooking) {
          // For mock bookings, simulate successful modification without API call
          console.log('🧪 Mock booking modification - skipping API call')
          
          // Update booking state with modified booking
          const modifiedBooking = {
            ...originalBooking,
            sport: modifiedSport,
            date: modifiedDate,
            time: modifiedTime,
            duration: modifiedDuration,
            court: modifiedCourt,
            modificationCount: (originalBooking.modificationCount || 0) + 1,
            newAmount: newAmount,
            priceDifference: priceDifference
          }

          updateBookingState({
            modifiedBooking: modifiedBooking
          })

          showToast('info', 'Booking modified successfully (mock)')
          
          // Navigate to payment if additional payment needed
          if (isAdditionalPayment) {
            navigateTo('modification-payment')
          } else {
            // Show success for refund or no change
            navigateTo('modification-success')
          }
          return
        }

        // For real bookings, call the API
        const courtId = getCourtId(modifiedCourt, modifiedSport)
        const apiModificationData = {
          date: modifiedDate,
          time: modifiedTime,
          duration: modifiedDuration,
          courts: [courtId]
        }

        // Call API to modify booking
        console.log('🔧 Sending modification request:', {
          bookingId: originalBooking.id,
          modificationData: apiModificationData,
          courtMapping: {
            displayName: modifiedCourt,
            backendId: courtId,
            sport: modifiedSport
          }
        })
        
        const response = await api.modifyBooking(originalBooking.id, apiModificationData)
        
        console.log('🔧 Modification response:', response)
        
        if (response.success) {
          // Update booking state with modified booking
          const modifiedBooking = {
            ...originalBooking,
            sport: modifiedSport,
            date: modifiedDate,
            time: modifiedTime,
            duration: modifiedDuration,
            court: modifiedCourt,
            modificationCount: (originalBooking.modificationCount || 0) + 1,
            newAmount: newAmount,
            priceDifference: priceDifference
          }

          updateBookingState({
            modifiedBooking: modifiedBooking
          })

          showToast('success', 'Booking modified successfully')
          
          // Navigate to payment if additional payment needed
          if (isAdditionalPayment) {
            navigateTo('modification-payment')
          } else {
            // Show success for refund or no change
            navigateTo('modification-success')
          }
        } else {
          // Handle specific error cases
          if (response.error === 'DUPLICATE_BOOKING') {
            showToast('error', 'You already have a booking for this time slot')
          } else if (response.error === 'MODIFICATION_LIMIT_REACHED') {
            showToast('error', 'Maximum modifications reached for this booking')
          } else if (response.error === 'BOOKING_TOO_CLOSE') {
            showToast('error', 'Cannot modify to times within 2 hours of start time')
          } else {
            showToast('error', response.message || 'Failed to modify booking')
          }
        }
      } catch (error) {
        console.error('Error modifying booking:', error)
        showToast('error', 'Failed to modify booking')
      }
    }, 2000) // 2-second delay
  }, [originalBooking, modifiedSport, modifiedDate, modifiedTime, modifiedDuration, modifiedCourt, newAmount, priceDifference, isAdditionalPayment, api, updateBookingState, navigateTo, showToast, isTimeSlotValid, getCourtsForSport, getCourtId])

  const handleSaveChanges = () => {
    modificationSubmissionGuard.submit()
  }

  const canModify = modificationCount < 2
  const isBookingTooClose = isOriginalBookingTooClose()

  if (!canModify) {
    return (
      <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6 pt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Modify Booking</h1>
              <p className="text-gray-200">Update your booking details</p>
            </div>
          </div>

          <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-300/30 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Modification Limit Reached</h2>
            <p className="text-gray-300 mb-4">
              You have reached the maximum number of modifications (2) for this booking.
            </p>
            <Button
              onClick={handleBack}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-xl"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isBookingTooClose) {
    return (
      <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6 pt-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Modify Booking</h1>
              <p className="text-gray-200">Update your booking details</p>
            </div>
          </div>

          <div className="bg-orange-500/20 backdrop-blur-md rounded-2xl p-6 border border-orange-300/30 text-center">
            <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Booking Too Close</h2>
            <p className="text-gray-300 mb-4">
              Cannot modify booking within 2 hours of start time. Your booking starts at {originalBooking.time} on {formatOriginalDate(originalBooking.date)}.
            </p>
            <div className="text-sm text-gray-400 mb-4">
              Current time: {getCurrentCambodiaTime()}
            </div>
            <Button
              onClick={handleBack}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-xl"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6 pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Modify Booking</h1>
            <p className="text-gray-200">Update your booking details</p>
          </div>
        </div>

        {/* Modification Count Display */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">Modifications Used</div>
            <div className="text-gray-300 text-sm">{modificationCount}/2</div>
          </div>
          <div className="text-gray-300 text-sm mt-1">
            {remainingModifications > 0 
              ? `${remainingModifications} modification${remainingModifications > 1 ? 's' : ''} remaining`
              : 'No modifications remaining'
            }
          </div>
        </div>

        {/* Clear Comparison */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Summary of Changes</h2>
          
          <div className="space-y-4">
            {/* Sport Change */}
            {modifiedSport !== originalBooking.sport && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Sport:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 line-through">{originalBooking.sport}</span>
                    <span className="text-white">→</span>
                    <span className="text-white font-semibold">{modifiedSport}</span>
                  </div>
                </div>
                <div className="text-2xl">{modifiedSport === 'badminton' ? '🏸' : '🏓'}</div>
              </div>
            )}

            {/* Date Change */}
            {modifiedDate !== originalBooking.date && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Date:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 line-through">{formatOriginalDate(originalBooking.date)}</span>
                    <span className="text-white">→</span>
                    <span className="text-white font-semibold">{formatOriginalDate(modifiedDate)}</span>
                  </div>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* Time Change */}
            {modifiedTime !== originalBooking.time && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Time:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 line-through">{formatOriginalTime(originalBooking.time)}</span>
                    <span className="text-white">→</span>
                    <span className="text-white font-semibold">{modifiedTime}</span>
                  </div>
                </div>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* Duration Change */}
            {modifiedDuration !== originalBooking.duration && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Duration:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 line-through">{originalBooking.duration}h</span>
                    <span className="text-white">→</span>
                    <span className="text-white font-semibold">{modifiedDuration}h</span>
                  </div>
                </div>
              </div>
            )}

            {/* Court Change */}
            {modifiedCourt !== originalBooking.court && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Court:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 line-through">{originalBooking.court}</span>
                    <span className="text-white">→</span>
                    <span className="text-white font-semibold">{modifiedCourt}</span>
                  </div>
                </div>
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
            )}

            {/* No Changes Message */}
            {modifiedSport === originalBooking.sport && 
             modifiedDate === originalBooking.date && 
             modifiedTime === originalBooking.time && 
             modifiedDuration === originalBooking.duration && 
             modifiedCourt === originalBooking.court && (
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <span className="text-gray-300">No changes made yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Simple Modification Options */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6 min-h-[600px]">
          <h2 className="text-xl font-bold text-white mb-6">What would you like to change?</h2>
          
          {/* Sport Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Sport</h3>
              <span className="text-sm text-gray-300">Current: {originalBooking.sport}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['badminton', 'pickleball'].map((sport) => (
                <button
                  key={sport}
                  onClick={() => handleSportChange(sport)}
                  className={`p-3 rounded-xl border transition-all duration-150 ${
                    modifiedSport === sport
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xl mb-1">{sport === 'badminton' ? '🏸' : '🏓'}</div>
                    <div className="font-semibold capitalize text-sm">{sport}</div>
                    <div className="text-xs opacity-75">${getSportPrice(sport)}/h</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Date</h3>
              <span className="text-xs text-gray-300">Current: {formatOriginalDate(originalBooking.date)}</span>
            </div>
            
            {/* Calendar Component */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() - 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg flex items-center justify-center"
                >
                  ←
                </button>
                
                <h4 className="text-lg font-semibold text-white">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                
                <button
                  onClick={() => {
                    const newMonth = new Date(currentMonth)
                    newMonth.setMonth(newMonth.getMonth() + 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg flex items-center justify-center"
                >
                  →
                </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-gray-300 text-xs font-medium py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear()
                  // Format date in YYYY-MM-DD format without timezone conversion
                  const formattedDate = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
                  const isSelected = modifiedDate === formattedDate
                  const isToday = day.toDateString() === new Date().toDateString()
                  const today = new Date()
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                  const isPast = dayStart < todayStart
                  
                  return (
                    <button
                      key={index}
                      onClick={() => isCurrentMonth && !isPast && setModifiedDate(formattedDate)}
                      disabled={!isCurrentMonth || isPast}
                      className={`
                        aspect-square rounded-lg text-xs font-medium
                        ${isCurrentMonth && !isPast
                          ? 'text-white hover:bg-white/20' 
                          : 'text-gray-500 cursor-not-allowed'
                        }
                        ${isSelected ? 'bg-purple-500 text-white' : ''}
                        ${isPast ? 'opacity-50' : ''}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Time Selection with Real-Time Availability */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Time</h3>
              <span className="text-xs text-gray-300">Current: {formatOriginalTime(originalBooking.time)}</span>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading availability...</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => {
                  const isTimeValid = isTimeSlotValid(modifiedDate, slot.formattedTime)
                  const isSelected = modifiedTime === slot.formattedTime
                  const isUnavailable = !slot.isAvailable || !isTimeValid
                  
                  return (
                    <button
                      key={slot.id}
                      onClick={() => !isUnavailable && setModifiedTime(slot.formattedTime)}
                      disabled={isUnavailable}
                      className={`p-3 rounded-lg border transition-all duration-150 text-sm ${
                        isUnavailable
                          ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'bg-purple-500 text-white border-purple-400'
                            : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`font-semibold ${
                          isUnavailable ? 'line-through' : ''
                        }`}>
                          {slot.formattedTime}
                        </div>
                        <div className="text-xs opacity-75">
                          {isUnavailable 
                            ? (!isTimeValid ? 'Too Soon' : 'All Booked')
                            : `${slot.availableCourtCount} Available`
                          }
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Duration Selection */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Duration</h3>
              <span className="text-xs text-gray-300">Current: {originalBooking.duration}h</span>
            </div>
            
            {/* Smart Duration Warning for Modification */}
            {getMaxDurationForModification() < 4 && (
              <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <div className="text-orange-300 text-lg">⏰</div>
                  <div>
                    <h4 className="text-orange-300 font-semibold text-xs mb-1">Duration Limited</h4>
                    <p className="text-orange-200 text-xs leading-relaxed">
                      Time {modifiedTime} allows max {getMaxDurationForModification()}h (close at 22:00).
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((duration) => {
                const isSelected = modifiedDuration === duration
                const isDisabled = duration > getMaxDurationForModification()
                const isSelectable = !isDisabled
                
                return (
                  <button
                    key={duration}
                    onClick={() => isSelectable && setModifiedDuration(duration)}
                    disabled={isDisabled}
                    className={`p-2 rounded-lg border transition-all duration-150 text-sm relative ${
                      isDisabled
                        ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed opacity-50'
                        : isSelected
                          ? 'bg-purple-500 text-white border-purple-400'
                          : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
                    }`}
                  >
                    {duration}h
                    {isDisabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                        <div className="text-red-300 text-xs">🚫</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Court Selection with Real-Time Availability */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Court</h3>
              <span className="text-xs text-gray-300">Current: {originalBooking.court}</span>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading court availability...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {courts.map((court) => {
                  const isSelected = modifiedCourt === court.name
                  const isUnavailable = !court.isAvailable
                  
                  return (
                    <button
                      key={court.id}
                      onClick={() => !isUnavailable && setModifiedCourt(court.name)}
                      disabled={isUnavailable}
                      className={`p-2 rounded-lg border transition-all duration-150 text-sm ${
                        isUnavailable
                          ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed opacity-50'
                          : isSelected
                            ? 'bg-purple-500 text-white border-purple-400'
                            : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`font-semibold ${
                          isUnavailable ? 'line-through' : ''
                        }`}>
                          {court.name}
                        </div>
                        <div className={`text-xs ${
                          isUnavailable ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {isUnavailable ? 'Booked' : 'Available'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Price Difference */}
        {priceDifference !== 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <h3 className="text-lg font-bold text-white mb-3">Price Adjustment</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Original Amount:</span>
                <span className="text-white">${originalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">New Amount:</span>
                <span className="text-white">${newAmount}</span>
              </div>
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between">
                  <span className={`font-semibold ${isRefund ? 'text-green-400' : 'text-red-400'}`}>
                    {isRefund ? 'Refund' : 'Additional Payment'}:
                  </span>
                  <span className={`font-semibold ${isRefund ? 'text-green-400' : 'text-red-400'}`}>
                    {isRefund ? '+' : ''}${Math.abs(priceDifference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modification Info */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Modification Policy</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• Maximum 2 modifications per booking</div>
            <div>• Must modify at least 2 hours before start time</div>
            <div>• Cannot modify to times within 2 hours from now</div>
            <div>• Refunds processed as Courtside credits</div>
            <div>• Additional payments via credits or banking</div>
            <div>• Changes effective immediately after confirmation</div>
            <div>• Can modify pending and completed bookings (2 limit)</div>
          </div>
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <div className="text-white font-semibold">
              Modifications used: {modificationCount}/2
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleSaveChanges}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
          >
            {isAdditionalPayment ? 'Continue to Payment' : 'Save Changes'}
          </Button>
          
          <Button
            onClick={handleBack}
            className="w-full bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 py-4 rounded-xl font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
} 