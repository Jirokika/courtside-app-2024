import React, { useState, useMemo } from 'react'
import { Button } from '../ui/Button'
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react'
import { FadeIn } from '../ui/VisualPolish'

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

interface CalendarViewProps {
  bookings: BookingData[]
  onBookingClick: (bookingId: string) => void
}

const CalendarView: React.FC<CalendarViewProps> = ({ bookings, onBookingClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= lastDay || currentDate.getDay() !== 0) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayBookings = bookings.filter(booking => booking.date === dateStr)
      
      days.push({
        date: new Date(currentDate),
        dateStr,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === new Date().toDateString(),
        bookings: dayBookings
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return days
  }, [currentDate, bookings])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'cancelled': return 'bg-red-500'
      case 'completed': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviousMonth}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <h2 className="text-xl font-bold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-gray-300 text-sm font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <FadeIn key={day.dateStr} delay={index * 0.01}>
            <div
              className={`min-h-[80px] p-2 border border-white/10 rounded-lg transition-all duration-200 ${
                day.isCurrentMonth 
                  ? 'bg-white/5 hover:bg-white/10' 
                  : 'bg-white/2 opacity-50'
              } ${day.isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              {/* Date Number */}
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-white' : 'text-gray-400'
              }`}>
                {day.date.getDate()}
              </div>

              {/* Booking Indicators */}
              <div className="space-y-1">
                {day.bookings.slice(0, 3).map((booking, bookingIndex) => (
                  <div
                    key={booking.id}
                    onClick={() => onBookingClick(booking.id)}
                    className={`cursor-pointer rounded px-1 py-0.5 text-xs font-medium truncate ${
                      getStatusColor(booking.status)
                    } text-white opacity-90 hover:opacity-100 transition-opacity`}
                    title={`${booking.sport} at ${booking.time} - ${booking.courtName}`}
                  >
                    {booking.sport === 'badminton' ? '🏸' : '🏓'} {booking.time}
                  </div>
                ))}
                {day.bookings.length > 3 && (
                  <div className="text-xs text-gray-400 text-center">
                    +{day.bookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <h3 className="text-white font-medium mb-3">Booking Status</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300 text-sm">Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-300 text-sm">Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300 text-sm">Cancelled</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-gray-300 text-sm">Completed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarView 