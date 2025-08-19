import React from 'react'
import { 
  Home,
  Calendar,
  Plus,
  User
} from 'lucide-react'
import type { AppScreen } from '../../types'

interface BottomNavigationProps {
  currentScreen: AppScreen
  onNavigate: (screen: AppScreen) => void
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigate
}) => {
  // Safety check - if onNavigate is not available, don't render
  if (typeof onNavigate !== 'function') {
    console.error('BottomNavigation: onNavigate is not a function:', onNavigate)
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50">
        <div className="flex justify-around py-3">
          <div className="flex flex-col items-center text-white/50">
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Home</span>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <Calendar className="w-6 h-6 mb-1" />
            <span className="text-xs">Bookings</span>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-xs">Book</span>
          </div>
          <div className="flex flex-col items-center text-white/50">
            <User className="w-6 h-6 mb-1" />
            <span className="text-xs">Profile</span>
          </div>
        </div>
      </div>
    )
  }

  const handleBook = () => {
    try {
      console.log('Book button clicked in bottom navigation')
      onNavigate('sport-selection')
    } catch (error) {
      console.error('Error in handleBook:', error)
    }
  }

  const handleBookings = () => {
    try {
      onNavigate('bookings')
    } catch (error) {
      console.error('Error in handleBookings:', error)
    }
  }

  const handleProfile = () => {
    console.log('Profile clicked')
  }

  const handleHome = () => {
    try {
      onNavigate('home')
    } catch (error) {
      console.error('Error in handleHome:', error)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50">
      <div className="flex justify-around py-3">
        <button
          onClick={handleHome}
          className={`flex flex-col items-center ${currentScreen === 'home' ? 'text-white' : 'text-white/70 hover:text-white'}`}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-xs">Home</span>
        </button>
        
        <button
          onClick={handleBookings}
          className={`flex flex-col items-center ${currentScreen === 'bookings' ? 'text-white' : 'text-white/70 hover:text-white'}`}
        >
          <Calendar className="w-6 h-6 mb-1" />
          <span className="text-xs">Bookings</span>
        </button>
        
        <button
          onClick={handleBook}
          className={`flex flex-col items-center ${currentScreen === 'sport-selection' || currentScreen === 'date-selection' || currentScreen === 'time-selection' || currentScreen === 'duration-selection' || currentScreen === 'court-selection' || currentScreen === 'booking-summary' ? 'text-white' : 'text-white/70 hover:text-white'}`}
        >
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-xs">Book</span>
        </button>
        
        <button
          onClick={handleProfile}
          className={`flex flex-col items-center ${currentScreen === 'profile' ? 'text-white' : 'text-white/70 hover:text-white'}`}
        >
          <User className="w-6 h-6 mb-1" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  )
} 