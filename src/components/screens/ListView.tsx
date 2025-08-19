import React from 'react'
import { Button } from '../ui/Button'
import { Calendar, Clock, MapPin, DollarSign, Share2, X, CheckCircle, MoreVertical } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../utils/api'

interface BookingData {
  id: string
  sport: string
  date: string
  time: string
  duration: number
  courts: string[]
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  paymentStatus: 'pending' | 'paid' | 'failed'
  totalAmount: number
  courtName?: string
  courtSport?: string
  createdAt: string
  updatedAt: string
}

interface ListViewProps {
  bookings: BookingData[]
  onBookingClick: (bookingId: string) => void
}

const ListView: React.FC<ListViewProps> = ({ bookings, onBookingClick }) => {
  const { showToast } = useToast()
  const { cancelBooking, confirmBooking } = useApi()

  // Get status badge styling
  const getStatusBadge = (status: string, paymentStatus: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold border'
    
    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-green-500/20 text-green-300 border-green-300/30`
      case 'pending':
        return paymentStatus === 'paid' 
          ? `${baseClasses} bg-blue-500/20 text-blue-300 border-blue-300/30`
          : `${baseClasses} bg-yellow-500/20 text-yellow-300 border-yellow-300/30`
      case 'cancelled':
        return `${baseClasses} bg-red-500/20 text-red-300 border-red-300/30`
      case 'completed':
        return `${baseClasses} bg-gray-500/20 text-gray-300 border-gray-300/30`
      default:
        return `${baseClasses} bg-gray-500/20 text-gray-300 border-gray-300/30`
    }
  }

  const getStatusText = (status: string, paymentStatus: string) => {
    if (status === 'pending' && paymentStatus === 'paid') {
      return 'Awaiting Confirmation'
    }
    switch (status) {
      case 'confirmed': return 'Confirmed'
      case 'pending': return 'Pending Payment'
      case 'cancelled': return 'Cancelled'
      case 'completed': return 'Completed'
      default: return 'Unknown'
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await cancelBooking(bookingId)
      if (response.success) {
        showToast('info', 'Booking cancelled successfully')
      } else {
        showToast('error', response.error || 'Failed to cancel booking')
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      showToast('error', 'Failed to cancel booking')
    }
  }

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const response = await confirmBooking(bookingId)
      if (response.success) {
        showToast('info', 'Booking confirmed successfully')
      } else {
        showToast('error', response.error || 'Failed to confirm booking')
      }
    } catch (error) {
      console.error('Error confirming booking:', error)
      showToast('error', 'Failed to confirm booking')
    }
  }

  const handleShareBooking = async (booking: BookingData) => {
    try {
      const shareData = {
        title: 'Courtside Booking',
        text: `I have a ${booking.sport} booking at ${booking.courtName} on ${booking.date} at ${booking.time}`,
        url: window.location.href
      }
      
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.text)
        showToast('info', 'Booking details copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing booking:', error)
      showToast('error', 'Failed to share booking')
    }
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking, index) => (
        <FadeIn key={booking.id} delay={0.4 + index * 0.1}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {booking.sport === 'badminton' ? '🏸' : '🏓'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white capitalize">{booking.sport}</h3>
                  <p className="text-gray-300 text-sm">Booking #{booking.id.slice(-8)}</p>
                </div>
              </div>
              <div className={getStatusBadge(booking.status, booking.paymentStatus)}>
                {getStatusText(booking.status, booking.paymentStatus)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-300" />
                <div>
                  <p className="text-gray-300 text-xs">Date & Time</p>
                  <p className="text-white font-semibold text-sm">{booking.date} at {booking.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-300" />
                <div>
                  <p className="text-gray-300 text-xs">Duration</p>
                  <p className="text-white font-semibold text-sm">{booking.duration}h</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-300" />
                <div>
                  <p className="text-gray-300 text-xs">Court</p>
                  <p className="text-white font-semibold text-sm">{booking.courtName || 'Court 1'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-gray-300" />
                <div>
                  <p className="text-gray-300 text-xs">Amount</p>
                  <p className="text-white font-semibold text-sm">${booking.totalAmount}</p>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex space-x-2">
                {booking.status === 'pending' && booking.paymentStatus === 'paid' && (
                  <ScaleButton>
                    <Button
                      onClick={() => handleConfirmBooking(booking.id)}
                      className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-300/30 rounded-lg text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirm
                    </Button>
                  </ScaleButton>
                )}
                {booking.status === 'confirmed' && new Date(booking.date) > new Date() && (
                  <ScaleButton>
                    <Button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-300/30 rounded-lg text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </ScaleButton>
                )}
                <ScaleButton>
                  <Button
                    onClick={() => handleShareBooking(booking)}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-300/30 rounded-lg text-xs"
                  >
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                </ScaleButton>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onBookingClick(booking.id)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 rounded-lg text-xs"
                >
                  <MoreVertical className="w-3 h-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      ))}
    </div>
  )
}

export default ListView 