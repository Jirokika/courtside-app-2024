import React from 'react'
import { apiService } from './api'

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
