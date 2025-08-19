import React, { useState, useMemo } from 'react'
import { Button } from '../ui/Button'
import { useToast } from '../../contexts/ToastContext'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { ArrowLeft, ChevronLeft, ChevronRight } from '../ui/icons'
import { usePerformanceMonitor as usePerfMonitor } from '../ui/PerformanceOptimizer'
import { BottomNavigation } from '../ui/BottomNavigation'

interface DateSelectionScreenProps {
  navigateTo: (screen: string) => void
  updateBookingState: (updates: any) => void
  appState: any
}

export const DateSelectionScreen: React.FC<DateSelectionScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  console.log('🎬 DateSelectionScreen: Component rendering')
  console.log('🎬 DateSelectionScreen: Props received:', { navigateTo: typeof navigateTo, updateBookingState: typeof updateBookingState, appState })
  
  try {
    const { showToast } = useToast()
    const { startTimer, endTimer } = usePerfMonitor()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    
    console.log('✅ DateSelectionScreen: Hooks initialized successfully')

  const handleBack = () => {
    console.log('🎬 DateSelectionScreen: Back button pressed, navigating to sport-selection')
    navigateTo('sport-selection')
  }

  const handleDateSelect = (date: Date) => {
    // Allow selection of current date and future dates
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (dateStart < todayStart) return
    
    // Single date selection - replace any existing selection
    setSelectedDate(date)
    console.log('🎬 DateSelectionScreen: Date selected:', date)
  }

  const handleContinue = () => {
    startTimer()
    console.log('🔄 DateSelectionScreen: handleContinue called')
    console.log('🔄 DateSelectionScreen: selectedDate:', selectedDate)
    console.log('🔄 DateSelectionScreen: navigateTo function:', typeof navigateTo)
    
    if (selectedDate) {
      console.log('✅ Date selected:', selectedDate)
      try {
        updateBookingState({
          selectedDates: [selectedDate] // Store as array with single date
        })
        console.log('✅ Booking state updated')
        console.log('🚀 Navigating to time-selection')
        navigateTo('time-selection')
        console.log('✅ Navigation called')
        endTimer('Date selection continue')
      } catch (error) {
        console.error('❌ Error in handleContinue:', error)
        showToast('error', 'Navigation failed. Please try again.')
      }
    } else {
      console.log('❌ No date selected')
      showToast('error', 'Please select a date to continue.')
    }
  }

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  // Memoized calendar generation for performance
  const { days, weekDays } = useMemo(() => {
    console.log('📅 DateSelectionScreen: Generating calendar data')
    try {
      // Simple fallback if date-fns fails
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      // Generate simple calendar data without date-fns
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
      
      return { days, weekDays }
    } catch (error) {
      console.error('❌ DateSelectionScreen: Error generating calendar data:', error)
      return { days: [], weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
    }
  }, [currentMonth])
  
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
              <h1 className="text-3xl font-bold text-white">Select Dates</h1>
            </div>
            <p className="text-center text-gray-200">Choose your preferred date</p>
          </div>
        </FadeIn>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '33%' }}></div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <h2 className="text-xl font-bold text-white">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-center text-gray-300 text-sm font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              // Simple date comparisons without date-fns
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth() && day.getFullYear() === currentMonth.getFullYear()
              const isSelected = selectedDate && day.getTime() === selectedDate.getTime()
              const isToday = day.toDateString() === new Date().toDateString()
              const today = new Date()
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
              const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
              const isPast = dayStart < todayStart
              
              return (
                <button
                  key={index}
                  onClick={() => isCurrentMonth && !isPast && handleDateSelect(day)}
                  disabled={!isCurrentMonth || isPast}
                  className={`
                    aspect-square rounded-lg text-sm font-medium
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

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedDate}
          className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedDate 
            ? `Continue with ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Select a date to continue'
          }
        </Button>
      </div>
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="date-selection"
          onNavigate={navigateTo}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50 p-4 text-center text-white">
          Navigation unavailable
        </div>
      )}
    </div>
  )
  } catch (error) {
    console.error('❌ DateSelectionScreen: Error rendering component:', error)
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Error Loading Date Selection</h1>
          <p className="mb-4">Something went wrong while loading the date selection screen.</p>
          <button 
            onClick={() => navigateTo('sport-selection')}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }
} 