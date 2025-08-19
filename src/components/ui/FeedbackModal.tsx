import React, { useState } from 'react'
import { AnalyticsManager } from '../../utils/analytics'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  screen?: string
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, 
  onClose, 
  screen = 'general' 
}) => {
  const [rating, setRating] = useState<number>(0)
  const [feedback, setFeedback] = useState('')
  const [category, setCategory] = useState('general')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const feedbackCategories = [
    { value: 'general', label: 'General Feedback' },
    { value: 'booking', label: 'Booking Experience' },
    { value: 'payment', label: 'Payment Process' },
    { value: 'points', label: 'Points & Rewards' },
    { value: 'ui', label: 'User Interface' },
    { value: 'performance', label: 'App Performance' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' }
  ]

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)

    try {
      // Track feedback analytics
      AnalyticsManager.track('feedback_submitted', {
        rating,
        category,
        screen,
        feedbackLength: feedback.length,
        hasFeedback: feedback.length > 0
      })

      // In a real implementation, send to your feedback API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call

      setIsSubmitted(true)
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        onClose()
        setRating(0)
        setFeedback('')
        setCategory('general')
      }, 2000)

    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Thank You!
          </h3>
          <p className="text-gray-600">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Share Your Feedback
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Category Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {feedbackCategories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you rate your experience?
          </label>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 transition-colors`}
              >
                {star <= rating ? '⭐' : '☆'}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {rating === 1 && 'Very Poor'}
            {rating === 2 && 'Poor'}
            {rating === 3 && 'Fair'}
            {rating === 4 && 'Good'}
            {rating === 5 && 'Excellent'}
          </div>
        </div>

        {/* Feedback Text */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more about your experience..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-3 text-center">
          Your feedback helps us improve Courtside Bot for everyone!
        </div>
      </div>
    </div>
  )
}
