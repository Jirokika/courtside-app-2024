import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { BottomNavigation } from '../ui/BottomNavigation'
import { ScreenProps, Task, Reward, PointsTransaction, RewardPurchase } from '../../types'
import { ArrowLeft, Trophy, Star, Gift, History, ShoppingBag, Target, Zap, Clock, CheckCircle, Lock } from 'lucide-react'
import { FadeIn, ScaleButton } from '../ui/VisualPolish'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { AnalyticsManager } from '../../utils/analytics'
import { PointsTracker } from '../../utils/pointsTracker'
import { rewardsService } from '../../utils/rewardsService'

interface PointsScreenProps extends ScreenProps {}

export const PointsScreen: React.FC<PointsScreenProps> = ({
  navigateTo,
  appState,
}) => {
  const { showToast } = useToast()
  const { getCurrentUser, getTasks, getRewards, purchaseReward, getPointsTransactions, getRewardPurchases } = useApi()
  
  const [userPoints, setUserPoints] = useState<number>(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [purchases, setPurchases] = useState<RewardPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'shop' | 'history' | 'rewards'>('tasks')
  const [purchasingRewardId, setPurchasingRewardId] = useState<string | null>(null)

  // Helper function to determine active navigation state
  const getActiveClass = (screen: string) => {
    return appState.currentScreen === screen ? 'text-white' : 'text-gray-300 hover:text-white'
  }

  const handleBack = () => {
    navigateTo('home')
  }

  useEffect(() => {
    loadPointsData()
  }, [])

  const loadUserData = async () => {
    try {
      const userResponse = await getCurrentUser()
      if (userResponse.success && userResponse.data) {
        setUserPoints(userResponse.data.points || 0)
      } else {
        setUserPoints(0)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      setUserPoints(0)
    }
  }

  const loadPointsData = async () => {
    setLoading(true)
    try {
      await loadUserData()

      // Load real tasks from API with timeout and fallback
      try {
        const tasksResponse = await Promise.race([
          getTasks(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
        if (tasksResponse.success && tasksResponse.data) {
          setTasks(tasksResponse.data)
        } else {
          console.error('Failed to load tasks:', tasksResponse.error)
          setTasks([])
        }
      } catch (error) {
        console.error('Tasks API not available:', error)
        // Temporary fallback data while backend is being fixed
        setTasks([
          {
            id: 'first-booking',
            name: 'Make Your First Booking',
            description: 'Complete your very first court booking',
            points_reward: 100,
            category: 'booking',
            task_type: 'one-time',
            max_completions: 1,
            is_active: true,
            icon: '🎯',
            order_priority: 1,
            user_completion_count: 0,
            user_points_earned: 0,
            is_completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'complete-booking',
            name: 'Complete a Booking',
            description: 'Successfully complete a court booking',
            points_reward: 25,
            category: 'booking',
            task_type: 'repeatable',
            max_completions: null,
            is_active: true,
            icon: '🏸',
            order_priority: 2,
            user_completion_count: 0,
            user_points_earned: 0,
            is_completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'early-booking',
            name: 'Early Bird',
            description: 'Book a court for 6-9 AM time slot',
            points_reward: 35,
            category: 'booking',
            task_type: 'repeatable',
            max_completions: null,
            is_active: true,
            icon: '🌅',
            order_priority: 3,
            user_completion_count: 0,
            user_points_earned: 0,
            is_completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'daily-login',
            name: 'Daily Check-in',
            description: 'Open the app and check in daily',
            points_reward: 10,
            category: 'engagement',
            task_type: 'daily',
            max_completions: null,
            is_active: true,
            icon: '📅',
            order_priority: 4,
            user_completion_count: 0,
            user_points_earned: 0,
            is_completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'view-courts',
            name: 'Explore Courts',
            description: 'Browse available courts (max 3 times daily)',
            points_reward: 5,
            category: 'engagement',
            task_type: 'daily',
            max_completions: 3,
            is_active: true,
            icon: '🔍',
            order_priority: 5,
            user_completion_count: 0,
            user_points_earned: 0,
            is_completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ])
      }

      // Load real rewards from API with timeout and fallback
      try {
        const rewardsResponse = await Promise.race([
          getRewards(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
        if (rewardsResponse.success && rewardsResponse.data) {
          setRewards(rewardsResponse.data.all || [])
        } else {
          console.error('Failed to load rewards:', rewardsResponse.error)
          setRewards([])
        }
      } catch (error) {
        console.error('Rewards API not available:', error)
        // Temporary fallback data while backend is being fixed
        setRewards([
          {
            id: 'discount-2',
            name: '$2 Booking Discount',
            description: 'Get $2 off your next booking',
            points_cost: 200,
            category: 'discounts',
            reward_type: 'discount',
            reward_value: 2.00,
            duration_days: null,
            is_active: true,
            icon: '💰',
            order_priority: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'free-hour',
            name: 'Free 1-Hour Booking',
            description: 'Completely free 1-hour court booking',
            points_cost: 1200,
            category: 'vouchers',
            reward_type: 'voucher',
            reward_value: 12.00,
            duration_days: 30,
            is_active: true,
            icon: '🎁',
            order_priority: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'priority-booking',
            name: '24h Priority Booking',
            description: 'Skip the queue and book immediately',
            points_cost: 400,
            category: 'features',
            reward_type: 'feature',
            reward_value: null,
            duration_days: 1,
            is_active: true,
            icon: '⚡',
            order_priority: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ])
      }

      // Load real transactions from API with timeout and fallback
      try {
        const transactionsResponse = await Promise.race([
          getPointsTransactions(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
        if (transactionsResponse.success && transactionsResponse.data) {
          setTransactions(transactionsResponse.data)
        } else {
          console.error('Failed to load transactions:', transactionsResponse.error)
          setTransactions([])
        }
      } catch (error) {
        console.error('Transactions API not available:', error)
        setTransactions([])
      }

      // Load real purchases from API with timeout and fallback
      try {
        const purchasesResponse = await Promise.race([
          getRewardPurchases(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
        if (purchasesResponse.success && purchasesResponse.data) {
          setPurchases(purchasesResponse.data)
        } else {
          console.error('Failed to load purchases:', purchasesResponse.error)
          setPurchases([])
        }
      } catch (error) {
        console.error('Purchases API not available:', error)
        setPurchases([])
      }

    } catch (error) {
      console.error('Error loading points data:', error)
      showToast('error', 'Failed to load points data')
    } finally {
      setLoading(false)
    }
  }



  // Generate mock points history
  const getPointsHistory = () => {
    // Simulate some point transactions based on completed tasks
    const history = []
    
    // Add transactions for completed tasks
    tasks.forEach(task => {
      if (task.is_completed) {
        history.push({
          icon: task.icon,
          description: `Completed: ${task.name}`,
          points: task.points_reward,
          date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        })
      }
    })

    // Add some mock point spending
    if (history.length > 0) {
      history.push({
        icon: '🎁',
        description: 'Purchased: 10% Booking Discount',
        points: -200,
        date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
      })
    }

    // Sort by most recent first
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Generate mock purchased rewards
  const getPurchasedRewards = () => {
    // Simulate some purchased rewards
    const purchasedRewards = []
    
    // If user has enough activity, show some purchased rewards
    const completedTasksCount = tasks.filter(t => t.is_completed).length
    if (completedTasksCount > 0) {
      purchasedRewards.push({
        icon: '💰',
        name: '10% Booking Discount',
        description: 'Get 10% off your next court booking',
        pointsCost: 200,
        purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'active'
      })
    }

    if (completedTasksCount > 1) {
      purchasedRewards.push({
        icon: '🏆',
        name: 'Free Court Booking',
        description: 'One free court booking (up to $25 value)',
        pointsCost: 500,
        purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'used'
      })
    }

    return purchasedRewards
  }

  // My Rewards Tab Component
  const MyRewardsTab = () => {
    const [allUserRewards, setAllUserRewards] = useState<any[]>([])
    const [loadingRewards, setLoadingRewards] = useState(true)

    useEffect(() => {
      const loadUserRewards = async () => {
        try {
          // Use real API instead of rewardsService
          const response = await getRewardPurchases()
          if (response.success && response.data) {
            setAllUserRewards(response.data)
          } else {
            console.error('Failed to load user rewards:', response.error)
            setAllUserRewards([])
          }
        } catch (error) {
          console.error('Error loading user rewards:', error)
          setAllUserRewards([])
        } finally {
          setLoadingRewards(false)
        }
      }
      loadUserRewards()
    }, [])

    if (loadingRewards) {
      return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <Clock className="w-16 h-16 text-white/50 mx-auto mb-4 animate-spin" />
          <h3 className="text-white font-semibold text-lg mb-2">Loading...</h3>
          <p className="text-white/70">Fetching your rewards...</p>
        </div>
      )
    }

    if (allUserRewards.length === 0) {
      return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
          <ShoppingBag className="w-16 h-16 text-white/50 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">No Rewards Yet</h3>
          <p className="text-white/70">Purchase rewards from the shop to see them here.</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {allUserRewards.map((purchase, index) => (
          <div
            key={purchase.id || index}
            className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{purchase.reward_icon || '🎁'}</div>
              <div className="flex-1">
                <h4 className="text-white font-semibold text-lg mb-1">{purchase.reward_name}</h4>
                <p className="text-white/70 text-sm mb-2">{purchase.reward_description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-purple-300">
                      {purchase.reward_type === 'discount' ? `$${purchase.reward_value} off` : 
                       purchase.reward_type === 'voucher' ? 'Voucher' : 
                       purchase.reward_type === 'feature' ? 'Feature' : 
                       purchase.reward_type === 'merchandise' ? 'Merchandise' : 
                       purchase.reward_type === 'service' ? 'Service' : 'Reward'}
                    </span>
                    <span className="text-white/50">
                      Purchased: {new Date(purchase.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-yellow-300">
                      {purchase.points_spent} points
                    </span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    purchase.status === 'active' 
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : purchase.status === 'used'
                      ? 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
                      : purchase.status === 'expired'
                      ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                  }`}>
                    {purchase.status}
                  </div>
                </div>
                {purchase.expires_at && (
                  <div className="mt-2 text-xs text-white/50">
                    Expires: {new Date(purchase.expires_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await completeTask(taskId)
      
      if (response.success && response.data) {
        // Update user points
        setUserPoints(prev => prev + response.data.points_earned)
        
        // Refresh tasks to show updated completion status
        const tasksResponse = await getTasks()
        if (tasksResponse.success && tasksResponse.data) {
          setTasks(tasksResponse.data)
        }
        
        showToast('success', `Task completed! Earned ${response.data.points_earned} points`)
      } else {
        showToast('error', response.error || 'Failed to complete task')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      showToast('error', 'Failed to complete task')
    }
  }

  const handlePurchaseReward = async (rewardId: string) => {
    setPurchasingRewardId(rewardId)
    try {
      const reward = rewards.find(r => r.id === rewardId)
      if (!reward) return

      if (userPoints < reward.points_cost) {
        showToast('error', 'Not enough points')
        return
      }

      // Call real API to purchase reward
      const response = await purchaseReward(rewardId)
      
      if (response.success && response.data) {
        setUserPoints(response.data.remaining_points)
        showToast('success', `Purchased ${response.data.reward_name}!`)
        
        // Refresh purchases list
        const purchasesResponse = await getRewardPurchases()
        if (purchasesResponse.success && purchasesResponse.data) {
          setPurchases(purchasesResponse.data)
        }
      } else {
        showToast('error', response.error || 'Failed to purchase reward')
      }
    } catch (error) {
      console.error('Error purchasing reward:', error)
      showToast('error', 'Failed to purchase reward')
    } finally {
      setPurchasingRewardId(null)
    }
  }

  const getTaskProgressText = (task: Task) => {
    if (task.task_type === 'repeatable' && task.max_completions) {
      return `${task.user_completion_count}/${task.max_completions} completed`
    }
    if (task.task_type === 'weekly') {
      return task.is_completed ? 'Completed this week' : 'In progress'
    }
    return task.is_completed ? 'Completed' : 'Not completed'
  }

  const getTaskRequirement = (task: Task) => {
    switch (task.id) {
      case 'first-booking':
        return 'Complete any booking'
      case 'complete-profile':
        return 'Add photo and fill all profile fields'
      case 'multiple-bookings':
        return 'Complete 5 total bookings'
      case 'credit-purchase':
        return 'Buy any credit package'
      case 'weekly-usage':
        return 'Open app daily for 7 days'
      case 'share-app':
        return 'Share app link with friends'
      default:
        return task.description
    }
  }

  const completedTasks = tasks.filter(task => task.is_completed)
  const availableTasks = tasks.filter(task => !task.is_completed)

  if (loading) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading your points...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Your Points</h1>
              <p className="text-gray-200">Daily tasks & rewards refresh every 24 hours</p>
              
            </div>
          </div>

        </div>

        {/* Points Balance Card */}
        <FadeIn delay={0.1}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2">{userPoints}</div>
              <div className="text-gray-300 text-lg mb-4">points available</div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{completedTasks.length}</div>
                  <div className="text-white/70 text-sm">completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{availableTasks.length}</div>
                  <div className="text-white/70 text-sm">available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{purchases.length}</div>
                  <div className="text-white/70 text-sm">rewards</div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Navigation Tabs */}
        <FadeIn delay={0.2}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 mb-6">
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'tasks', label: 'Daily Tasks', icon: Target },
                { id: 'shop', label: 'Daily Shop', icon: Gift },
                { id: 'history', label: 'History', icon: History },
                { id: 'rewards', label: 'My Rewards', icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mb-1" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Content based on active tab */}
        {activeTab === 'tasks' && (
          <FadeIn delay={0.3}>
            <div className="space-y-4">
                          <h2 className="text-2xl font-bold text-white mb-4">🎯 Tasks</h2>

                          {/* Available Tasks */}
            {availableTasks.length > 0 && (
              <div className="space-y-4 mb-6">
                  {availableTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`backdrop-blur-md rounded-2xl p-6 border transition-all ${
                        task.is_completed 
                          ? 'bg-green-500/10 border-green-400/50' 
                          : 'bg-white/10 border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-3xl">{task.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-2">{task.name}</h3>
                          <p className="text-white/70 text-sm mb-3">{getTaskRequirement(task)}</p>
                          <p className="text-white/60 text-xs mb-4">{getTaskProgressText(task)}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-yellow-300 font-semibold">+{task.points_reward} points</span>
                            <span className="text-white/50 capitalize">{task.category}</span>
                            <span className="text-white/50">{task.task_type.replace('-', ' ')}</span>
                            {task.is_completed && (
                              <div className="flex items-center bg-green-500/20 text-green-300 px-3 py-1 rounded-lg font-semibold border border-green-400/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Done
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-4">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-3xl grayscale">{task.icon}</div>
                          <div className="flex-1">
                            <h3 className="text-white/80 font-semibold text-lg mb-2">{task.name}</h3>
                            <p className="text-white/50 text-sm mb-3">{getTaskRequirement(task)}</p>
                            <p className="text-white/40 text-xs mb-4">{getTaskProgressText(task)}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-300 font-semibold">+{task.points_reward} points earned</span>
                              <span className="text-white/30 capitalize">{task.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center bg-green-500/20 text-green-300 px-4 py-2 rounded-xl font-semibold border border-green-400/30">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {availableTasks.length === 0 && completedTasks.length === 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                  <Target className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No Tasks Available</h3>
                  <p className="text-white/70">Check back later for new challenges to earn points!</p>
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {activeTab === 'shop' && (
          <FadeIn delay={0.3}>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">🎁 Daily Shop</h2>
              {rewards.length > 0 ? (
                <div className="space-y-4">
                  {rewards.map((reward) => (
                    <ScaleButton
                      key={reward.id}
                      onClick={() => handlePurchaseReward(reward.id)}
                      disabled={purchasingRewardId === reward.id || userPoints < reward.points_cost}
                      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all w-full"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-3xl">{reward.icon}</div>
                          <div className="flex-1 text-left">
                            <h3 className="text-white font-semibold text-lg mb-1">{reward.name}</h3>
                            <p className="text-white/70 text-sm mb-3">{reward.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-purple-300 font-semibold">{reward.points_cost} points</span>
                              <span className="text-white/50 capitalize">{reward.category}</span>
                            </div>
                          </div>
                        </div>
                        {purchasingRewardId === reward.id ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white ml-4"></div>
                        ) : userPoints >= reward.points_cost ? (
                          <div className="bg-purple-500 text-white px-4 py-2 rounded-xl font-semibold ml-4">
                            Buy Now
                          </div>
                        ) : (
                          <div className="bg-white/20 text-white/50 px-4 py-2 rounded-xl font-semibold ml-4 flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            Need {reward.points_cost - userPoints} more
                          </div>
                        )}
                      </div>
                    </ScaleButton>
                  ))}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                  <Gift className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No Awards Available</h3>
                  <p className="text-white/70">Daily rewards will appear here. Check back tomorrow for new offers!</p>
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {activeTab === 'history' && (
          <FadeIn delay={0.3}>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Points History</h2>
              {transactions.length > 0 || getPointsHistory().length > 0 ? (
                <div className="space-y-3">
                  {getPointsHistory().map((transaction, index) => (
                    <div
                      key={index}
                      className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{transaction.icon}</div>
                          <div>
                            <h4 className="text-white font-medium">{transaction.description}</h4>
                            <p className="text-white/60 text-sm">{transaction.date}</p>
                          </div>
                        </div>
                        <div className={`font-semibold ${transaction.points > 0 ? 'text-green-300' : 'text-red-300'}`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points} points
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                  <Clock className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2">No History Yet</h3>
                  <p className="text-white/70">Complete tasks to see your points history here.</p>
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {activeTab === 'rewards' && (
          <FadeIn delay={0.3}>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">⭐ My Rewards</h2>
              <MyRewardsTab />
            </div>
          </FadeIn>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentScreen={appState.currentScreen}
        onNavigate={navigateTo}
      />
    </div>
  )
}