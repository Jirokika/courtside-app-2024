import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '../ui/Button'
import { LoadingScreen } from './LoadingScreen'
import { BottomNavigation } from '../ui/BottomNavigation'
import { useToast } from '../../contexts/ToastContext'
import { useApi } from '../../utils/api'
import { ScreenProps } from '../../types'
import { Calendar, Clock, MapPin, Upload, CheckCircle, ArrowLeft, Share2 } from 'lucide-react'
import { usePerformanceMonitor as usePerfMonitor } from '../ui/PerformanceOptimizer'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { SocialManager } from '../../utils/social'
import { getCurrentUser } from '../../utils/telegram'
import { PointsTracker } from '../../utils/pointsTracker'
import { RewardSelectionModal } from '../ui/RewardSelectionModal'
import { rewardsService, UserReward } from '../../utils/rewardsService'
import { createSubmissionGuard } from '../../utils/debounce'
import { getAuthToken } from '../../utils/auth'

interface BookingSummaryScreenProps extends ScreenProps {}

export const BookingSummaryScreen: React.FC<BookingSummaryScreenProps> = ({
  navigateTo,
  appState,
}) => {
  const { showToast } = useToast()
  const { createBooking, processPaymentById, validatePromoCode, applyPromoCode } = useApi()
  const { startTimer, endTimer } = usePerfMonitor()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credits' | 'aba' | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [promoCode, setPromoCode] = useState('')
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  
  // Reward system state
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [availableRewards, setAvailableRewards] = useState<UserReward[]>([])
  const [appliedRewards, setAppliedRewards] = useState<UserReward[]>([])
  const [rewardSavings, setRewardSavings] = useState(0)

  // Get current user from Telegram
  const currentUser = getCurrentUser()

  // Load available rewards on component mount
  useEffect(() => {
    const loadRewards = async () => {
      try {
        const rewards = await rewardsService.getActiveRewards()
        setAvailableRewards(rewards)
      } catch (error) {
        console.error('Error loading rewards:', error)
      }
    }
    loadRewards()
  }, [])

  // Get real user credits from Telegram user state
  const [userCredits, setUserCredits] = useState(0)
  
  // Load user credits on component mount
  useEffect(() => {
    const loadUserCredits = async () => {
      try {
        if (currentUser?.id) {
          // Get user data from backend using Telegram ID
          const response = await fetch(`https://courtside-backend-production.up.railway.app/api/users/telegram/${currentUser.id}`)
          if (response.ok) {
            const userData = await response.json()
            console.log('✅ User data loaded:', userData)
            setUserCredits(userData.data?.credits || 0)
          } else {
            console.warn('⚠️ Failed to load user data, status:', response.status)
            // Fallback to Telegram user data if available
            setUserCredits(currentUser?.credits || 0)
          }
        }
      } catch (error) {
        console.error('❌ Error loading user credits:', error)
        // Fallback to Telegram user data if available
        setUserCredits(currentUser?.credits || 0)
      }
    }
    loadUserCredits()
  }, [currentUser])

  // Memoized booking data for performance
  const { booking, bookingCost } = useMemo(() => {
    const booking = appState.bookingState
    
    // Calculate cost based on sport, duration, and number of courts
    // Updated: 1 credit = $1, so cost is the same as credits needed
    const baseCost = booking?.selectedSport === 'badminton' ? 12 : 
                    booking?.selectedSport === 'pickleball' ? 14 : 12
    const duration = booking?.selectedDuration || 1
    const numberOfCourts = booking?.selectedCourts?.length || 1
    
    const bookingCost = baseCost * duration * numberOfCourts
    
    return { booking, bookingCost }
  }, [appState.bookingState])

  const handleBack = () => {
    navigateTo('court-selection')
  }

  const handleShowRewards = () => {
    if (availableRewards.length > 0) {
      setShowRewardModal(true)
    } else {
      showToast('info', 'You have no active rewards to apply')
    }
  }

  const handleApplyRewards = async (selectedRewards: UserReward[], totalSavings: number, finalPrice: number) => {
    setAppliedRewards(selectedRewards)
    setRewardSavings(totalSavings)
    setShowRewardModal(false)
    
    showToast('success', `Applied ${selectedRewards.length} reward${selectedRewards.length !== 1 ? 's' : ''} - Save $${totalSavings}!`)
  }

  const handleRemoveRewards = () => {
    setAppliedRewards([])
    setRewardSavings(0)
    showToast('info', 'Rewards removed from booking')
  }

  const handlePaymentMethodSelect = (method: 'credits' | 'aba') => {
    if (method === 'credits' && userCredits < bookingCost) {
      showToast('error', `Insufficient credits. You need ${bookingCost} credits but have ${userCredits} credits.`)
      return
    }
    setSelectedPaymentMethod(method)
  }

  // Create submission guard for booking creation
  const bookingSubmissionGuard = useMemo(() => {
    return createSubmissionGuard(async (bookingData: any) => {
      if (!selectedPaymentMethod) {
        showToast('error', 'Please select a payment method')
        return
      }

      if (!currentUser) {
        showToast('error', 'Please log in with Telegram to continue')
        return
      }

      try {
        setIsSubmitting(true)
        startTimer()

        // Format date for API (timezone-safe)
        const selectedDate = appState.bookingState?.selectedDates[0]
        console.log('📅 BookingSummary: Original selected date:', selectedDate)
        
        const dateString = selectedDate instanceof Date 
          ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
          : typeof selectedDate === 'string' 
            ? selectedDate 
            : new Date().toISOString().split('T')[0]
        
        console.log('📅 BookingSummary: Formatted date string:', dateString)
        console.log('🇰🇭 BookingSummary: Using Cambodia local time directly (no conversion needed)')

        // Create booking
        const bookingResponse = await createBooking(bookingData)
        
        if (bookingResponse.success && bookingResponse.data) {
          setCreatedBooking(bookingResponse.data)
          
          // Track booking completion for points system
          try {
            await PointsTracker.trackFirstBooking(bookingResponse.data)
          } catch (trackingError) {
            console.log('Points tracking error (non-critical):', trackingError)
          }

          // Apply rewards if any were selected
          if (appliedRewards.length > 0) {
            try {
              await rewardsService.applyRewards(appliedRewards, bookingResponse.data.id)
            } catch (rewardError) {
              console.log('Reward application error (non-critical):', rewardError)
            }
          }
          
          // Process payment if using credits
          if (selectedPaymentMethod === 'credits') {
            const paymentResponse = await processPaymentById(
              bookingResponse.data.paymentId,
              selectedPaymentMethod
            )
            
            if (paymentResponse.success) {
              showToast('success', 'Booking created and payment processed successfully!')
              setShowSuccessModal(true)
            } else {
              showToast('error', 'Booking created but payment failed')
            }
          } else {
            // For ABA payments, show success immediately
            showToast('success', 'Booking created successfully!')
            setShowSuccessModal(true)
          }
        } else {
          // Handle specific booking errors
          if (bookingResponse.error === 'DUPLICATE_BOOKING') {
            showToast('error', 'You already have a booking for this time slot. Please check your bookings.')
          } else if (bookingResponse.error === 'BOOKING_TOO_SOON') {
            showToast('error', 'Bookings must be made at least 30 minutes in advance. Please select a later time.')
          } else if (bookingResponse.error === 'INSUFFICIENT_CREDITS') {
            showToast('error', 'Insufficient credits. Please top up your account.')
          } else {
            showToast('error', bookingResponse.message || bookingResponse.error || 'Failed to create booking')
          }
        }
      } catch (error) {
        console.error('Error creating booking:', error)
        if (error.message === 'Submission already in progress') {
          showToast('info', 'Booking is already being processed. Please wait.')
        } else {
          showToast('error', 'Failed to create booking. Please try again.')
        }
      } finally {
        setIsSubmitting(false)
        endTimer('Booking creation and payment processing')
      }
    }, 2000) // 2-second guard
  }, [selectedPaymentMethod, currentUser, appState.bookingState, appliedRewards, selectedPaymentMethod])

  const handleCreateBooking = useCallback(async () => {
    // Create booking data
    const bookingData = {
      sport: appState.bookingState?.selectedSport || '',
      date: appState.bookingState?.selectedDates[0] instanceof Date 
        ? `${appState.bookingState.selectedDates[0].getFullYear()}-${String(appState.bookingState.selectedDates[0].getMonth() + 1).padStart(2, '0')}-${String(appState.bookingState.selectedDates[0].getDate()).padStart(2, '0')}`
        : typeof appState.bookingState?.selectedDates[0] === 'string' 
          ? appState.bookingState.selectedDates[0]
          : new Date().toISOString().split('T')[0],
      time: appState.bookingState?.selectedTimeSlot || '',
      duration: appState.bookingState?.selectedDuration || 1,
      courts: appState.bookingState?.selectedCourts || [],
      paymentMethod: selectedPaymentMethod,
      promoCode: appliedPromo?.code
    }

    // Use the submission guard
    await bookingSubmissionGuard.submit(bookingData)
  }, [bookingSubmissionGuard])

  const handlePayWithCredits = () => {
    const finalCost = bookingCost - discountAmount - rewardSavings
    if (userCredits >= finalCost) {
      handleCreateBooking()
    } else {
      showToast('error', `Insufficient credits. You need ${finalCost} credits but have ${userCredits} credits.`)
    }
  }

  const handlePayWithABA = async () => {
    try {
      // Create booking first
      const bookingResponse = await createBooking({
        sport: appState.bookingState?.selectedSport || '',
        date: appState.bookingState?.selectedDates[0] instanceof Date 
          ? `${appState.bookingState.selectedDates[0].getFullYear()}-${String(appState.bookingState.selectedDates[0].getMonth() + 1).padStart(2, '0')}-${String(appState.bookingState.selectedDates[0].getDate()).padStart(2, '0')}`
          : typeof appState.bookingState?.selectedDates[0] === 'string' 
            ? appState.bookingState.selectedDates[0] 
            : new Date().toISOString().split('T')[0],
        time: appState.bookingState?.selectedTimeSlot || '',
        duration: appState.bookingState?.selectedDuration || 1,
        courts: appState.bookingState?.selectedCourts || [],
        paymentMethod: 'aba'
      })

      if (bookingResponse.success && bookingResponse.data) {
        setCreatedBooking(bookingResponse.data)
        
        // Track booking completion for points system
        try {
          await PointsTracker.trackFirstBooking(bookingResponse.data)
        } catch (trackingError) {
          console.log('Points tracking error (non-critical):', trackingError)
        }

        // Apply rewards if any were selected
        if (appliedRewards.length > 0) {
          try {
            await rewardsService.applyRewards(appliedRewards, bookingResponse.data.id)
          } catch (rewardError) {
            console.log('Reward application error (non-critical):', rewardError)
          }
        }

        // Show payment modal after successful booking creation
        setShowPaymentModal(true)
        
        // Redirect to ABA payment link
        window.open('https://pay.ababank.com/aZFJ8PdS5wroBfW98', '_blank')
      } else {
        // Handle specific booking errors
        if (bookingResponse.error === 'BOOKING_TOO_SOON') {
          showToast('error', 'Bookings must be made at least 30 minutes in advance. Please select a later time.')
        } else {
          showToast('error', bookingResponse.error || 'Failed to create booking')
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      showToast('error', 'Failed to create booking')
    }
  }

  const handleSuccessContinue = () => {
    setShowSuccessModal(false)
    navigateTo('home')
  }

  const handleShareBooking = async () => {
    if (createdBooking) {
      try {
        const shareData = {
          title: 'Courtside Booking',
          text: `I just booked ${createdBooking.sport} at Courtside!`,
          url: window.location.href
        }
        
        if (navigator.share) {
          await navigator.share(shareData)
        } else {
          // Fallback to copying to clipboard
          await navigator.clipboard.writeText(shareData.url)
          showToast('success', 'Booking link copied to clipboard!')
        }
      } catch (error) {
        console.error('Error sharing booking:', error)
        showToast('error', 'Failed to share booking')
      }
    }
  }

  const handleProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setProofFile(file)
    }
  }

  const handleSubmitProof = async () => {
    if (!proofFile) {
      showToast('error', 'Please select a file first')
      return
    }

    try {
      setIsSubmitting(true)
      
      // Convert file to base64 for storage
      const base64String = await convertFileToBase64(proofFile)
      const paymentProofUrl = `data:${proofFile.type};base64,${base64String}`
      
      // Call the backend API to submit the payment proof
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings/${createdBooking?.id}/payment-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          paymentProofUrl,
          paymentMethod: 'aba'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        showToast('success', 'Payment proof submitted successfully!')
        setShowProofModal(false)
        setShowSuccessModal(true)
      } else {
        showToast('error', result.message || 'Failed to submit payment proof')
      }
    } catch (error) {
      console.error('Error submitting proof:', error)
      showToast('error', 'Failed to submit payment proof')
    } finally {
      setIsSubmitting(false)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]
        resolve(base64String)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  // Temporarily comment out the booking check to see if the screen renders
  // if (!booking) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
  //       <div className="text-center">
  //         <p className="text-white text-lg">No booking information found</p>
  //         <Button
  //           onClick={() => navigateTo('home')}
  //           className="mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/30"
  //         >
  //           Go Home
  //         </Button>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">

        
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="mb-8 pt-8">
            <div className="flex items-center justify-center mb-2">
              <ScaleButton
                onClick={handleBack}
                className="absolute left-4 w-10 h-10 text-white hover:text-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </ScaleButton>
              <h1 className="text-3xl font-bold text-white">Booking Summary</h1>
            </div>
            <p className="text-center text-gray-200">Review and confirm your booking</p>
          </div>
        </FadeIn>

        {/* Booking Details */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Booking Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {booking.selectedSport === 'badminton' ? '🏸' : '🏓'}
              </div>
              <div>
                <div className="text-white font-semibold capitalize">{booking.selectedSport || 'Not selected'}</div>
                <div className="text-gray-300 text-sm">Sport</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-2xl">📆</div>
              <div>
                <div className="text-white font-semibold">
                  {(() => {
                    const selectedDate = booking.selectedDates[0]
                    return selectedDate instanceof Date 
                      ? selectedDate.toLocaleDateString() 
                      : typeof selectedDate === 'string' 
                        ? selectedDate 
                        : 'Not selected'
                  })()}
                </div>
                <div className="text-gray-300 text-sm">Date</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-2xl">⏰</div>
              <div>
                <div className="text-white font-semibold">{booking.selectedTimeSlot || 'Not selected'}</div>
                <div className="text-gray-300 text-sm">Time</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-2xl">⌛</div>
              <div>
                <div className="text-white font-semibold">{booking.selectedDuration || 1} hour{(booking.selectedDuration || 1) !== 1 ? 's' : ''}</div>
                <div className="text-gray-300 text-sm">Duration</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏟️</div>
              <div>
                <div className="text-white font-semibold">
                  {booking.selectedCourts.length > 1 
                    ? `${booking.selectedCourts.length} courts: ${booking.selectedCourts.join(', ')}`
                    : booking.selectedCourts[0] || 'Not selected'
                  }
                </div>
                <div className="text-gray-300 text-sm">Court{booking.selectedCourts.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Rewards Section */}
        {availableRewards.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">💎 Available Rewards</h2>
            
            {appliedRewards.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
                  <div>
                    <div className="text-white font-semibold">
                      {appliedRewards.length} reward{appliedRewards.length !== 1 ? 's' : ''} applied
                    </div>
                    <div className="text-purple-300 text-sm">
                      Total savings: ${rewardSavings}
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveRewards}
                    className="text-purple-300 hover:text-purple-200 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <div className="space-y-2">
                  {appliedRewards.map(reward => (
                    <div key={reward.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{reward.icon}</span>
                        <span className="text-white/70">{reward.name}</span>
                      </div>
                      <span className="text-green-300">
                        {reward.type === 'percentage' ? `${reward.value}% off` : 
                         reward.type === 'fixed' ? `$${reward.value} off` : 'Free booking'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-white/70 text-sm mb-4">
                  You have {availableRewards.length} reward{availableRewards.length !== 1 ? 's' : ''} available!
                </div>
                <button
                  onClick={handleShowRewards}
                  className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-white border border-purple-400/30 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  🎁 Apply Rewards & Save Money
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payment Options */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Payment Method</h2>
          
          <div className="space-y-4">
            {/* Courtside Credits Option */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedPaymentMethod === 'credits'
                  ? 'bg-white/30 border-white/50'
                  : 'bg-white/10 border-white/20 hover:bg-white/15'
              }`}
              onClick={() => handlePaymentMethodSelect('credits')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💳</div>
                  <div>
                    <div className="text-white font-semibold">Courtside Credits</div>
                    <div className="text-gray-300 text-sm">Use your available credits</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${bookingCost}</div>
                  <div className={`text-sm ${userCredits >= bookingCost ? 'text-green-300' : 'text-red-300'}`}>
                    Available: {userCredits} credits
                  </div>
                  {userCredits < bookingCost && (
                    <div className="text-red-400 text-xs mt-1">
                      Need {bookingCost - userCredits} more credits
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ABA Payment Option */}
            <div
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedPaymentMethod === 'aba'
                  ? 'bg-white/30 border-white/50'
                  : 'bg-white/10 border-white/20 hover:bg-white/15'
              }`}
              onClick={() => handlePaymentMethodSelect('aba')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">💳</div>
                  <div>
                    <div className="text-white font-semibold">ABA Bank Payment</div>
                    <div className="text-gray-300 text-sm">Pay securely with ABA Bank</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">${bookingCost}</div>
                  <div className="text-gray-300 text-sm">Secure payment</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Promo Code</h2>
          
          {appliedPromo ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-green-500/20 rounded-xl p-4 border border-green-500/30">
                <div>
                  <div className="text-white font-semibold">{appliedPromo.code}</div>
                  <div className="text-green-300 text-sm">
                    {appliedPromo.discountType === 'percentage' 
                      ? `${appliedPromo.discountValue}% off`
                      : `$${appliedPromo.discountValue} off`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAppliedPromo(null)
                    setDiscountAmount(0)
                    setPromoCode('')
                  }}
                  className="text-green-300 hover:text-green-200 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={async () => {
                    if (!promoCode) return
                    setIsValidatingPromo(true)
                    try {
                      const response = await validatePromoCode(promoCode)
                      if (response.success && response.data) {
                        const applyResponse = await applyPromoCode(createdBooking?.id || 'temp', promoCode)
                        if (applyResponse.success && applyResponse.data) {
                          setAppliedPromo(response.data)
                          setDiscountAmount(applyResponse.data.discountAmount)
                          showToast('success', 'Promo code applied successfully!')
                        }
                      } else {
                        showToast('error', response.error || 'Invalid promo code')
                      }
                    } catch (error) {
                      showToast('error', 'Failed to validate promo code')
                    } finally {
                      setIsValidatingPromo(false)
                    }
                  }}
                  disabled={!promoCode || isValidatingPromo}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidatingPromo ? 'Validating...' : 'Apply'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Total and Confirm Button */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white">Subtotal</span>
              <span className="text-white">${bookingCost}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-green-300">
                <span>Promo Discount</span>
                <span>-${discountAmount}</span>
              </div>
            )}

            {rewardSavings > 0 && (
              <div className="flex items-center justify-between text-purple-300">
                <span>Reward Savings</span>
                <span>-${rewardSavings}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <span className="text-white font-semibold">Total Amount</span>
              <span className="text-white font-bold text-xl">${Math.max(0, bookingCost - discountAmount - rewardSavings)}</span>
            </div>
          </div>
          
          <Button
            onClick={() => {
              if (selectedPaymentMethod === 'credits') {
                handlePayWithCredits()
              } else if (selectedPaymentMethod === 'aba') {
                handlePayWithABA()
              }
            }}
            disabled={!selectedPaymentMethod || isSubmitting}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <LoadingScreen />
              </div>
            ) : (
              `Pay with ${selectedPaymentMethod === 'credits' ? 'Credits' : 
                         selectedPaymentMethod === 'aba' ? 'ABA Bank' : 'Payment'}`
            )}
          </Button>
        </div>
      </div>

      {/* Return from ABA Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-4">Welcome Back!</h3>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-200 text-sm">
                Please upload a screenshot or photo of your ABA payment confirmation for admin review.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button
                onClick={() => {
                  setShowPaymentModal(false)
                  setShowProofModal(true)
                }}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl"
              >
                Upload Payment Proof
              </Button>
              
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="w-full bg-transparent text-gray-300 hover:text-white py-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ABA Proof Upload Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Submit Payment Proof</h3>
            <p className="text-gray-200 mb-6">
              Please upload a screenshot or photo of your ABA payment confirmation for admin review.
            </p>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/30 rounded-xl p-6 text-center">
                <Upload className="w-8 h-8 text-white mx-auto mb-2" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                  id="proof-upload"
                />
                <label htmlFor="proof-upload" className="cursor-pointer">
                  <div className="text-white font-semibold mb-1">Upload Proof</div>
                  <div className="text-gray-300 text-sm">Tap to select file</div>
                </label>
              </div>
              
              {proofFile && (
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="text-white text-sm">Selected: {proofFile.name}</div>
                </div>
              )}
              
              <Button
                onClick={handleSubmitProof}
                disabled={!proofFile || isSubmitting}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Proof'}
              </Button>
              
              <Button
                onClick={() => setShowProofModal(false)}
                className="w-full bg-transparent text-gray-300 hover:text-white py-3"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              {selectedPaymentMethod === 'credits' ? 'Payment Successful!' : 'Proof Submitted!'}
            </h3>
            <p className="text-gray-200 mb-6">
              {selectedPaymentMethod === 'credits' 
                ? 'Your booking has been confirmed and payment processed successfully.'
                : 'Your ABA payment proof has been submitted for admin review. We\'ll notify you once it\'s approved.'
              }
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={handleSuccessContinue}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl"
              >
                Back to Home
              </Button>
              
              <Button
                onClick={handleShareBooking}
                variant="ghost"
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 py-3 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Booking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reward Selection Modal */}
      <RewardSelectionModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        onApplyRewards={handleApplyRewards}
        availableRewards={availableRewards.map(reward => ({
          id: reward.id,
          name: reward.name,
          description: reward.description,
          type: reward.type,
          value: reward.value,
          icon: reward.icon,
          isActive: reward.isActive,
          expiresAt: reward.expiresAt
        }))}
        bookingAmount={bookingCost}
      />
      
      {/* Bottom Navigation */}
      {typeof navigateTo === 'function' ? (
        <BottomNavigation 
          currentScreen="booking-summary"
          onNavigate={navigateTo}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 z-50 p-4 text-center text-white">
          Navigation unavailable
        </div>
      )}
    </div>
  )
}