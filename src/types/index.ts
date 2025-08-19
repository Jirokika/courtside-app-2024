// Sport types
export type Sport = 'badminton' | 'pickleball'

// Court types
export interface Court {
  id: string
  name: string
  sport: Sport
  isAvailable: boolean
}

// Time slot interface
export interface TimeSlot {
  id: string
  startTime: string // Format: "HH:MM"
  endTime: string // Format: "HH:MM"
  hour: number
  isAvailable: boolean
  availableCourts: Court[]
  availableCourtCount?: number
  formattedTime: string
  analytics?: TimeSlotAnalytics
  booking?: {
    id: string
    userId: string
    userName: string
    sport: string
    status: string
  }
}

export interface TimeSlotAnalytics {
  hourOfDay: number
  bookingCount: number
  isPopular: boolean
  recommendationReason?: string
}

// Duration options
export type Duration = 1 | 2 | 3 | 4 | 5

// Booking mode
export type BookingMode = 'simple' | 'advanced'

// Date selection
export interface DateSelection {
  date: Date
  isSelected: boolean
  availableTimeSlots: TimeSlot[]
}

// Simple booking interface
export interface SimpleBooking {
  dates: Date[]
  timeSlot: string
  duration: Duration
  courts: string[]
  sport: Sport
}

// Advanced booking interface
export interface AdvancedBooking {
  bookings: {
    date: Date
    timeSlot: string
    duration: Duration
    courts: string[]
    sport: Sport
  }[]
}

// Booking state
export interface BookingState {
  mode: BookingMode
  selectedSport: Sport | null
  selectedDates: Date[]
  selectedTimeSlot: string | null
  selectedDuration: Duration
  selectedCourts: string[]
  simpleBooking: SimpleBooking | null
  advancedBooking: AdvancedBooking | null
  selectedBooking?: any // For modification flow
  promoCode?: string
  promoCodeDetails?: PromoCode
  paymentStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  paymentTrackingId?: string
}

export interface PromoCode {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxUses?: number
  usedCount: number
  startDate?: Date
  endDate?: Date
  isActive: boolean
}

export interface Notification {
  id: string
  userId: string
  bookingId?: string
  type: 'reminder' | 'confirmation' | 'modification' | 'cancellation' | 'payment'
  title: string
  message: string
  isRead: boolean
  scheduledFor?: Date
  createdAt: Date
  updatedAt: Date
}

// Pricing information
export interface PricingInfo {
  pricePerHour: number
  totalHours: number
  numberOfDates: number
  numberOfCourts: number
  totalPrice: number
  currency: string
}

// User information from Telegram
export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

// Booking confirmation
export interface BookingConfirmation {
  bookingId: string
  user: TelegramUser
  booking: SimpleBooking | AdvancedBooking
  pricing: PricingInfo
  confirmationDate: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Available time slots response
export interface AvailableTimeSlotsResponse {
  dates: DateSelection[]
  sport: Sport
}

// Booking creation response
export interface BookingCreationResponse {
  bookingId: string
  confirmation: BookingConfirmation
}

// Error types
export interface BookingError {
  code: string
  message: string
  details?: any
}

// Navigation types
export type AppScreen = 
  | 'welcome'
  | 'home'
  | 'bookings'
  | 'credits'
  | 'points'
  | 'sport-selection'
  | 'date-selection'
  | 'time-selection'
  | 'duration-selection'
  | 'court-selection'
  | 'booking-summary'
  | 'booking-details'
  | 'booking-modification'
  | 'modification-payment'
  | 'modification-success'
  | 'cancellation-confirmation'
  | 'confirmation'
  | 'shared-booking'
  | 'notifications'
  | 'error'

// App state
export interface AppState {
  currentScreen: AppScreen
  bookingState: BookingState
  user: TelegramUser | null
  isLoading: boolean
  error: BookingError | null
  modifiedBooking?: BookingData
}

// Screen props interface for all screen components
export interface ScreenProps {
  navigateTo: (screen: AppScreen) => void
  updateBookingState: (updates: Partial<BookingState>) => void
  setError?: (error: BookingError | null) => void
  resetBooking?: () => void
  appState: AppState
}

// Credit System interfaces
export interface CreditPackage {
  id: string
  price: number
  credits: number
  bonus: number
  description: string
}

export interface CreditPurchase {
  id: string
  userId: string
  package_id: string
  amount_usd: number
  credits_amount: number
  bonus_credits: number
  status: 'pending' | 'approved' | 'rejected'
  payment_proof_url?: string
  admin_notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  type: 'purchase' | 'spent' | 'earned' | 'refund'
  description: string
  reference_id?: string
  createdAt: string
}

// Points System Types
export interface Task {
  id: string
  name: string
  description: string
  points_reward: number
  category: string
  task_type: 'one-time' | 'repeatable' | 'daily' | 'weekly'
  max_completions?: number
  is_active: boolean
  icon?: string
  order_priority: number
  user_completion_count: number
  user_points_earned: number
  last_completed?: string
  is_completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Reward {
  id: string
  name: string
  description: string
  points_cost: number
  category: string
  reward_type: 'discount' | 'voucher' | 'feature' | 'merchandise'
  reward_value?: number
  duration_days?: number
  is_active: boolean
  icon?: string
  image_url?: string
  stock_quantity?: number
  order_priority: number
  createdAt: string
  updatedAt: string
}

export interface UserTask {
  id: string
  userId: string
  task_id: string
  completion_count: number
  last_completed?: string
  total_points_earned: number
  createdAt: string
  updatedAt: string
}

export interface PointsTransaction {
  id: string
  userId: string
  amount: number
  type: 'earned' | 'spent' | 'bonus' | 'refund'
  source: 'task_completion' | 'reward_purchase' | 'admin_adjustment'
  description: string
  reference_id?: string
  metadata?: string
  createdAt: string
}

export interface RewardPurchase {
  id: string
  userId: string
  reward_id: string
  points_spent: number
  status: 'active' | 'used' | 'expired' | 'refunded'
  expires_at?: string
  used_at?: string
  metadata?: string
  reward_name?: string
  reward_description?: string
  reward_type?: string
  reward_value?: number
  reward_icon?: string
  createdAt: string
  updatedAt: string
}

// Additional types for backend compatibility
export interface BookingData {
  id: string
  userId: string
  userName?: string
  sport: Sport
  courtId: string
  courtName?: string
  date: string
  startTime: string
  endTime: string
  duration: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  totalPrice: number
  paymentStatus?: 'pending' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface CourtData {
  id: string
  name: string
  sport: Sport
  isActive: boolean
  isAvailable?: boolean
  pricePerHour: number
  description?: string
  features?: string[]
  maxCapacity?: number
  location?: string
  createdAt: string
  updatedAt: string
}

export interface UserData {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  languageCode?: string
  isPremium?: boolean
  photoUrl?: string
  credits: number
  totalBookings: number
  memberSince: string
  lastActive?: string
  createdAt: string
  updatedAt: string
}

export interface AuthUser extends UserData {
  // Inherited from UserData
}

// Toast notification types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface UserReward {
  id: string
  name: string
  description: string
  type: 'discount' | 'voucher' | 'feature' | 'merchandise'
  value?: number
  isActive: boolean
} 