import React from 'react'
import { CreditPackage, CreditPurchase, CreditTransaction, PromoCode, Notification, Task, Reward, PointsTransaction, RewardPurchase } from '../types'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

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
  createdAt: string
  updatedAt: string
}

interface UserData {
  id: string
  name: string
  email?: string
  credits: number
  points: number
  avatar?: string
}

interface CourtData {
  id: string
  name: string
  sport: string
  isAvailable: boolean
  currentBooking?: {
    startTime: string
    endTime: string
    sport: string
  }
}

interface PaymentData {
  id: string
  bookingId: string
  amount: number
  method: 'credits' | 'aba'
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

class ApiService {
  private baseUrl: string
  private apiKey: string | null = null
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Use Railway backend URL
    this.baseUrl = 'https://courtside-backend-production.up.railway.app'
    this.apiKey = import.meta.env.VITE_API_KEY || null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 1
  ): Promise<ApiResponse<T>> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseUrl}${endpoint}`
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...options.headers,
        }

        // Get authentication token from localStorage or auth manager
        let authToken = localStorage.getItem('auth_token')
        if (!authToken) {
          // Try to get from auth manager if available
          try {
            const { authManager } = await import('./auth')
            authToken = authManager.getToken()
          } catch (error) {
            // Auth manager not available, continue without token
          }
        }
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`
        } else if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`
        }

        const response = await fetch(url, {
          ...options,
          headers,
        })

        console.log('🔐 API Response:', {
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        const data = await response.json()
        console.log('🔐 API Response data:', data)

        if (!response.ok) {
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: data.error || 'Request failed',
              message: data.message || 'An error occurred'
            }
          }
          
          // Retry on server errors (5xx) or network errors
                  if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            continue
          }
          
          return {
            success: false,
            error: data.error || 'Request failed',
            message: data.message || 'An error occurred'
          }
        }

        return data
      } catch (error) {
        console.error(`API request failed (attempt ${attempt}/${retries}):`, error)
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        
        return {
          success: false,
          error: 'Network error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    return {
      success: false,
      error: 'Request failed after retries',
      message: 'All retry attempts failed'
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramsString = params ? JSON.stringify(params) : ''
    return `${endpoint}${paramsString}`
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout
  }

  private getCachedData<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data
    }
    return null
  }

  private setCachedData(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    })
  }

  // Authentication API methods
  async authenticateTelegram(telegramUser: any): Promise<ApiResponse<{ user: UserData; token: string }>> {
    const response = await this.request<{ user: UserData; token: string }>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        languageCode: telegramUser.language_code,
        isPremium: telegramUser.is_premium
      })
    })

    if (response.success && response.data?.token) {
      // Store token in localStorage
      localStorage.setItem('auth_token', response.data.token)
    }

    return response
  }

  async getCurrentUser(): Promise<ApiResponse<UserData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<UserData>('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.success && response.data) {
      this.setCachedData('current_user', response.data)
    }
    
    return response
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token')
    this.clearCache()
  }

  private getCurrentUserId(): string | null {
    try {
      // First try to get from cached user data
      const cached = this.getCachedData<UserData>('current_user')
      if (cached && cached.id) {
        return cached.id
      }

      // Fallback: Try to get from Telegram WebApp
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      if (telegramUser?.id) {
        return telegramUser.id.toString()
      }

      // If no user ID available, return null
      return null
    } catch (error) {
      console.error('Error getting current user ID:', error)
      return null
    }
  }

  async getUser(userId: string): Promise<ApiResponse<UserData>> {
    const cacheKey = this.getCacheKey(`/api/users/${userId}`)
    const cached = this.getCachedData<UserData>(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const response = await this.request<UserData>(`/api/users/${userId}`)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async createUser(userData: {
    telegramId: string
    firstName: string
    lastName?: string
    username?: string
    photoUrl?: string
    languageCode?: string
    isPremium?: boolean
  }): Promise<ApiResponse<UserData>> {
    const response = await this.request<UserData>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })

    if (response.success) {
      // Clear user cache
      this.cache.delete(this.getCacheKey('/user/me'))
    }

    return response
  }

  async updateUserCredits(userId: string, credits: number, operation: 'add' | 'subtract' = 'add'): Promise<ApiResponse<UserData>> {
    const response = await this.request<UserData>(`/api/users/${userId}/credits`, {
      method: 'PUT',
      body: JSON.stringify({ credits, operation }),
    })

    if (response.success) {
      // Clear user cache
      this.cache.delete(this.getCacheKey(`/api/users/${userId}`))
    }

    return response
  }

  async updateUserPoints(userId: string, points: number, operation: 'add' | 'subtract' = 'add'): Promise<ApiResponse<UserData>> {
    const response = await this.request<UserData>(`/api/users/${userId}/points`, {
      method: 'PUT',
      body: JSON.stringify({ points, operation }),
    })

    if (response.success) {
      // Clear user cache
      this.cache.delete(this.getCacheKey(`/api/users/${userId}`))
    }

    return response
  }

  async updateUserProfile(updates: Partial<UserData>): Promise<ApiResponse<UserData>> {
    const response = await this.request<UserData>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success) {
      // Clear user cache
      this.cache.delete(this.getCacheKey('/user/me'))
    }

    return response
  }

  // Booking API methods
  async createBooking(bookingData: {
    sport: string
    date: string
    time: string
    duration: number
    courts: string[]
    paymentMethod: 'credits' | 'aba'
  }): Promise<ApiResponse<BookingData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<BookingData>('/api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData),
    })

    if (response.success) {
      // Clear bookings cache
      this.clearBookingsCache()
    }

    return response
  }

  async getBookings(status?: string): Promise<ApiResponse<BookingData[]>> {
    const token = localStorage.getItem('auth_token')
    console.log('🔐 API: getBookings - Auth token exists:', !!token)
    
    if (!token) {
      console.log('❌ API: getBookings - No authentication token')
      return { success: false, error: 'No authentication token' }
    }

    const params = status ? { status } : {}
    const cacheKey = this.getCacheKey('/api/bookings', params)
    const cached = this.getCachedData<BookingData[]>(cacheKey)
    
    if (cached) {
      console.log('✅ API: getBookings - Using cached data')
      return { success: true, data: cached }
    }

    const queryString = new URLSearchParams(params).toString()
    const endpoint = `/api/bookings${queryString ? `?${queryString}` : ''}`
    
    console.log('🔍 API: getBookings - Making request to:', endpoint)
    const response = await this.request<BookingData[]>(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('🔍 API: getBookings - Response:', response)
    
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async getBooking(id: string): Promise<ApiResponse<BookingData>> {
    const cacheKey = this.getCacheKey(`/api/bookings/${id}`)
    const cached = this.getCachedData<BookingData>(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const response = await this.request<BookingData>(`/api/bookings/${id}`)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async cancelBooking(id: string, reason?: string): Promise<ApiResponse<BookingData>> {
    const response = await this.request<BookingData>(`/api/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })

    if (response.success) {
      this.clearBookingsCache()
    }

    return response
  }

  async modifyBooking(
    id: string,
    updates: Partial<BookingData>
  ): Promise<ApiResponse<BookingData>> {
    const response = await this.request<BookingData>(`/api/bookings/${id}/modify`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    if (response.success) {
      this.clearBookingsCache()
    }

    return response
  }

  // Court API methods
  async getCourts(sport?: string): Promise<ApiResponse<CourtData[]>> {
    const params = sport ? { sport } : {}
    const cacheKey = this.getCacheKey('/api/courts', params)
    const cached = this.getCachedData<CourtData[]>(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const queryString = new URLSearchParams(params).toString()
    const endpoint = `/api/courts${queryString ? `?${queryString}` : ''}`
    
    const response = await this.request<CourtData[]>(endpoint)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async getCourtsWithAvailability(sport: string, date: string, time: string): Promise<ApiResponse<CourtData[]>> {
    console.log('🔍 API: getCourtsWithAvailability called with:', { sport, date, time })
    
    const params = { sport, date, time }
    const cacheKey = this.getCacheKey('/api/courts/availability', params)
    const cached = this.getCachedData<CourtData[]>(cacheKey)
    
    if (cached) {
      console.log('🔍 API: Returning cached data')
      return { success: true, data: cached }
    }

    const queryString = new URLSearchParams(params).toString()
    const endpoint = `/api/courts/availability?${queryString}`
    console.log('🔍 API: Making request to:', endpoint)
    
    const response = await this.request<CourtData[]>(endpoint)
    console.log('🔍 API: Response:', response)
    
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async getCourtAvailability(courtId: string, date: string): Promise<ApiResponse<{
    court: CourtData
    date: string
    timeSlots: Array<{
      hour: number
      startTime: string
      endTime: string
      isAvailable: boolean
      formattedTime: string
      booking?: {
        id: string
        userId: string
        userName: string
        sport: string
        status: string
      }
    }>
    totalSlots: number
    availableSlots: number
    bookedSlots: number
  }>> {
    const cacheKey = this.getCacheKey(`/api/courts/${courtId}/availability`, { date })
    const cached = this.getCachedData(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const response = await this.request(`/api/courts/${courtId}/availability?date=${date}`)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async createCourt(courtData: {
    name: string
    sport: string
    description?: string
    hourlyRate?: number
    isActive?: boolean
  }): Promise<ApiResponse<CourtData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<CourtData>('/api/courts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courtData),
    })

    if (response.success) {
      // Clear courts cache
      this.clearCourtsCache()
    }

    return response
  }

  async updateCourt(courtId: string, courtData: Partial<CourtData>): Promise<ApiResponse<CourtData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<CourtData>(`/api/courts/${courtId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courtData),
    })

    if (response.success) {
      // Clear courts cache
      this.clearCourtsCache()
    }

    return response
  }

  async checkBookingConflicts(conflictData: {
    courtId: string
    startTime: string
    endTime: string
  }): Promise<ApiResponse<{
    hasConflicts: boolean
    conflicts: Array<{
      id: string
      startTime: string
      endTime: string
      status: string
      firstName: string
      lastName: string
    }>
    requestedSlot: {
      courtId: string
      startTime: string
      endTime: string
    }
  }>> {
    const response = await this.request('/api/bookings/check-conflicts', {
      method: 'POST',
      body: JSON.stringify(conflictData),
    })

    return response
  }

  async confirmBooking(bookingId: string): Promise<ApiResponse<{
    bookingId: string
    status: string
    message: string
  }>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request(`/api/bookings/${bookingId}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.success) {
      // Clear bookings cache
      this.clearBookingsCache()
    }

    return response
  }



  async getTimeSlots(
    courtId: string,
    date: string,
    includeAnalytics: boolean = true
  ): Promise<ApiResponse<{
    courtId: string
    date: string
    availableSlots: Array<{
      id: string
      startTime: string
      endTime: string
      hour: number
      isAvailable: boolean
      formattedTime: string
      analytics?: {
        bookingCount: number
        isPopular: boolean
        recommendationReason?: string
      }
    }>
    totalSlots: number
    availableCount: number
  }>> {
    const cacheKey = this.getCacheKey(`/api/timeslots/${courtId}/availability`, { date })
    const cached = this.getCachedData(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const response = await this.request(`/api/timeslots/${courtId}/availability?date=${date}`)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  async getMultiCourtTimeSlots(
    courts: string[],
    date: string
  ): Promise<ApiResponse<{
    date: string
    courts: string[]
    availableSlots: Array<{
      id: string
      startTime: string
      endTime: string
      hour: number
      courtAvailability: Record<string, boolean>
      formattedTime: string
    }>
    totalSlots: number
  }>> {
    const cacheKey = this.getCacheKey(`/api/timeslots/availability`, { date, courts })
    const cached = this.getCachedData(cacheKey)
    
    if (cached) {
      return { success: true, data: cached }
    }

    const queryParams = new URLSearchParams({
      date,
      ...courts.reduce((acc, court, index) => {
        acc[`courts[${index}]`] = court
        return acc
      }, {} as Record<string, string>)
    })

    const response = await this.request(`/api/timeslots/availability?${queryParams}`)
    if (response.success && response.data) {
      this.setCachedData(cacheKey, response.data)
    }
    
    return response
  }

  // Payment API methods
  async processPayment(paymentData: {
    bookingId: string
    amount: number
    method: 'credits' | 'aba'
    paymentProof?: string
  }): Promise<ApiResponse<PaymentData>> {
    const response = await this.request<PaymentData>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    })

    if (response.success) {
      // Clear user cache to refresh credits
      this.cache.delete(this.getCacheKey('/user/me'))
    }

    return response
  }

  async processPaymentById(paymentId: string, paymentMethod: 'credits' | 'aba'): Promise<ApiResponse<PaymentData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<PaymentData>(`/api/payments/${paymentId}/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ paymentMethod }),
    })

    if (response.success) {
      // Clear bookings cache
      this.clearBookingsCache()
      // Clear user cache to refresh credits
      this.cache.delete(this.getCacheKey('/user/me'))
    }

    return response
  }

  async getPaymentStatus(paymentId: string): Promise<ApiResponse<PaymentData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<PaymentData>(`/api/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response
  }

  async updatePaymentStatus(paymentId: string, status: 'pending' | 'completed' | 'failed' | 'refunded', transactionId?: string): Promise<ApiResponse<PaymentData>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<PaymentData>(`/api/payments/${paymentId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, transactionId }),
    })

    if (response.success) {
      // Clear bookings cache
      this.clearBookingsCache()
    }

    return response
  }

  // Utility methods
  private clearBookingsCache(): void {
    // Clear all booking-related cache entries
    for (const [key] of this.cache) {
      if (key.includes('/bookings')) {
        this.cache.delete(key)
      }
    }
  }

  private clearCourtsCache(): void {
    // Clear all court-related cache entries
    for (const [key] of this.cache) {
      if (key.includes('/courts')) {
        this.cache.delete(key)
      }
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health')
  }

  // Promo code methods
  async validatePromoCode(code: string): Promise<ApiResponse<PromoCode>> {
    const response = await this.request<PromoCode>('/api/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
    return response
  }

  async applyPromoCode(bookingId: string, code: string): Promise<ApiResponse<{
    bookingId: string
    originalAmount: number
    discountAmount: number
    finalAmount: number
    promoCode: PromoCode
  }>> {
    const response = await this.request(`/api/bookings/${bookingId}/apply-promo`, {
      method: 'POST',
      body: JSON.stringify({ code })
    })
    return response
  }

  // Notification methods
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return { success: false, error: 'No authentication token' }
    }

    const response = await this.request<Notification[]>('/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    const response = await this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PUT'
    })
    return response
  }

  async scheduleBookingReminder(bookingId: string, reminderTime: Date): Promise<ApiResponse<Notification>> {
    const response = await this.request('/api/notifications/schedule', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        type: 'reminder',
        scheduledFor: reminderTime.toISOString()
      })
    })
    return response
  }

  // Payment tracking methods
  async trackPayment(paymentId: string): Promise<ApiResponse<{
    paymentId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    trackingId: string
    lastUpdated: string
    statusHistory: Array<{
      status: string
      timestamp: string
      details?: string
    }>
  }>> {
    const response = await this.request(`/api/payments/${paymentId}/track`)
    return response
  }

  // Multiple courts booking methods
  async checkMultiCourtAvailability(courts: string[], date: string, time: string, duration: number): Promise<ApiResponse<{
    available: boolean
    conflicts: Array<{
      courtId: string
      conflictingBookings: Array<{
        id: string
        startTime: string
        endTime: string
      }>
    }>
  }>> {
    const response = await this.request('/api/courts/check-multi-availability', {
      method: 'POST',
      body: JSON.stringify({ courts, date, time, duration })
    })
    return response
  }

  // Popular time slots methods
  async getPopularTimeSlots(sport: string, dayOfWeek?: number): Promise<ApiResponse<Array<{
    hour: number
    bookingCount: number
    isPopular: boolean
    recommendationReason: string
  }>>> {
    const params = new URLSearchParams()
    if (dayOfWeek !== undefined) {
      params.append('dayOfWeek', dayOfWeek.toString())
    }
    params.append('sport', sport)

    const response = await this.request(`/api/analytics/popular-times?${params}`)
    return response
  }

  // Credit Purchase System
  async getCreditPackages(): Promise<ApiResponse<CreditPackage[]>> {
    return this.request<CreditPackage[]>('/api/credits/packages')
  }

  async purchaseCredits(packageId: string, paymentProofUrl: string): Promise<ApiResponse<CreditPurchase>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    return this.request<CreditPurchase>('/api/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        packageId,
        paymentProofUrl
      })
    })
  }

  async getCreditPurchaseHistory(): Promise<ApiResponse<CreditPurchase[]>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }
    
    return this.request<CreditPurchase[]>(`/api/credits/purchases/${userId}`)
  }

  async getCreditTransactions(): Promise<ApiResponse<CreditTransaction[]>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }
    
    return this.request<CreditTransaction[]>(`/api/credits/transactions/${userId}`)
  }

  // ===== POINTS SYSTEM METHODS =====

  async getTasks(): Promise<ApiResponse<Task[]>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }
    
    return this.request<Task[]>(`/api/points/tasks/${userId}`)
  }

  async completeTask(taskId: string, metadata?: any): Promise<ApiResponse<{ points_earned: number; completion_count: number; task_name: string }>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    return this.request<{ points_earned: number; completion_count: number; task_name: string }>('/api/points/tasks/' + taskId + '/complete', {
      method: 'POST',
      body: JSON.stringify({ userId, metadata })
    })
  }

  async getRewards(): Promise<ApiResponse<{ all: Reward[]; by_category: Record<string, Reward[]> }>> {
    return this.request<{ all: Reward[]; by_category: Record<string, Reward[]> }>('/api/points/rewards')
  }

  async purchaseReward(rewardId: string): Promise<ApiResponse<{ purchase_id: string; reward_name: string; points_spent: number; remaining_points: number; expires_at?: string }>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    return this.request<{ purchase_id: string; reward_name: string; points_spent: number; remaining_points: number; expires_at?: string }>('/api/points/rewards/' + rewardId + '/purchase', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
  }

  async getPointsTransactions(): Promise<ApiResponse<PointsTransaction[]>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }
    
    return this.request<PointsTransaction[]>(`/api/points/transactions/${userId}`)
  }

  async getRewardPurchases(): Promise<ApiResponse<RewardPurchase[]>> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }
    
    return this.request<RewardPurchase[]>(`/api/points/purchases/${userId}`)
  }
}

// Create singleton instance
export const apiService = new ApiService()

// Export for use in components - use useMemo to prevent infinite loops
export const useApi = () => {
  // Use React.useMemo to ensure stable reference
  const api = React.useMemo(() => ({
    authenticateTelegram: apiService.authenticateTelegram.bind(apiService),
    getCurrentUser: apiService.getCurrentUser.bind(apiService),
    getUser: apiService.getUser.bind(apiService),
    createUser: apiService.createUser.bind(apiService),
    updateUserCredits: apiService.updateUserCredits.bind(apiService),
    updateUserPoints: apiService.updateUserPoints.bind(apiService),
    updateUserProfile: apiService.updateUserProfile.bind(apiService),
    createBooking: apiService.createBooking.bind(apiService),
    getBookings: apiService.getBookings.bind(apiService),
    getBooking: apiService.getBooking.bind(apiService),
    confirmBooking: apiService.confirmBooking.bind(apiService),
    modifyBooking: apiService.modifyBooking.bind(apiService),
    cancelBooking: apiService.cancelBooking.bind(apiService),
    getCourts: apiService.getCourts.bind(apiService),
    getCourtsWithAvailability: apiService.getCourtsWithAvailability.bind(apiService),
    getCourtAvailability: apiService.getCourtAvailability.bind(apiService),
    createCourt: apiService.createCourt.bind(apiService),
    updateCourt: apiService.updateCourt.bind(apiService),
    checkBookingConflicts: apiService.checkBookingConflicts.bind(apiService),
    getTimeSlots: apiService.getTimeSlots.bind(apiService),
    getMultiCourtTimeSlots: apiService.getMultiCourtTimeSlots.bind(apiService),
    processPayment: apiService.processPayment.bind(apiService),
    processPaymentById: apiService.processPaymentById.bind(apiService),
    getPaymentStatus: apiService.getPaymentStatus.bind(apiService),
    updatePaymentStatus: apiService.updatePaymentStatus.bind(apiService),
    healthCheck: apiService.healthCheck.bind(apiService),
    clearCache: apiService.clearCache.bind(apiService),
    // New methods
    validatePromoCode: apiService.validatePromoCode.bind(apiService),
    applyPromoCode: apiService.applyPromoCode.bind(apiService),
    getNotifications: apiService.getNotifications.bind(apiService),
    markNotificationAsRead: apiService.markNotificationAsRead.bind(apiService),
    scheduleBookingReminder: apiService.scheduleBookingReminder.bind(apiService),
    trackPayment: apiService.trackPayment.bind(apiService),
    checkMultiCourtAvailability: apiService.checkMultiCourtAvailability.bind(apiService),
    getPopularTimeSlots: apiService.getPopularTimeSlots.bind(apiService),
    // Credit Purchase System
    getCreditPackages: apiService.getCreditPackages.bind(apiService),
    purchaseCredits: apiService.purchaseCredits.bind(apiService),
    getCreditPurchaseHistory: apiService.getCreditPurchaseHistory.bind(apiService),
    getCreditTransactions: apiService.getCreditTransactions.bind(apiService),
    // Points System
    getTasks: apiService.getTasks.bind(apiService),
    completeTask: apiService.completeTask.bind(apiService),
    getRewards: apiService.getRewards.bind(apiService),
    purchaseReward: apiService.purchaseReward.bind(apiService),
    getPointsTransactions: apiService.getPointsTransactions.bind(apiService),
    getRewardPurchases: apiService.getRewardPurchases.bind(apiService),
  }), [])

  return api
} 