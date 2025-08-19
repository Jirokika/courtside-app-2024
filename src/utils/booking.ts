import { format, addDays, isToday } from 'date-fns'
import { 
  Sport, 
  Duration, 
  TimeSlot, 
 
  SimpleBooking, 
  AdvancedBooking, 
  PricingInfo,

} from '../types'

// Pricing constants
export const PRICING = {
  badminton: 12, // $12/hour
  pickleball: 16, // $16/hour
} as const

// Court configuration
export const COURTS = {
  badminton: Array.from({ length: 8 }, (_, i) => ({
    id: `badminton-${i + 1}`,
    name: `Badminton Court ${i + 1}`,
    sport: 'badminton' as Sport,
    isAvailable: true,
  })),
  pickleball: Array.from({ length: 4 }, (_, i) => ({
    id: `pickleball-${i + 1}`,
    name: `Pickleball Court ${i + 1}`,
    sport: 'pickleball' as Sport,
    isAvailable: true,
  })),
} as const

// Time slots configuration (07:00-21:00, removed 22:00)
export const TIME_SLOTS: TimeSlot[] = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7
  const startTime = `${hour.toString().padStart(2, '0')}:00`
  const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`
  
  return {
    id: `time-${startTime}`,
    startTime,
    endTime,
    isAvailable: true,
    availableCourts: [...COURTS.badminton, ...COURTS.pickleball],
  }
})

// Generate available dates (next 30 days)
export function generateAvailableDates(): Date[] {
  const dates: Date[] = []
  const today = new Date()
  
  for (let i = 0; i < 30; i++) {
    dates.push(addDays(today, i))
  }
  
  return dates
}

// Filter time slots based on date and current time
export function filterTimeSlotsForDate(date: Date, sport: Sport): TimeSlot[] {
  const isCurrentDate = isToday(date)
  const currentHour = new Date().getHours()
  
  return TIME_SLOTS.filter(slot => {
    const slotHour = parseInt(slot.startTime.split(':')[0])
    
    // If it's today, only show future time slots
    if (isCurrentDate) {
      return slotHour > currentHour
    }
    
    // For future dates, all time slots are available
    return true
  }).map(slot => ({
    ...slot,
    availableCourts: COURTS[sport],
  }))
}

// Calculate pricing for simple booking
export function calculateSimpleBookingPricing(
  sport: Sport,
  duration: Duration,
  numberOfDates: number,
  numberOfCourts: number
): PricingInfo {
  const pricePerHour = PRICING[sport]
  const totalHours = duration * numberOfDates
  const totalPrice = pricePerHour * duration * numberOfDates * numberOfCourts
  
  return {
    pricePerHour,
    totalHours,
    numberOfDates,
    numberOfCourts,
    totalPrice,
    currency: 'USD',
  }
}

// Calculate pricing for advanced booking
export function calculateAdvancedBookingPricing(
  bookings: AdvancedBooking['bookings']
): PricingInfo {
  let totalPrice = 0
  let totalHours = 0
  
  bookings.forEach(booking => {
    const pricePerHour = PRICING[booking.sport]
    const bookingPrice = pricePerHour * booking.duration * booking.courts.length
    totalPrice += bookingPrice
    totalHours += booking.duration
  })
  
  return {
    pricePerHour: 0, // Varies by booking
    totalHours,
    numberOfDates: bookings.length,
    numberOfCourts: bookings.reduce((sum, booking) => sum + booking.courts.length, 0),
    totalPrice,
    currency: 'USD',
  }
}

// Format time for display
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

// Format date for display
export function formatDate(date: Date): string {
  return format(date, 'MMM d, yyyy')
}

// Format date for API
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Check if time slot is available for all selected dates (Simple Mode)
export function getAvailableTimeSlotsForAllDates(
  dates: Date[],
  sport: Sport
): TimeSlot[] {
  if (dates.length === 0) return []
  
  // Get time slots for each date
  const timeSlotsByDate = dates.map(date => filterTimeSlotsForDate(date, sport))
  
  // Find intersection of available time slots
  const availableTimeSlots = timeSlotsByDate.reduce((intersection, currentSlots) => {
    return intersection.filter(intersectionSlot => 
      currentSlots.some(currentSlot => currentSlot.startTime === intersectionSlot.startTime)
    )
  }, timeSlotsByDate[0] || [])
  
  return availableTimeSlots
}

// Validate booking data
export function validateSimpleBooking(booking: SimpleBooking): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!booking.dates || booking.dates.length === 0) {
    errors.push('Please select at least one date')
  }
  
  if (!booking.timeSlot) {
    errors.push('Please select a time slot')
  }
  
  if (!booking.courts || booking.courts.length === 0) {
    errors.push('Please select at least one court')
  }
  
  if (booking.duration < 1 || booking.duration > 5) {
    errors.push('Duration must be between 1 and 5 hours')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateAdvancedBooking(booking: AdvancedBooking): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!booking.bookings || booking.bookings.length === 0) {
    errors.push('Please add at least one booking')
  }
  
  booking.bookings.forEach((bookingItem, index) => {
    if (!bookingItem.date) {
      errors.push(`Booking ${index + 1}: Please select a date`)
    }
    
    if (!bookingItem.timeSlot) {
      errors.push(`Booking ${index + 1}: Please select a time slot`)
    }
    
    if (!bookingItem.courts || bookingItem.courts.length === 0) {
      errors.push(`Booking ${index + 1}: Please select at least one court`)
    }
    
    if (bookingItem.duration < 1 || bookingItem.duration > 5) {
      errors.push(`Booking ${index + 1}: Duration must be between 1 and 5 hours`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Get sport display name
export function getSportDisplayName(sport: Sport): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

// Get sport color class
export function getSportColorClass(sport: Sport): string {
  return sport === 'badminton' ? 'badge-badminton' : 'badge-pickleball'
}

// Get sport gradient class
export function getSportGradientClass(sport: Sport): string {
  return sport === 'badminton' ? 'gradient-badminton' : 'gradient-pickleball'
}

// Generate booking ID
export function generateBookingId(): string {
  return `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Check if booking mode should be suggested
export function shouldSuggestAdvancedMode(
  selectedDates: Date[],
  availableTimeSlots: TimeSlot[]
): boolean {
  // Suggest advanced mode if no time slots available for all dates
  return availableTimeSlots.length === 0 && selectedDates.length > 1
} 