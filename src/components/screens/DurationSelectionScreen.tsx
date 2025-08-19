import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { LoadingScreen } from './LoadingScreen'
import { BottomNavigation } from '../ui/BottomNavigation'
import { useToast } from '../../contexts/ToastContext'
import { ScreenProps, Duration } from '../../types'
import { ArrowLeft } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface DurationSelectionScreenProps extends ScreenProps {}

export const DurationSelectionScreen: React.FC<DurationSelectionScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const { showToast } = useToast()
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null)

  // Calculate maximum allowed duration based on selected time
  const getMaxDuration = (): number => {
    const selectedTimeSlot = appState.bookingState.selectedTimeSlot
    console.log(`🔍 DEBUG: Full booking state:`, appState.bookingState)
    console.log(`🔍 DEBUG: selectedTimeSlot value:`, selectedTimeSlot)
    
    if (!selectedTimeSlot) {
      console.log(`⚠️ WARNING: No selectedTimeSlot found, defaulting to 4 hours`)
      return 4 // Default to 4 hours if no time selected
    }
    
    const selectedHour = parseInt(selectedTimeSlot.split(':')[0])
    const closingHour = 22 // Close at 22:00 (10 PM)
    const maxDuration = closingHour - selectedHour
    
    console.log(`🕒 DURATION LOGIC: Selected ${selectedTimeSlot} (hour ${selectedHour}), closing at ${closingHour}:00, max duration: ${maxDuration}h`)
    
    return Math.min(maxDuration, 4) // Cap at 4 hours maximum
  }

  const maxAllowedDuration = getMaxDuration()

  const allDurationOptions = [
    { 
      hours: 1 as Duration, 
      title: "Quickie 💨", 
      description: "Perfect for a speedy sesh when you're short on time" 
    },
    { 
      hours: 2 as Duration, 
      title: "Standard Flow 🏸", 
      description: "The sweet spot for most players - not too short, not too long" 
    },
    { 
      hours: 3 as Duration, 
      title: "Marathon Mode 🏃‍♂️", 
      description: "For the real athletes who don't know when to quit" 
    },
    { 
      hours: 4 as Duration, 
      title: "All Day Grind ⚡", 
      description: "You're either a pro or you have way too much free time" 
    }
  ]

  // Don't filter - show all options but grey out invalid ones
  const durationOptions = allDurationOptions

  const handleBack = () => {
    navigateTo('time-selection')
  }

  const handleDurationSelect = (duration: Duration) => {
    setSelectedDuration(duration)
  }

  const handleContinue = () => {
    if (selectedDuration) {
      updateBookingState({
        selectedDuration: selectedDuration
      })

      navigateTo('court-selection')
    } else {
      showToast('error', 'Please select a duration to continue.')
    }
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
              <h1 className="text-3xl font-bold text-white">Select Duration</h1>
            </div>
            <p className="text-center text-gray-200">How long do you want to play?</p>
          </div>
        </FadeIn>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '83%' }}></div>
          </div>
        </div>

        {/* Duration Options */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Duration Options</h2>
          
          {/* Smart Duration Info */}
          {maxAllowedDuration < 4 && (
            <div className="bg-orange-500/20 border border-orange-400/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-orange-300 text-2xl">⏰</div>
                <div>
                  <h4 className="text-orange-300 font-semibold text-sm mb-1">Duration Limited</h4>
                  <p className="text-orange-200 text-xs leading-relaxed">
                    Selected time {appState.bookingState.selectedTimeSlot} allows maximum {maxAllowedDuration} hour{maxAllowedDuration !== 1 ? 's' : ''} 
                    (we close at 22:00). Earlier times allow longer durations.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {durationOptions.map((option) => {
              const isSelected = selectedDuration === option.hours
              const isDisabled = option.hours > maxAllowedDuration
              const isSelectable = !isDisabled
              
              return (
                <button
                  key={option.hours}
                  onClick={() => isSelectable && handleDurationSelect(option.hours)}
                  disabled={isDisabled}
                  className={`p-6 rounded-xl border transition-all duration-150 h-48 flex flex-col justify-center relative ${
                    isDisabled
                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/30 cursor-not-allowed opacity-50'
                      : isSelected
                        ? 'bg-purple-500 text-white border-purple-400'
                        : 'bg-white/10 text-white border-white/30 hover:bg-white/15'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">{option.hours}h</div>
                    <div className="text-sm font-semibold mb-1">{option.title}</div>
                    <div className="text-xs opacity-75 leading-tight">
                      {option.description}
                    </div>
                    {isDisabled && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                        <div className="text-center">
                          <div className="text-red-300 text-lg mb-1">🚫</div>
                          <div className="text-red-300 text-xs font-semibold">
                            Past closing
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className="mb-6">
          <Button
            onClick={handleContinue}
            disabled={!selectedDuration}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedDuration 
              ? `Continue with ${selectedDuration} hour${selectedDuration !== 1 ? 's' : ''}`
              : 'Select a duration to continue'
            }
          </Button>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="duration-selection"
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