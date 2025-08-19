import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { ScreenProps } from '../../types'
import { ArrowLeft, CreditCard, Banknote, Upload, CheckCircle } from 'lucide-react'

interface ModificationPaymentScreenProps extends ScreenProps {}

export const ModificationPaymentScreen: React.FC<ModificationPaymentScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'aba'>('credits')
  const [showProofModal, setShowProofModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Get modification data from app state
  const modifiedBooking = appState.modifiedBooking || {
    originalAmount: 24,
    newAmount: 36,
    priceDifference: 12
  }

  const handleBack = () => {
    navigateTo('booking-modification')
  }

  const handleCreditsPayment = () => {
    setPaymentMethod('credits')
    // Process credits payment
    setTimeout(() => {
      setShowSuccessModal(true)
    }, 1000)
  }

  const handleABAPayment = () => {
    setPaymentMethod('aba')
    // Redirect to ABA payment
    window.open('https://pay.ababank.com/aZFJ8PdS5wroBfW98', '_blank')
    // Show proof upload modal after redirect
    setTimeout(() => {
      setShowProofModal(true)
    }, 500)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleSubmitProof = () => {
    if (uploadedFile) {
      // Process proof submission
      setTimeout(() => {
        setShowProofModal(false)
        setShowSuccessModal(true)
      }, 1000)
    }
  }

  const getSuccessMessage = () => {
    if (paymentMethod === 'aba') {
      return {
        title: 'Payment Proof Submitted',
        message: 'Your payment proof has been submitted. Please wait for admin approval to complete your modification.',
        icon: '📤'
      }
    } else {
      return {
        title: 'Payment Successful',
        message: 'Your modification has been completed successfully!',
        icon: '✅'
      }
    }
  }

  const handleSuccessClose = () => {
    setShowSuccessModal(false)
    navigateTo('bookings')
  }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6 pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Additional Payment</h1>
            <p className="text-gray-200">Complete your booking modification</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Payment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Original Amount:</span>
              <span className="text-white">${modifiedBooking.originalAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">New Amount:</span>
              <span className="text-white">${modifiedBooking.newAmount}</span>
            </div>
            <div className="border-t border-white/20 pt-3">
              <div className="flex justify-between">
                <span className="text-red-400 font-semibold">Additional Payment:</span>
                <span className="text-red-400 font-semibold">${modifiedBooking.priceDifference}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Payment Method</h2>
          
          <div className="space-y-4">
            {/* Courtside Credits */}
            <button
              onClick={() => setPaymentMethod('credits')}
              className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                paymentMethod === 'credits'
                  ? 'bg-purple-500 text-white border-purple-400'
                  : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center space-x-4">
                <CreditCard className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Courtside Credits</div>
                  <div className="text-sm opacity-75">Pay with your available credits</div>
                </div>
              </div>
            </button>

            {/* ABA Payment */}
            <button
              onClick={() => setPaymentMethod('aba')}
              className={`w-full p-4 rounded-xl border transition-all duration-200 ${
                paymentMethod === 'aba'
                  ? 'bg-purple-500 text-white border-purple-400'
                  : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center space-x-4">
                <Banknote className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">ABA Payment</div>
                  <div className="text-sm opacity-75">Pay via ABA bank transfer</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Payment Information</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• Additional payment: ${modifiedBooking.priceDifference}</div>
            <div>• Payment will be processed immediately</div>
            <div>• Refunds processed as Courtside credits</div>
            <div>• Banking payments require proof submission</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {paymentMethod === 'credits' ? (
            <Button
              onClick={handleCreditsPayment}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
            >
              Pay with Credits (${modifiedBooking.priceDifference})
            </Button>
          ) : (
            <Button
              onClick={handleABAPayment}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-4 rounded-xl font-semibold"
            >
              Pay with ABA & Upload Proof
            </Button>
          )}
          
          <Button
            onClick={handleBack}
            className="w-full bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 py-4 rounded-xl font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Proof Upload Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Submit Payment Proof</h3>
            <p className="text-gray-300 mb-4">
              Please upload proof of your ABA bank transfer payment. Your modification will be reviewed by admin.
            </p>
            
            <div className="mb-4">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                className="block w-full p-4 border-2 border-dashed border-white/30 rounded-xl text-center cursor-pointer hover:border-white/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-white mx-auto mb-2" />
                <div className="text-white font-semibold">Upload Proof</div>
                <div className="text-gray-300 text-sm">Click to select file</div>
              </label>
            </div>

            {uploadedFile && (
              <div className="mb-4 p-3 bg-white/10 rounded-lg">
                <div className="text-white text-sm">Selected: {uploadedFile.name}</div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={handleSubmitProof}
                disabled={!uploadedFile}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Proof
              </Button>
              <Button
                onClick={() => setShowProofModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 border border-white/20 py-3 rounded-xl font-semibold"
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
            <div className="text-4xl mb-4">{getSuccessMessage().icon}</div>
            <h3 className="text-2xl font-bold text-white mb-2">{getSuccessMessage().title}</h3>
            <p className="text-gray-300 mb-6">
              {getSuccessMessage().message}
            </p>
            <Button
              onClick={handleSuccessClose}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl font-semibold"
            >
              {paymentMethod === 'aba' ? 'Back to Bookings' : 'View Updated Booking'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 