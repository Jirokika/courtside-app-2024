import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { ArrowLeft, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'

interface CancellationConfirmationScreenProps extends ScreenProps {}

export const CancellationConfirmationScreen: React.FC<CancellationConfirmationScreenProps> = ({
  navigateTo,
  appState,
}) => {
  const [showSuccess, setShowSuccess] = useState(false)

  // Mock booking data
  const booking = {
    id: 'BK001',
    sport: 'badminton',
    date: '2024-07-19',
    time: '14:00',
    duration: 2,
    court: 'Court 3',
    status: 'approved',
    paymentMethod: 'credits',
    originalAmount: 24
  }

  const handleBack = () => {
    navigateTo('bookings')
  }

  const handleConfirmCancellation = () => {
    // Process cancellation
    setTimeout(() => {
      setShowSuccess(true)
    }, 1000)
  }

  const handleSuccessClose = () => {
    navigateTo('bookings')
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="p-4">
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center max-w-md w-full">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
              
              <h1 className="text-3xl font-bold text-white mb-4">Booking Cancelled</h1>
              
              <p className="text-gray-300 mb-6">
                Your booking has been cancelled successfully.
              </p>

              {/* Refund Information */}
              <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-6 border border-green-300/30 mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <CreditCard className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-bold text-green-400">Refund Processed</h3>
                </div>
                <p className="text-green-300 text-sm">
                  Your refund of ${booking.originalAmount} has been added to your Courtside credits.
                </p>
              </div>

              {/* Cancellation Summary */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
                <h2 className="text-lg font-bold text-white mb-4">Cancelled Booking</h2>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">{booking.sport === 'badminton' ? '🏸' : '🏓'}</div>
                    <span className="text-gray-300 capitalize">{booking.sport}</span>
                  </div>
                  <div className="text-gray-300">{booking.date} at {booking.time}</div>
                  <div className="text-gray-300">{booking.duration}h on {booking.court}</div>
                  <div className="text-gray-300">Amount: ${booking.originalAmount}</div>
                </div>
              </div>

              <Button
                onClick={handleSuccessClose}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
              >
                Back to Bookings
              </Button>
            </div>
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
              <h1 className="text-3xl font-bold text-white">Cancel Booking</h1>
              <p className="text-gray-200">Confirm your cancellation</p>
            </div>
          </div>

        {/* Warning */}
        <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 border border-red-300/30 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <h2 className="text-xl font-bold text-red-400">Cancellation Warning</h2>
          </div>
          <p className="text-red-300 text-sm">
            This action cannot be undone. Your booking will be permanently cancelled.
          </p>
        </div>

        {/* Booking Details */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Booking to Cancel</h2>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {booking.sport === 'badminton' ? '🏸' : '🏓'}
              </div>
              <div>
                <div className="text-white font-semibold capitalize">{booking.sport}</div>
                <div className="text-gray-300 text-sm">Sport</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-white font-semibold">{booking.date}</div>
              <div className="text-gray-300 text-sm">Date</div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-white font-semibold">{booking.time} ({booking.duration}h)</div>
              <div className="text-gray-300 text-sm">Time & Duration</div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-white font-semibold">{booking.court}</div>
              <div className="text-gray-300 text-sm">Court</div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-white font-semibold">${booking.originalAmount}</div>
              <div className="text-gray-300 text-sm">Amount</div>
            </div>
          </div>
        </div>

        {/* Refund Information */}
        <div className="bg-green-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-300/30 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <CreditCard className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-green-400">Refund Information</h3>
          </div>
          <div className="space-y-2 text-sm text-green-300">
            <div>• Full refund: ${booking.originalAmount}</div>
            <div>• Refund processed as Courtside credits</div>
            <div>• Credits available immediately</div>
            <div>• No cancellation fees</div>
          </div>
        </div>

        {/* Cancellation Policy */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Cancellation Policy</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• Full refund for cancellations</div>
            <div>• No cancellation fees</div>
            <div>• Refunds processed as credits</div>
            <div>• Cancellation is permanent</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={handleConfirmCancellation}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-300/30 py-4 rounded-xl font-semibold"
          >
            Confirm Cancellation
          </Button>
          
          <Button
            onClick={handleBack}
            className="w-full bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 py-4 rounded-xl font-semibold"
          >
            Keep Booking
          </Button>
        </div>
      </div>
    </div>
  )
} 