import React from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { CheckCircle, ArrowRight, CreditCard } from 'lucide-react'

interface ModificationSuccessScreenProps extends ScreenProps {}

export const ModificationSuccessScreen: React.FC<ModificationSuccessScreenProps> = ({
  navigateTo,
  appState,
}) => {
  // Get modification data from app state
  const modifiedBooking = appState.modifiedBooking || {
    originalAmount: 24,
    newAmount: 12,
    priceDifference: -12
  }

  const isRefund = modifiedBooking.priceDifference < 0
  const refundAmount = Math.abs(modifiedBooking.priceDifference)

  const handleViewBooking = () => {
    navigateTo('bookings')
  }

  const handleBackToBookings = () => {
    navigateTo('bookings')
  }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Success Content */}
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center max-w-md w-full">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            
            <h1 className="text-3xl font-bold text-white mb-4">Modification Successful!</h1>
            
            <p className="text-gray-300 mb-6">
              Your booking has been updated successfully.
            </p>

            {/* Modification Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
              <h2 className="text-lg font-bold text-white mb-4">Modification Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Original Amount:</span>
                  <span className="text-white">${modifiedBooking.originalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">New Amount:</span>
                  <span className="text-white">${modifiedBooking.newAmount}</span>
                </div>
                <div className="border-t border-white/20 pt-3">
                  <div className="flex justify-between">
                    <span className={`font-semibold ${isRefund ? 'text-green-400' : 'text-gray-300'}`}>
                      {isRefund ? 'Refund Amount' : 'Additional Payment'}:
                    </span>
                    <span className={`font-semibold ${isRefund ? 'text-green-400' : 'text-gray-300'}`}>
                      {isRefund ? '+' : ''}${refundAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Information */}
            {isRefund && (
              <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-6 border border-green-300/30 mb-6">
                <div className="flex items-center space-x-3 mb-3">
                  <CreditCard className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-bold text-green-400">Refund Processed</h3>
                </div>
                <p className="text-green-300 text-sm">
                  Your refund of ${refundAmount} has been added to your Courtside credits.
                </p>
              </div>
            )}

            {/* Modification Count */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
              <div className="text-white font-semibold">
                Modifications used: {(modifiedBooking.modificationCount || 1)}/2
              </div>
              <div className="text-gray-300 text-sm">
                {modifiedBooking.modificationCount >= 2 
                  ? 'No modifications remaining for this booking.'
                  : `You have ${2 - (modifiedBooking.modificationCount || 1)} modification${2 - (modifiedBooking.modificationCount || 1) > 1 ? 's' : ''} remaining for this booking.`
                }
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                onClick={handleViewBooking}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                View Updated Booking
              </Button>
              
              <Button
                onClick={handleBackToBookings}
                className="w-full bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 py-4 rounded-xl font-semibold"
              >
                Back to Bookings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 