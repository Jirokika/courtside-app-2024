import React, { useEffect, useState } from 'react'
import { urlShortener } from '../../utils/shortener'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'

interface SharedBookingData {
  sport: string
  date: string
  time: string
  duration: number
  court: string
}

export const SharedBookingScreen: React.FC = () => {
  const [bookingData, setBookingData] = useState<SharedBookingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mapLink = 'https://maps.app.goo.gl/TDxPqDFjD2tskzGj8'

  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith('/b/')) {
      const shortCode = path.replace('/b/', '')
      const data = urlShortener.getBookingData(shortCode)
      if (data) {
        setBookingData(data.bookingData)
      } else {
        setError('Booking not found or has expired')
      }
      setLoading(false)
    }
  }, [])

  const handleGetDirections = () => {
    window.open(mapLink, '_blank')
  }

  const handleBookSimilar = () => {
    // Navigate to the main app to book a similar session
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Booking Not Found</h1>
          <p className="text-slate-300 mb-6">This booking may have expired or doesn't exist.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
          >
            Book Your Own Session
          </button>
        </div>
      </div>
    )
  }

  const getSportEmoji = (sport: string) => {
    return sport === 'badminton' ? '🏸' : '🏓'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return time
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Booking Details</h1>
            <p className="text-slate-300">Shared by your friend</p>
          </div>
        </FadeIn>

        {/* Main Card */}
        <FadeIn delay={0.4}>
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-slate-600/30">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 capitalize">{bookingData.sport}</h2>
                <p className="text-slate-400">Court {bookingData.court}</p>
              </div>
              <div className="bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/30">
                <span className="text-emerald-400 text-sm font-medium">✓ Confirmed</span>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📅</span>
                  </div>
                  <span className="text-slate-300">Date</span>
                </div>
                <span className="text-white font-semibold">{formatDate(bookingData.date)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⏰</span>
                  </div>
                  <span className="text-slate-300">Time</span>
                </div>
                <span className="text-white font-semibold">{formatTime(bookingData.time)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⏱️</span>
                  </div>
                  <span className="text-slate-300">Duration</span>
                </div>
                <span className="text-white font-semibold">{bookingData.duration} hour{bookingData.duration !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-blue-300 font-medium">Session Info</span>
                <span className="text-white font-semibold">{formatTime(bookingData.time)}</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Action Buttons */}
        <FadeIn delay={0.6}>
          <div className="space-y-4">
            <ScaleButton
              onClick={handleGetDirections}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span className="text-xl">📍</span>
              <span>Get Directions</span>
            </ScaleButton>
            
            <ScaleButton
              onClick={handleBookSimilar}
              className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium py-4 rounded-2xl transition-all duration-200 border border-slate-600/30"
            >
              Book Similar Session
            </ScaleButton>
          </div>
        </FadeIn>

        {/* Footer */}
        <FadeIn delay={0.8}>
          <div className="text-center mt-8">
            <p className="text-slate-400 text-sm">
              Powered by <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold">Courtside Mini App</span>
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  )
} 