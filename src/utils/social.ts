import React from 'react'
import { urlShortener } from './shortener'

// Social features utility for sharing bookings with friends
export interface ShareData {
  title: string
  text: string
  url?: string
  image?: string
}

export interface BookingShareData {
  sport: string
  date: string
  time: string
  duration: number
  court: string
  totalPrice: number
}

export class SocialManager {
  /**
   * Check if Web Share API is supported
   */
  static isWebShareSupported(): boolean {
    return 'share' in navigator
  }

  /**
   * Share booking via native share dialog with short URL
   */
  static async shareBooking(booking: BookingShareData): Promise<boolean> {
    if (!this.isWebShareSupported()) {
      console.warn('Web Share API not supported')
      return false
    }

    try {
      // Generate short URL for the booking
      const shortUrl = urlShortener.generateShortCode(booking)
      
      const shareData: ShareData = {
        title: 'Join me for a game! 🎾',
        text: `I just booked a ${booking.duration}h ${booking.sport} session on ${booking.date} at ${booking.time} on Court ${booking.court}. Want to join? Check it out: ${shortUrl}`,
        url: shortUrl
      }

      await navigator.share(shareData)
      return true
    } catch (error) {
      console.warn('Failed to share booking:', error)
      return false
    }
  }

  /**
   * Share booking via WhatsApp
   */
  static shareViaWhatsApp(booking: BookingShareData): void {
    const text = encodeURIComponent(
      `Join me for a ${booking.duration}h ${booking.sport} session on ${booking.date} at ${booking.time} on Court ${booking.court}! 🎾`
    )
    const url = `https://wa.me/?text=${text}`
    window.open(url, '_blank')
  }

  /**
   * Share booking via Telegram
   */
  static shareViaTelegram(booking: BookingShareData): void {
    const text = encodeURIComponent(
      `Join me for a ${booking.duration}h ${booking.sport} session on ${booking.date} at ${booking.time} on Court ${booking.court}! 🎾`
    )
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`
    window.open(url, '_blank')
  }

  /**
   * Share booking via SMS
   */
  static shareViaSMS(booking: BookingShareData): void {
    const text = encodeURIComponent(
      `Join me for a ${booking.duration}h ${booking.sport} session on ${booking.date} at ${booking.time} on Court ${booking.court}! 🎾`
    )
    const url = `sms:?body=${text}`
    window.open(url, '_blank')
  }

  /**
   * Copy booking details to clipboard
   */
  static async copyToClipboard(booking: BookingShareData): Promise<boolean> {
    try {
      const text = `Join me for a ${booking.duration}h ${booking.sport} session on ${booking.date} at ${booking.time} on Court ${booking.court}! 🎾`
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.warn('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Generate QR code for booking (placeholder)
   */
  static generateBookingQR(booking: BookingShareData): string {
    // This would integrate with a QR code library
    const bookingData = JSON.stringify(booking)
    return `data:image/png;base64,${btoa(bookingData)}` // Placeholder
  }
}

// React hook for social features
export const useSocial = () => {
  const [isWebShareSupported] = React.useState(SocialManager.isWebShareSupported())

  return {
    isWebShareSupported,
    shareBooking: SocialManager.shareBooking,
    shareViaWhatsApp: SocialManager.shareViaWhatsApp,
    shareViaTelegram: SocialManager.shareViaTelegram,
    shareViaSMS: SocialManager.shareViaSMS,
    copyToClipboard: SocialManager.copyToClipboard,
    generateBookingQR: SocialManager.generateBookingQR
  }
} 