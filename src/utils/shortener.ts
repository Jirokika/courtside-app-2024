interface ShortUrlData {
  id: string
  originalUrl: string
  shortCode: string
  bookingData: any
  createdAt: string
  expiresAt: string
}

class UrlShortener {
  private shortUrls: Map<string, ShortUrlData> = new Map()
  private baseUrl: string
  private storageKey = 'courtside_short_urls'

  constructor() {
    // Use environment variable or default to current domain
    this.baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin
    this.loadFromStorage()
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.shortUrls = new Map(Object.entries(data))
        this.cleanupExpired() // Clean up expired URLs on load
      }
    } catch (error) {
      console.warn('Failed to load short URLs from storage:', error)
    }
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.shortUrls)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save short URLs to storage:', error)
    }
  }

  // Generate a short code for booking sharing
  generateShortCode(bookingData: any): string {
    const shortCode = this.generateRandomCode(6) // 6 character code
    const id = this.generateId()
    
    const shortUrlData: ShortUrlData = {
      id,
      originalUrl: `${this.baseUrl}/booking/${id}`,
      shortCode,
      bookingData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }

    // Store in memory and localStorage
    this.shortUrls.set(shortCode, shortUrlData)
    this.shortUrls.set(id, shortUrlData)
    this.saveToStorage()

    return `${this.baseUrl}/b/${shortCode}`
  }

  // Get booking data by short code
  getBookingData(shortCode: string): ShortUrlData | null {
    const data = this.shortUrls.get(shortCode)
    if (!data) return null

    // Check if expired
    if (new Date(data.expiresAt) < new Date()) {
      this.shortUrls.delete(shortCode)
      this.saveToStorage()
      return null
    }

    return data
  }

  // Get booking data by ID
  getBookingDataById(id: string): ShortUrlData | null {
    const data = this.shortUrls.get(id)
    if (!data) return null

    // Check if expired
    if (new Date(data.expiresAt) < new Date()) {
      this.shortUrls.delete(id)
      this.saveToStorage()
      return null
    }

    return data
  }

  // Generate random short code
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Clean up expired URLs
  cleanupExpired(): void {
    const now = new Date()
    let hasChanges = false
    
    for (const [key, data] of this.shortUrls.entries()) {
      if (new Date(data.expiresAt) < now) {
        this.shortUrls.delete(key)
        hasChanges = true
      }
    }

    if (hasChanges) {
      this.saveToStorage()
    }
  }
}

// Create singleton instance
export const urlShortener = new UrlShortener()

// Clean up expired URLs every hour
setInterval(() => {
  urlShortener.cleanupExpired()
}, 60 * 60 * 1000) 