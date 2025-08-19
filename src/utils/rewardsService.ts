import { apiService } from './api'
import { getCurrentUser } from './telegram'

export interface UserReward {
  id: string
  rewardId: string
  name: string
  description: string
  type: 'percentage' | 'fixed' | 'free_booking'
  value: number
  icon: string
  isActive: boolean
  purchaseDate: string
  expiresAt?: string
  status: 'active' | 'used' | 'expired'
}

class RewardsService {
  private static instance: RewardsService | null = null
  private userRewards: UserReward[] = []
  private lastFetch: number = 0
  private cacheDuration = 5 * 60 * 1000 // 5 minutes

  static getInstance(): RewardsService {
    if (!RewardsService.instance) {
      RewardsService.instance = new RewardsService()
    }
    return RewardsService.instance
  }

  // Get user's active rewards (purchased and not yet used/expired)
  async getActiveRewards(): Promise<UserReward[]> {
    await this.ensureRewardsCached()
    return this.userRewards.filter(reward => reward.status === 'active')
  }

  // Get all user rewards (for display in "My Rewards" tab)
  async getAllUserRewards(): Promise<UserReward[]> {
    await this.ensureRewardsCached()
    return this.userRewards
  }

  // Apply rewards to a booking and mark them as used
  async applyRewards(selectedRewards: UserReward[], bookingId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Update local state immediately for better UX
      selectedRewards.forEach(reward => {
        const localReward = this.userRewards.find(r => r.id === reward.id)
        if (localReward) {
          localReward.status = 'used'
        }
      })

      // TODO: Call backend API to mark rewards as used
      // const response = await apiService.useRewards(selectedRewards.map(r => r.id), bookingId)
      
      // For now, simulate success
      return { success: true }
    } catch (error) {
      console.error('Error applying rewards:', error)
      return { success: false, error: 'Failed to apply rewards' }
    }
  }

  // Calculate total savings from selected rewards
  calculateSavings(selectedRewards: UserReward[], bookingAmount: number): { totalSavings: number; finalPrice: number } {
    let totalSavings = 0
    let remainingAmount = bookingAmount

    // Sort rewards by effectiveness (free booking first, then highest savings)
    const sortedRewards = [...selectedRewards].sort((a, b) => {
      if (a.type === 'free_booking') return -1
      if (b.type === 'free_booking') return 1
      
      const savingsA = a.type === 'percentage' ? (bookingAmount * a.value / 100) : a.value
      const savingsB = b.type === 'percentage' ? (bookingAmount * b.value / 100) : b.value
      return savingsB - savingsA
    })

    for (const reward of sortedRewards) {
      if (remainingAmount <= 0) break

      if (reward.type === 'free_booking') {
        totalSavings = bookingAmount
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

  // Check if user has any active rewards
  async hasActiveRewards(): Promise<boolean> {
    const activeRewards = await this.getActiveRewards()
    return activeRewards.length > 0
  }

  // Refresh rewards from backend
  async refreshRewards(): Promise<void> {
    this.lastFetch = 0 // Force refresh
    await this.ensureRewardsCached()
  }

  private async ensureRewardsCached(): Promise<void> {
    const now = Date.now()
    if (now - this.lastFetch > this.cacheDuration) {
      await this.fetchUserRewards()
      this.lastFetch = now
    }
  }

  private async fetchUserRewards(): Promise<void> {
    try {
      // Get current user ID from Telegram
      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        console.warn('No user ID available, using mock data')
        this.userRewards = this.generateMockUserRewards()
        return
      }

      // Call real backend API
      const response = await fetch(`https://courtside-backend-production.up.railway.app/api/points/rewards/user/${currentUser.id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          this.userRewards = result.data
          console.log('🎁 Loaded real user rewards:', this.userRewards)
          return
        }
      }
      
      // Fallback to mock data if API fails
      console.warn('API call failed, falling back to mock data')
      this.userRewards = this.generateMockUserRewards()
    } catch (error) {
      console.error('Error fetching user rewards:', error)
      // Fallback to mock data
      this.userRewards = this.generateMockUserRewards()
    }
  }

  private generateMockUserRewards(): UserReward[] {
    // Check localStorage for points progress to determine which rewards user should have
    const progressKey = 'courtside_points_progress'
    const progress = JSON.parse(localStorage.getItem(progressKey) || '{}')
    
    const mockRewards: UserReward[] = []
    
    // Give every user at least 2 rewards for testing the system
    // This ensures the rewards section always shows up in booking
    mockRewards.push({
      id: 'user-reward-1',
      rewardId: 'discount-10',
      name: '10% Booking Discount',
      description: 'Get 10% off your next court booking',
      type: 'percentage',
      value: 10,
      icon: '💰',
      isActive: true,
      purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'active'
    })

    mockRewards.push({
      id: 'user-reward-2',
      rewardId: 'bonus-5',
      name: '$5 Bonus Credit',
      description: '$5 off any booking',
      type: 'fixed',
      value: 5,
      icon: '🎁',
      isActive: true,
      purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'active'
    })

    // Add more rewards if user has activity
    const hasActivity = progress.firstBookingCompleted || progress.profileCompleted
    
    if (hasActivity) {
      mockRewards.push({
        id: 'user-reward-3',
        rewardId: 'free-booking',
        name: 'Free Court Booking',
        description: 'One free court booking (up to $25 value)',
        type: 'free_booking',
        value: 25,
        icon: '🏆',
        isActive: true,
        purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'active'
      })
    }

    // Add a used reward for demo (if user has multiple rewards)
    if (mockRewards.length > 2) {
      mockRewards.push({
        id: 'user-reward-4',
        rewardId: 'used-discount',
        name: '15% Premium Discount',
        description: 'Premium discount for loyal users',
        type: 'percentage',
        value: 15,
        icon: '⭐',
        isActive: false,
        purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'used'
      })
    }

    console.log('🎁 Generated mock rewards:', mockRewards)
    return mockRewards
  }
}

export const rewardsService = RewardsService.getInstance()