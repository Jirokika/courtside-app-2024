import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { LoadingScreen } from './LoadingScreen'
import { BottomNavigation } from '../ui/BottomNavigation'
import { useToast } from '../../contexts/ToastContext'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { ArrowLeft } from '../ui/icons'

interface Sport {
  id: string
  name: string
  emoji: string
  pricePerHour: number
  description: string
}

interface SportSelectionScreenProps {
  navigateTo: (screen: string) => void
  updateBookingState: (updates: any) => void
  appState: any
}

export const SportSelectionScreen: React.FC<SportSelectionScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const { showToast } = useToast()
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renderAttempts, setRenderAttempts] = useState(0)

  // Available sports with pricing
  const availableSports: Sport[] = [
    {
      id: 'badminton',
      name: 'Badminton',
      emoji: '🏸',
      pricePerHour: 12,
      description: 'Professional badminton courts'
    },
    {
      id: 'pickleball',
      name: 'Pickleball',
      emoji: '🏓',
      pricePerHour: 14,
      description: 'Professional pickleball courts'
    }
  ]

  useEffect(() => {
    const initializeSports = () => {
      try {
        setLoading(true)
        setError(null)
        
        // Use predefined sports immediately to avoid API dependency
        setSports(availableSports)
        
        // Set loading to false immediately since we're using predefined data
        setLoading(false)
        
      } catch (error) {
        console.error('🏸 SportSelectionScreen: Error in sports setup:', error)
        setError('Failed to load sports data')
        // Always fallback to predefined sports
        setSports(availableSports)
        setLoading(false)
      }
    }

    // Force immediate initialization
    initializeSports()
    
    // Add a backup timeout to ensure we always show something
    const backupTimer = setTimeout(() => {
      if (loading) {
        setSports(availableSports)
        setLoading(false)
      }
    }, 2000)

    return () => clearTimeout(backupTimer)
  }, [renderAttempts])

  const handleBack = () => {
    try {
      navigateTo('home')
    } catch (error) {
      console.error('🏸 SportSelectionScreen: Navigation error:', error)
      showToast('error', 'Navigation failed. Please try again.')
    }
  }

  const handleSportSelect = (sport: string) => {
    try {
      updateBookingState({ selectedSport: sport })
      navigateTo('date-selection')
    } catch (error) {
      console.error('🏸 SportSelectionScreen: Sport selection error:', error)
      showToast('error', 'Failed to select sport. Please try again.')
    }
  }

  const handleRetry = () => {
    setRenderAttempts(prev => prev + 1)
    setError(null)
    setLoading(true)
    setTimeout(() => {
      setSports(availableSports)
      setLoading(false)
    }, 100)
  }

  // Force render even if there are issues
  if (loading && renderAttempts > 2) {
    setLoading(false)
  }

  // Error fallback
  if (error && renderAttempts > 1) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center text-white p-6">
          <h1 className="text-2xl font-bold mb-4">Error Loading Sports</h1>
          <p className="mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl mr-2"
          >
            Retry
          </button>
          <button 
            onClick={handleBack}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Force render the main content even if loading
  const shouldRender = !loading || renderAttempts > 1

  if (!shouldRender) {
    return <LoadingScreen />
  }

  // Simple fallback render without complex components
  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="mb-6 pt-8">
          <div className="flex items-center justify-center mb-2">
            <button
              onClick={handleBack}
              className="absolute left-4 w-10 h-10 text-white hover:text-gray-200"
            >
              ←
            </button>
            <h1 className="text-3xl font-bold text-white">Choose Your Sport</h1>
          </div>
          <p className="text-center text-gray-200">Select your preferred sport</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '16%' }}></div>
          </div>
        </div>

        {/* Sport Options - Simplified */}
        <div className="space-y-6">
          {sports.map((sport, index) => (
            <div key={sport.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <div className="text-3xl">{sport.emoji}</div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{sport.name}</h2>
                    <p className="text-gray-300">{sport.description}</p>
                    <p className="text-green-400 font-semibold">${sport.pricePerHour}/hour</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSportSelect(sport.id)}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-xl"
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="sport-selection"
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