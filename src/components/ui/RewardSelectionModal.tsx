import React, { useState, useEffect } from 'react'
import { X, Gift, Percent, DollarSign, Check } from 'lucide-react'
import { Button } from './Button'
import { FadeIn, ScaleButton } from './VisualPolish'

interface Reward {
  id: string
  name: string
  description: string
  type: 'percentage' | 'fixed' | 'free_booking'
  value: number // percentage (10 for 10%) or fixed amount (5 for $5)
  icon: string
  isActive: boolean
  expiresAt?: string
}

interface RewardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyRewards: (selectedRewards: Reward[], totalSavings: number, finalPrice: number) => void
  availableRewards: Reward[]
  bookingAmount: number
}

export const RewardSelectionModal: React.FC<RewardSelectionModalProps> = ({
  isOpen,
  onClose,
  onApplyRewards,
  availableRewards,
  bookingAmount
}) => {
  const [selectedRewards, setSelectedRewards] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setSelectedRewards([])
    }
  }, [isOpen])

  const toggleReward = (rewardId: string) => {
    setSelectedRewards(prev => 
      prev.includes(rewardId) 
        ? [] // Deselect if already selected
        : [rewardId] // Select only this reward (single selection)
    )
  }

  const calculateSavings = () => {
    let totalSavings = 0
    let remainingAmount = bookingAmount

    // Sort selected rewards by effectiveness
    const sortedSelectedRewards = availableRewards
      .filter(reward => selectedRewards.includes(reward.id))
      .sort((a, b) => {
        // Prioritize free booking, then highest savings
        if (a.type === 'free_booking') return -1
        if (b.type === 'free_booking') return 1
        
        const savingsA = a.type === 'percentage' ? (bookingAmount * a.value / 100) : a.value
        const savingsB = b.type === 'percentage' ? (bookingAmount * b.value / 100) : b.value
        return savingsB - savingsA
      })

    for (const reward of sortedSelectedRewards) {
      if (remainingAmount <= 0) break

      if (reward.type === 'free_booking') {
        totalSavings = bookingAmount // Free booking covers entire amount
        remainingAmount = 0
        break
      } else if (reward.type === 'percentage') {
        const discount = Math.min(remainingAmount * reward.value / 100, remainingAmount)
        totalSavings += discount
        remainingAmount -= discount
      } else if (reward.type === 'fixed') {
        const discount = Math.min(reward.value, remainingAmount)
        totalSavings += discount
        remainingAmount -= discount
      }
    }

    return {
      totalSavings: Math.round(totalSavings * 100) / 100,
      finalPrice: Math.max(0, Math.round((bookingAmount - totalSavings) * 100) / 100)
    }
  }

  const { totalSavings, finalPrice } = calculateSavings()

  const getRewardSavings = (reward: Reward) => {
    if (reward.type === 'free_booking') {
      return bookingAmount
    } else if (reward.type === 'percentage') {
      return Math.round(bookingAmount * reward.value / 100 * 100) / 100
    } else {
      return Math.min(reward.value, bookingAmount)
    }
  }

  const getRewardWarning = (reward: Reward) => {
    const potentialSavings = getRewardSavings(reward)
    
    // Check if this reward is overkill for small bookings
    if (reward.type === 'free_booking' && bookingAmount < 15) {
      return '⚠️ Consider saving this for more expensive bookings'
    }
    
    return null
  }

  const hasConflictingRewards = () => {
    // Since users can only select one reward, there are no conflicts
    return false
  }

  const handleApplyRewards = () => {
    const selectedRewardObjects = availableRewards.filter(reward => 
      selectedRewards.includes(reward.id)
    )
    onApplyRewards(selectedRewardObjects, totalSavings, finalPrice)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <FadeIn>
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 w-full max-w-md max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold text-white">Apply Rewards</h2>
              </div>
              <ScaleButton
                onClick={onClose}
                className="w-8 h-8 text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </ScaleButton>
            </div>
            <p className="text-white/70 text-sm mt-2">
              Choose one reward to apply to your ${bookingAmount} booking
            </p>
          </div>

          {/* Rewards List */}
          <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
            {availableRewards.map((reward) => {
              const isSelected = selectedRewards.includes(reward.id)
              const savings = getRewardSavings(reward)
              const warning = getRewardWarning(reward)
              
              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 border-white/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => toggleReward(reward.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{reward.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-semibold">{reward.name}</h4>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-white border-white' 
                            : 'border-white/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-purple-600" />}
                        </div>
                      </div>
                      <p className="text-white/70 text-sm mb-2">{reward.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-green-300 font-semibold text-sm">
                          Save ${savings}
                        </span>
                        {reward.expiresAt && (
                          <span className="text-orange-300 text-xs">
                            Expires {reward.expiresAt}
                          </span>
                        )}
                      </div>
                      
                      {warning && (
                        <div className="mt-2 text-xs text-yellow-300 bg-yellow-400/10 rounded-lg p-2">
                          {warning}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="p-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Original Price</span>
                  <span>${bookingAmount}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-green-300">
                    <span>Total Savings</span>
                    <span>-${totalSavings}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-semibold text-lg pt-2 border-t border-white/10">
                  <span>Final Price</span>
                  <span>${finalPrice}</span>
                </div>
              </div>
            </div>

            {hasConflictingRewards() && (
              <div className="mb-4 text-xs text-orange-300 bg-orange-400/10 rounded-lg p-3">
                💡 Tip: Free booking covers the full amount. Other rewards won't provide additional savings.
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyRewards}
                disabled={selectedRewards.length === 0}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white disabled:opacity-50"
              >
                Apply Reward
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}