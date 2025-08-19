import React, { useEffect } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../ui'
import { AppState, AppScreen } from '../../types'
import { 
  formatDate, 
  formatTime, 
  getSportDisplayName,
  generateBookingId 
} from '../../utils/booking'
import { showTelegramAlert, closeTelegramWebApp } from '../../utils/telegram'
import { CheckCircle, Calendar, Clock, MapPin, Share2, Home } from 'lucide-react'

interface ConfirmationScreenProps {
  navigateTo: (screen: AppScreen) => void
  updateBookingState: (updates: any) => void
  setError: (error: any) => void
  resetBooking: () => void
  appState: AppState
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  navigateTo,
  resetBooking,
  appState,
}) => {
  const { bookingState } = appState
  const { simpleBooking } = bookingState

  const bookingId = generateBookingId()

  useEffect(() => {
    // Show success message
    showTelegramAlert('Booking confirmed successfully! 🎉')
  }, [])

  const handleNewBooking = () => {
    resetBooking()
    navigateTo('welcome')
  }

  const handleClose = () => {
    closeTelegramWebApp()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Courtside Booking Confirmed',
        text: `I just booked ${simpleBooking?.courts.length} ${getSportDisplayName(simpleBooking?.sport || 'badminton')} court(s) for ${simpleBooking?.dates.length} date(s)!`,
        url: window.location.href,
      })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`Courtside Booking Confirmed - Booking ID: ${bookingId}`)
      showTelegramAlert('Booking details copied to clipboard!')
    }
  }

  if (!simpleBooking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            No Booking Found
          </h2>
          <p className="text-gray-200 mb-6">
            Please complete a booking to see confirmation details.
          </p>
          <Button onClick={() => navigateTo('welcome')}>
            Start New Booking
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen safe-area-top safe-area-bottom" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="container mx-auto px-6 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 mb-6">
            <CheckCircle className="w-10 h-10 text-success-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Booking Confirmed!
          </h1>
          
          <p className="text-lg text-neutral-600 mb-4">
            Your court booking has been successfully confirmed
          </p>
          
          <div className="inline-flex items-center space-x-2 bg-success-100 rounded-full px-4 py-2">
            <span className="text-sm font-medium text-success-700">
              Booking ID: {bookingId}
            </span>
          </div>
        </div>

        {/* Booking Details */}
        <div className="space-y-6">
          {/* Sport */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary-600" />
                </div>
                <span>Sport</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-neutral-900">
                  {getSportDisplayName(simpleBooking.sport)}
                </span>
                <Badge variant={simpleBooking.sport === 'badminton' ? 'badminton' : 'pickleball'}>
                  {simpleBooking.sport}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Dates</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Booked Dates:</span>
                  <Badge variant="success">
                    {simpleBooking.dates.length} date{simpleBooking.dates.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  {simpleBooking.dates.map(formatDate).join(', ')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Time</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Time Slot:</span>
                  <span className="font-semibold text-neutral-900">
                    {formatTime(simpleBooking.timeSlot)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Duration:</span>
                  <span className="font-semibold text-neutral-900">
                    {simpleBooking.duration} hour{simpleBooking.duration !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Courts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Courts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Booked Courts:</span>
                  <Badge variant="success">
                    {simpleBooking.courts.length} court{simpleBooking.courts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  {simpleBooking.courts.join(', ')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Important Information */}
          <Card className="border-warning-200 bg-warning-50">
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning-500 mt-2 flex-shrink-0" />
                  <p className="text-neutral-700">
                    Please arrive 10 minutes before your booking time
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning-500 mt-2 flex-shrink-0" />
                  <p className="text-neutral-700">
                    Bring your own equipment or rent from our facility
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning-500 mt-2 flex-shrink-0" />
                  <p className="text-neutral-700">
                    Cancellations must be made 24 hours in advance
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning-500 mt-2 flex-shrink-0" />
                  <p className="text-neutral-700">
                    Contact us at +1 (555) 123-4567 for any questions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleShare}
            icon={<Share2 className="w-4 h-4" />}
          >
            Share Booking
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleNewBooking}
              icon={<Home className="w-4 h-4" />}
            >
              New Booking
            </Button>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-neutral-500">
          <p>Thank you for choosing Courtside!</p>
          <p className="mt-1">We look forward to seeing you on the court.</p>
        </div>
      </div>
    </div>
  )
} 