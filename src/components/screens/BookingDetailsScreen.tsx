import React from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { ArrowLeft, Edit, X, Calendar, Clock, MapPin, CreditCard, Banknote } from 'lucide-react'

interface BookingDetailsScreenProps extends ScreenProps {}

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  navigateTo,
  appState,
}) => {
  // Mock booking data - this would come from the selected booking
  const booking = {
    id: 'BK001',
    sport: 'badminton',
    date: '2024-07-19',
    time: '14:00',
    duration: 2,
    court: 'Court 3',
    status: 'approved', // 'pending' | 'approved' | 'cancelled'
    paymentMethod: 'credits',
    paymentStatus: 'completed',
    originalAmount: 24, // $12/hour * 2 hours
    modificationCount: 0,
    createdAt: '2024-07-15T10:30:00Z'
  }

  const handleBack = () => {
    navigateTo('bookings')
  }

  const handleEditBooking = () => {
    // Navigate to modification flow
    navigateTo('booking-modification')
  }

  const handleCancelBooking = () => {
    // Navigate to cancellation confirmation
    navigateTo('cancellation-confirmation')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400'
      case 'approved': return 'text-green-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Awaiting verification'
      case 'approved': return 'Confirmed'
      case 'cancelled': return 'Cancelled'
      default: return 'Unknown'
    }
  }

  // Check if booking is within 2 hours of start time
  const isBookingTooClose = (): boolean => {
    const now = new Date()
    const cambodiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }))
    
    const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`)
    const timeDiff = bookingDateTime.getTime() - cambodiaTime.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)
    
    return hoursDiff < 2
  }

  const canModify = (booking.status === 'pending' || 
    (booking.status === 'approved' && booking.modificationCount < 2)) && 
    !isBookingTooClose()

  const canCancel = booking.status === 'pending' || 
    (booking.status === 'approved' && booking.modificationCount < 2)

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Booking Details</h1>
              <p className="text-gray-200">View and manage your booking</p>
            </div>
          </div>
        </div>

        {/* Booking Status */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Booking #{booking.id}</h2>
            <div className={`font-semibold ${getStatusColor(booking.status)}`}>
              {getStatusText(booking.status)}
            </div>
          </div>
          
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
              <Calendar className="w-6 h-6 text-white" />
              <div>
                <div className="text-white font-semibold">{booking.date}</div>
                <div className="text-gray-300 text-sm">Date</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-white" />
              <div>
                <div className="text-white font-semibold">{booking.time} ({booking.duration}h)</div>
                <div className="text-gray-300 text-sm">Time & Duration</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPin className="w-6 h-6 text-white" />
              <div>
                <div className="text-white font-semibold">{booking.court}</div>
                <div className="text-gray-300 text-sm">Court</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {booking.paymentMethod === 'credits' ? (
                <CreditCard className="w-6 h-6 text-white" />
              ) : (
                <Banknote className="w-6 h-6 text-white" />
              )}
              <div>
                <div className="text-white font-semibold">
                  ${booking.originalAmount} - {booking.paymentMethod === 'credits' ? 'Courtside Credits' : 'Banking Payment'}
                </div>
                <div className="text-gray-300 text-sm">Payment</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modification Info */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Modification Policy</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• Maximum 2 modifications per booking</div>
            <div>• Pending bookings: Full modification allowed</div>
            <div>• Approved bookings: Limited changes based on time</div>
            <div>• Refunds processed as Courtside credits</div>
          </div>
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <div className="text-white font-semibold">Modifications used: {booking.modificationCount}/2</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {canModify && (
            <Button
              onClick={handleEditBooking}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
            >
              <Edit className="w-5 h-5 mr-2" />
              Edit Booking
            </Button>
          )}

          {!canModify && isBookingTooClose() && (
            <div className="bg-orange-500/20 backdrop-blur-md rounded-2xl p-6 border border-orange-300/30 text-center">
              <div className="text-orange-400 text-2xl mb-2">⏰</div>
              <h3 className="text-lg font-bold text-white mb-2">Booking Too Close</h3>
              <p className="text-gray-300 mb-2">
                Cannot modify booking within 2 hours of start time.
              </p>
              <p className="text-sm text-gray-400">
                Your booking starts at {booking.time} on {booking.date}
              </p>
            </div>
          )}

          {canCancel && (
            <Button
              onClick={handleCancelBooking}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-300/30 py-4 rounded-xl font-semibold"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel Booking
            </Button>
          )}

          {!canModify && !canCancel && !isBookingTooClose() && (
            <div className="text-center text-gray-300 py-4">
              No modifications allowed for this booking
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 