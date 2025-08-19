import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/Button'
import { LoadingScreen } from './LoadingScreen'
import { BottomNavigation } from '../ui/BottomNavigation'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../utils/api'
import { ScreenProps } from '../../types'
import { ArrowLeft } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface TimeSelectionScreenProps extends ScreenProps {}

interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  hour: number
  isAvailable: boolean
  formattedTime: string
}

export const TimeSelectionScreen: React.FC<TimeSelectionScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const { showToast } = useToast()
  const api = useApi()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAttemptedApi, setHasAttemptedApi] = useState(false)

  const selectedDate = appState.bookingState?.selectedDates[0]
  const selectedSport = appState.bookingState?.selectedSport

  // Filter out past time slots with 30-minute buffer using Cambodia time
  const filterAvailableTimeSlots = useCallback((slots: TimeSlot[]) => {
    // Get current time in Cambodia (UTC+7)
    const now = new Date()
    const bufferMinutes = 30 // 30-minute buffer for better booking management
    
    // For today's date, filter based on current Cambodia time + buffer
    // For future dates, show all slots
    const cambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    const cambodiaToday = cambodiaTime.toISOString().split('T')[0] // Get YYYY-MM-DD in Cambodia timezone
    
    // Convert selectedDate to YYYY-MM-DD format WITHOUT timezone conversion
    let selectedDateString = ''
    if (selectedDate instanceof Date) {
      // Use local date components to avoid UTC conversion issues
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      selectedDateString = `${year}-${month}-${day}`
    } else if (typeof selectedDate === 'string') {
      selectedDateString = selectedDate
    }
    
    const isToday = selectedDateString === cambodiaToday
    
    console.log(`📅 Selected date string (LOCAL): ${selectedDateString}`)
    console.log(`📅 Today in Cambodia timezone: ${cambodiaToday}`)
    console.log(`📅 Is today? ${isToday}`)
    console.log(`📅 Selected date object:`, selectedDate)
    console.log(`📅 ISSUE DIAGNOSIS: toISOString() was converting ${selectedDate} to UTC, causing date shift!`)
    
    if (!isToday) {
      console.log('⏰ Future date selected, showing all available slots')
      return slots.filter(slot => slot.isAvailable)
    }
    
    // Get current hour and minute in Cambodia time (GMT+7) - reuse already calculated cambodiaTime
    const cambodiaHour = cambodiaTime.getHours()
    const cambodiaMinute = cambodiaTime.getMinutes()
    const cambodiaTimeInMinutes = cambodiaHour * 60 + cambodiaMinute
    const cutoffTimeInMinutes = cambodiaTimeInMinutes + bufferMinutes
    
    console.log(`⏰ Current Cambodia time (GMT+7): ${cambodiaHour.toString().padStart(2, '0')}:${cambodiaMinute.toString().padStart(2, '0')}`)
    console.log(`⏰ Cambodia time in minutes: ${cambodiaTimeInMinutes} (${cambodiaHour}*60 + ${cambodiaMinute})`)
    console.log(`⏰ Adding 30-minute buffer: ${cambodiaTimeInMinutes} + ${bufferMinutes} = ${cutoffTimeInMinutes}`)
    console.log(`⏰ Cutoff time: ${Math.floor(cutoffTimeInMinutes / 60).toString().padStart(2, '0')}:${(cutoffTimeInMinutes % 60).toString().padStart(2, '0')} (only show slots after this time)`)
    console.log(`🚫 FILTERING: Will HIDE all slots at or before ${Math.floor(cutoffTimeInMinutes / 60).toString().padStart(2, '0')}:${(cutoffTimeInMinutes % 60).toString().padStart(2, '0')}`)
    console.log(`🌍 DEBUG: Current time in Malaysia (your location): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}`)
    console.log(`🌍 DEBUG: Current time in Cambodia: ${cambodiaTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}`)
    
    const filteredSlots = slots.filter(slot => {
      if (!slot.isAvailable) {
        console.log(`⏰ Slot ${slot.formattedTime}: Already booked/unavailable`)
        return false
      }
      
      const slotTimeInMinutes = slot.hour * 60
      const isAvailable = slotTimeInMinutes > cutoffTimeInMinutes
      console.log(`⏰ Slot ${slot.formattedTime}: ${slotTimeInMinutes}min > ${cutoffTimeInMinutes}min = ${isAvailable ? '✅ SHOWN' : '❌ HIDDEN'}`)
      return isAvailable
    })

    const hiddenCount = slots.length - filteredSlots.length
    console.log(`📊 FILTERING SUMMARY: ${slots.length} total slots → ${filteredSlots.length} shown, ${hiddenCount} hidden (past buffer)`)
    
    return filteredSlots
  }, [selectedDate])

  // Memoize the API call to prevent infinite loops
  const fetchTimeSlots = useCallback(async () => {
    if (!selectedDate || !selectedSport || hasAttemptedApi) {
      return
    }

    console.log('⏰ TimeSelectionScreen: Starting to fetch time slots from API')
    console.log('⏰ TimeSelectionScreen: Selected date:', selectedDate)
    console.log('⏰ TimeSelectionScreen: Selected sport:', selectedSport)
    
    setHasAttemptedApi(true)
    setLoading(true)

    try {
      // Format date for API (timezone-safe)
      const dateString = selectedDate instanceof Date 
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : typeof selectedDate === 'string' 
          ? selectedDate 
          : new Date().toISOString().split('T')[0]

      // Get all courts for the selected sport
      const courtIds = selectedSport === 'badminton' 
        ? ['badminton-1', 'badminton-2', 'badminton-3', 'badminton-4', 'badminton-5', 'badminton-6', 'badminton-7', 'badminton-8']
        : ['pickleball-1', 'pickleball-2', 'pickleball-3', 'pickleball-4']
      
      console.log('⏰ TimeSelectionScreen: Calling getMultiCourtTimeSlots with:', { courtIds, dateString })
      
      const response = await api.getMultiCourtTimeSlots(courtIds, dateString)
      
      console.log('⏰ TimeSelectionScreen: API response:', response)
      
      if (response.success && response.data) {
        // Check if ANY court is available for each time slot
        const timeSlotsWithAvailability = response.data.availableSlots.map(slot => {
          // Check if any court is available for this time slot
          const availableCourts = Object.values(slot.courtAvailability).filter(available => available === true)
          const isTimeSlotAvailable = availableCourts.length > 0
          
          return {
            ...slot,
            isAvailable: isTimeSlotAvailable,
            availableCourtCount: availableCourts.length
          }
        })
        
        // Apply time buffer filter for today's bookings
        const filteredSlots = filterAvailableTimeSlots(timeSlotsWithAvailability)
        console.log('⏰ TimeSelectionScreen: Multi-court slots:', timeSlotsWithAvailability.length, '→ Available after 30min buffer:', filteredSlots.length)
        console.log('⏰ TimeSelectionScreen: Available slots after filtering:', filteredSlots.map(slot => `${slot.formattedTime} (${slot.availableCourtCount} courts)`))
        setTimeSlots(filteredSlots)
        showToast('success', 'Real-time availability loaded')
      } else {
        console.log('⏰ TimeSelectionScreen: API failed, using fallback data')
        throw new Error(response.error || 'API request failed')
      }
          } catch (error) {
        console.error('⏰ TimeSelectionScreen: API call failed:', error)
        showToast('error', 'Failed to load time slots')
      } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedSport, api, hasAttemptedApi, showToast, filterAvailableTimeSlots])

  useEffect(() => {
    if (!selectedDate || !selectedSport) {
      console.log('⏰ TimeSelectionScreen: Missing date or sport, setting loading to false')
      setLoading(false)
      showToast('error', 'Missing date or sport selection')
      return
    }

    // Only fetch once when component mounts or dependencies change
    fetchTimeSlots()
  }, [selectedDate, selectedSport, fetchTimeSlots])

  const handleBack = () => {
    navigateTo('date-selection')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleContinue = () => {
    if (selectedTime) {
      updateBookingState({ selectedTimeSlot: selectedTime })
      navigateTo('duration-selection')
    } else {
      showToast('error', 'Please select a time slot to continue.')
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
          <div className="mb-6 pt-8">
            <div className="flex items-center justify-center mb-2">
              <ScaleButton
                onClick={handleBack}
                className="absolute left-4 w-10 h-10 text-white hover:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </ScaleButton>
              <h1 className="text-3xl font-bold text-white">Select Time</h1>
            </div>
            <p className="text-center text-gray-200">Choose your preferred time slot</p>
            <p className="text-center text-white/60 text-sm">Cambodia local time</p>
          </div>
        </FadeIn>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '66%' }}></div>
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Available Times</h2>
            <div className="text-sm text-white/70">
              {timeSlots.filter(slot => slot.isAvailable).length} of {timeSlots.length} available
            </div>
          </div>
          
          {timeSlots.length === 0 ? (
            // No available slots - show friendly message
            <div className="text-center py-12">
              <div className="mb-6">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-white mb-3">Today's booking has been full</h3>
                <p className="text-white/70 text-lg mb-6">Please select a different date</p>
              </div>
              
              <div className="space-y-4">
                <Button
                  onClick={() => navigateTo('date-selection')}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-4 rounded-xl text-lg shadow-lg"
                >
                  📅 Select Different Date
                </Button>
                
                <div className="text-sm text-white/50">
                  💡 Try booking for tomorrow or upcoming days
                </div>
              </div>
            </div>
          ) : (
            // Show available time slots
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot.formattedTime
                const isUnavailable = !slot.isAvailable
                
                return (
                  <button
                    key={slot.id}
                    onClick={() => !isUnavailable && handleTimeSelect(slot.formattedTime)}
                    disabled={isUnavailable}
                    className={`p-4 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? 'bg-purple-500 text-white border-purple-400 shadow-lg'
                        : isUnavailable
                        ? 'bg-gray-600/30 text-gray-400 border-gray-500/30 cursor-not-allowed opacity-60'
                        : 'bg-white/10 text-white border-white/30 hover:bg-white/15 hover:border-white/40'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        isUnavailable ? 'line-through' : ''
                      }`}>
                        {slot.formattedTime}
                      </div>
                      <div className="text-sm opacity-75">
                        {slot.hour >= 12 ? 'PM' : 'AM'}
                      </div>
                      {isUnavailable ? (
                        <div className="text-xs text-red-300 mt-1 font-medium">
                          All Courts Booked
                        </div>
                      ) : (
                        <div className="text-xs text-green-300 mt-1 font-medium">
                          {slot.availableCourtCount || 'Multiple'} Courts Available
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Continue Button - Only show when there are time slots available */}
        {timeSlots.length > 0 && (
          <div className="mb-6">
            <Button
              onClick={handleContinue}
              disabled={!selectedTime}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedTime ? `Continue with ${selectedTime}` : 'Select a time to continue'}
            </Button>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="time-selection"
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