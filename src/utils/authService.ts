import { getBackendUrl } from './httpClient'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface UserData {
  id: string
  name: string
  email?: string
  credits: number
  points: number
  avatar?: string
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
  is_premium?: boolean
}

class AuthService {
  private baseUrl: string

  constructor() {
    this.baseUrl = getBackendUrl()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      }

      // Get authentication token from localStorage
      const authToken = localStorage.getItem('auth_token')
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          message: data.message || 'An error occurred'
        }
      }

      return data
    } catch (error) {
      console.error('Auth service request failed:', error)
      return {
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async authenticateTelegram(telegramUser: TelegramUser): Promise<ApiResponse<{ user: UserData; token: string }>> {
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
    return this.request<UserData>('/api/auth/me')
  }
}

// Create singleton instance
export const authService = new AuthService()
