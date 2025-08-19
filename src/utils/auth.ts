import React from 'react'
import { apiService } from './api'
import { getCurrentUser } from './telegram'
import { showTelegramAlert } from './telegram'

export interface AuthUser {
  id: string
  telegramId: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
  isPremium?: boolean
  credits: number
  points: number
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  error: string | null
}

class AuthManager {
  private static instance: AuthManager
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null
  }

  private listeners: ((state: AuthState) => void)[] = []

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  // Initialize authentication on app start
  async initialize(): Promise<AuthState> {
    console.log('🔐 Initializing authentication...')
    
    this.setLoading(true)
    
    try {
      // Check for existing token
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        console.log('🔍 Found stored token, validating...')
        const isValid = await this.validateToken(storedToken)
        if (isValid) {
          this.authState.token = storedToken
          this.authState.isAuthenticated = true
          await this.loadUserData()
          this.setLoading(false)
          this.notifyListeners()
          return this.authState
        } else {
          console.log('❌ Stored token is invalid, clearing...')
          this.clearAuth()
        }
      }

      // Try to authenticate with Telegram
      const telegramUser = getCurrentUser()
      if (telegramUser && telegramUser.id) {
        console.log('📱 Authenticating with Telegram user:', telegramUser)
        const authResult = await this.authenticateWithTelegram(telegramUser)
        if (authResult.success) {
          this.setLoading(false)
          this.notifyListeners()
          return this.authState
        }
      }

      // Fallback to guest mode
      console.log('👤 No valid authentication, using guest mode')
      this.authState.isAuthenticated = false
      this.authState.user = null
      this.authState.token = null
      this.setLoading(false)
      this.notifyListeners()
      return this.authState

    } catch (error) {
      console.error('❌ Authentication initialization failed:', error)
      this.authState.error = 'Authentication failed'
      this.setLoading(false)
      this.notifyListeners()
      return this.authState
    }
  }

  // Authenticate with Telegram user data
  async authenticateWithTelegram(telegramUser: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Authenticating with backend...')
      
      const authResponse = await apiService.authenticateTelegram({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        languageCode: telegramUser.language_code,
        isPremium: telegramUser.is_premium
      })

      if (authResponse.success && authResponse.data) {
        console.log('✅ Authentication successful')
        
        // Store token
        const token = authResponse.data.token
        localStorage.setItem('auth_token', token)
        
        // Update state
        this.authState.token = token
        this.authState.isAuthenticated = true
        this.authState.user = authResponse.data.user
        this.authState.error = null
        
        this.notifyListeners()
        return { success: true }
      } else {
        console.error('❌ Authentication failed:', authResponse.error)
        this.authState.error = authResponse.message || 'Authentication failed'
        this.notifyListeners()
        return { success: false, error: authResponse.message }
      }
    } catch (error) {
      console.error('❌ Authentication error:', error)
      this.authState.error = 'Authentication failed'
      this.notifyListeners()
      return { success: false, error: 'Authentication failed' }
    }
  }

  // Validate existing token
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await apiService.getCurrentUser()
      return response.success && response.data !== null
    } catch (error) {
      console.error('❌ Token validation failed:', error)
      return false
    }
  }

  // Load user data from backend
  async loadUserData(): Promise<void> {
    try {
      const response = await apiService.getCurrentUser()
      if (response.success && response.data) {
        this.authState.user = response.data
        this.notifyListeners()
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error)
    }
  }

  // Logout user
  logout(): void {
    console.log('🚪 Logging out user...')
    this.clearAuth()
    this.notifyListeners()
  }

  // Clear authentication data
  private clearAuth(): void {
    localStorage.removeItem('auth_token')
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    }
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.authState.user
  }

  // Get auth token
  getToken(): string | null {
    return this.authState.token
  }

  // Check if loading
  isLoading(): boolean {
    return this.authState.isLoading
  }

  // Get error
  getError(): string | null {
    return this.authState.error
  }

  // Set loading state
  private setLoading(loading: boolean): void {
    this.authState.isLoading = loading
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Notify listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }))
  }

  // Refresh user data
  async refreshUserData(): Promise<void> {
    if (this.authState.isAuthenticated) {
      await this.loadUserData()
    }
  }

  // Update user credits (for real-time updates)
  updateCredits(credits: number): void {
    if (this.authState.user) {
      this.authState.user.credits = credits
      this.notifyListeners()
    }
  }

  // Update user points (for real-time updates)
  updatePoints(points: number): void {
    if (this.authState.user) {
      this.authState.user.points = points
      this.notifyListeners()
    }
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance()

// Export getAuthToken helper
export const getAuthToken = () => authManager.getToken()

// Hook for React components
export const useAuth = () => {
  const [authState, setAuthState] = React.useState<AuthState>(authManager.getAuthState())

  React.useEffect(() => {
    const unsubscribe = authManager.subscribe(setAuthState)
    return unsubscribe
  }, [])

  return {
    ...authState,
    login: authManager.authenticateWithTelegram.bind(authManager),
    logout: authManager.logout.bind(authManager),
    refresh: authManager.refreshUserData.bind(authManager),
    updateCredits: authManager.updateCredits.bind(authManager),
    updatePoints: authManager.updatePoints.bind(authManager)
  }
} 