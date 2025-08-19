import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { LoadingScreen } from './LoadingScreen'
import { BottomNavigation } from '../ui/BottomNavigation'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../utils/api'
import { ScreenProps } from '../../types'
import { ArrowLeft } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface CourtSelectionScreenProps extends ScreenProps {}

interface Court {
  id: string
  name: string
  sport: string
  isAvailable: boolean
}

export const CourtSelectionScreen: React.FC<CourtSelectionScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const { showToast } = useToast()
  const api = useApi()
  const [selectedCourts, setSelectedCourts] = useState<string[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)

  const selectedSport = appState.bookingState?.selectedSport

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoading(true)
        
        // Get selected date and time from app state
        const selectedDate = appState.bookingState?.selectedDates[0]
        const selectedTime = appState.bookingState?.selectedTimeSlot
        
        const dateString = selectedDate instanceof Date 
          ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
          : typeof selectedDate === 'string' 
            ? selectedDate 
            : new Date().toISOString().split('T')[0]
        
        console.log('🏸 CourtSelectionScreen: Fetching courts for date:', dateString, 'time:', selectedTime)
        console.log('🏸 CourtSelectionScreen: selectedTime type:', typeof selectedTime, 'value:', selectedTime)
        
        // Get courts with individual availability for the selected date and time
        const response = await api.getCourtsWithAvailability(selectedSport, dateString, selectedTime)
        
        if (response.success && response.data) {
          // Use real-time availability data from backend
          const courtsWithAvailability = response.data.map((court: any) => ({
            id: court.id,
            name: court.name,
            sport: court.sport,
            isAvailable: court.isAvailable
          }))
          
          console.log('🏸 CourtSelectionScreen: Courts with availability:', courtsWithAvailability)
          setCourts(courtsWithAvailability)
          showToast('success', 'Real-time court availability loaded')
        } else {
          console.error('❌ CourtSelectionScreen: API failed:', response.error)
          showToast('error', 'Failed to load court availability')
        }
      } catch (error) {
        console.error('Error fetching courts:', error)
        showToast('error', 'Failed to load courts')
      } finally {
        setLoading(false)
      }
    }

    if (selectedSport) {
      fetchCourts()
    }
  }, [selectedSport, api, showToast])

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourts(prev => {
      if (prev.includes(courtId)) {
        return prev.filter(id => id !== courtId)
      } else {
        return [...prev, courtId]
      }
    })
  }

  const handleContinue = () => {
    if (selectedCourts.length > 0) {
      updateBookingState({ 
        selectedCourts: selectedCourts
      })
      
      navigateTo('booking-summary')
    } else {
      showToast('error', 'Please select at least one court to continue.')
    }
  }

  const handleBack = () => {
    navigateTo('duration-selection')
  }

  const getSportName = () => {
    const sportNames: Record<string, string> = {
      'badminton': 'Badminton',
      'pickleball': 'Pickleball'
    }
    return sportNames[selectedSport || ''] || 'Sport'
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
              <h1 className="text-3xl font-bold text-white">Select Courts</h1>
            </div>
            <p className="text-center text-gray-200">
              Choose your {getSportName()} courts
            </p>
          </div>
        </FadeIn>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Availability Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Court Availability</h2>
            <div className="text-sm text-white/70">
              {courts.filter(court => court.isAvailable).length} of {courts.length} available
            </div>
          </div>
        </div>

        {/* Court Grid - Bento Style 2 Columns */}
        <div className="max-w-screen-sm mx-auto grid grid-cols-2 gap-x-4 gap-y-4 mb-6 justify-items-center">
          {courts.map((court, index) => (
            <FadeIn key={court.id} delay={0.3 + index * 0.1}>
              <button
                onClick={() => court.isAvailable && handleCourtSelect(court.id)}
                disabled={!court.isAvailable}
                className={`aspect-square bg-white/10 backdrop-blur-md rounded-2xl border transition-all duration-200 p-6 flex flex-col items-center justify-center min-h-[120px] w-full max-w-[180px] ${
                  selectedCourts.includes(court.id) 
                    ? 'border-green-400 bg-green-500/20 shadow-lg shadow-green-500/20' 
                    : court.isAvailable
                      ? 'border-white/20 hover:bg-white/15 hover:border-white/30'
                      : 'border-gray-500/30 bg-gray-600/30 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="text-center w-full">
                  <div className={`text-lg font-semibold text-white mb-3 leading-tight ${
                    !court.isAvailable ? 'line-through' : ''
                  }`}>
                    {court.name}
                  </div>
                  <div className={`text-sm font-medium ${
                    court.isAvailable ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {court.isAvailable ? 'Available' : 'Booked'}
                  </div>
                  {selectedCourts.includes(court.id) && (
                    <div className="text-xs text-green-300 mt-2 font-medium">
                      Selected
                    </div>
                  )}
                </div>
              </button>
            </FadeIn>
          ))}
        </div>

        {/* Continue Button - Part of page content */}
        <div className="mb-6">
          <Button
            onClick={handleContinue}
            disabled={selectedCourts.length === 0}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedCourts.length > 0 
              ? `Continue with ${selectedCourts.length} court${selectedCourts.length !== 1 ? 's' : ''}`
              : 'Select courts to continue'
            }
          </Button>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="court-selection"
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