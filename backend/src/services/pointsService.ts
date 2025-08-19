import { pool } from './database'

export interface Task {
  id: string
  name: string
  description: string
  pointsReward: number
  category: string
  requirements: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  category: string
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PointsTransaction {
  id: string
  userId: string
  amount: number
  type: 'earned' | 'spent' | 'bonus' | 'penalty'
  description: string
  metadata?: any
  createdAt: Date
}

export interface RewardPurchase {
  id: string
  userId: string
  rewardId: string
  pointsSpent: number
  purchasedAt: Date
  rewardName?: string
  rewardDescription?: string
}

export class PointsService {
  // Get all available tasks
  async getTasks(): Promise<{ success: boolean; data?: Task[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT id, name, description, points_reward, category, requirements, 
               is_active, created_at, updated_at
        FROM tasks
        WHERE is_active = true
        ORDER BY category, points_reward
      `)
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return { success: false, error: 'Failed to fetch tasks' }
    }
  }
  
  // Complete a task
  async completeTask(taskId: string, userId: string, metadata?: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Check if task exists and is active
      const taskResult = await pool.query(`
        SELECT * FROM tasks WHERE id = $1 AND is_active = true
      `, [taskId])
      
      if (taskResult.rows.length === 0) {
        return { success: false, error: 'Task not found or inactive' }
      }
      
      const task = taskResult.rows[0]
      
      // Check if user already completed this task recently (prevent abuse)
      const recentCompletion = await pool.query(`
        SELECT id FROM task_completions 
        WHERE user_id = $1 AND task_id = $2 
        AND completed_at > NOW() - INTERVAL '1 day'
      `, [userId, taskId])
      
      if (recentCompletion.rows.length > 0) {
        return { success: false, error: 'Task already completed recently' }
      }
      
      // Record task completion
      await pool.query(`
        INSERT INTO task_completions (user_id, task_id, metadata, completed_at)
        VALUES ($1, $2, $3, NOW())
      `, [userId, taskId, metadata])
      
      // Award points to user
      await pool.query(`
        UPDATE users SET points = points + $1, updated_at = NOW()
        WHERE id = $2
      `, [task.points_reward, userId])
      
      // Record points transaction
      await pool.query(`
        INSERT INTO points_transactions (user_id, amount, type, description, metadata)
        VALUES ($1, $2, 'earned', $3, $4)
      `, [userId, task.points_reward, `Completed task: ${task.name}`, metadata])
      
      return {
        success: true,
        data: {
          points_earned: task.points_reward,
          completion_count: 1,
          task_name: task.name
        }
      }
    } catch (error) {
      console.error('Error completing task:', error)
      return { success: false, error: 'Failed to complete task' }
    }
  }
  
  // Get available rewards
  async getRewards(): Promise<{ success: boolean; data?: { all: Reward[]; by_category: Record<string, Reward[]> }; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT id, name, description, points_cost, category, is_active, 
               expires_at, created_at, updated_at
        FROM rewards
        WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY category, points_cost
      `)
      
      // Group rewards by category
      const rewardsByCategory = result.rows.reduce((acc, reward) => {
        const category = reward.category || 'general'
        if (!acc[category]) acc[category] = []
        acc[category].push(reward)
        return acc
      }, {} as Record<string, Reward[]>)
      
      return {
        success: true,
        data: {
          all: result.rows,
          by_category: rewardsByCategory
        }
      }
    } catch (error) {
      console.error('Error fetching rewards:', error)
      return { success: false, error: 'Failed to fetch rewards' }
    }
  }
  
  // Purchase a reward
  async purchaseReward(rewardId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Check if reward exists and is available
      const rewardResult = await pool.query(`
        SELECT * FROM rewards 
        WHERE id = $1 AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      `, [rewardId])
      
      if (rewardResult.rows.length === 0) {
        return { success: false, error: 'Reward not found or expired' }
      }
      
      const reward = rewardResult.rows[0]
      
      // Check if user has enough points
      const userResult = await pool.query(`
        SELECT points FROM users WHERE id = $1
      `, [userId])
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' }
      }
      
      const userPoints = userResult.rows[0].points
      
      if (userPoints < reward.points_cost) {
        return { success: false, error: 'Insufficient points' }
      }
      
      // Deduct points from user
      await pool.query(`
        UPDATE users SET points = points - $1, updated_at = NOW()
        WHERE id = $2
      `, [reward.points_cost, userId])
      
      // Record reward purchase
      const purchaseResult = await pool.query(`
        INSERT INTO reward_purchases (user_id, reward_id, points_spent, purchased_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
      `, [userId, rewardId, reward.points_cost])
      
      // Record points transaction
      await pool.query(`
        INSERT INTO points_transactions (user_id, amount, type, description, metadata)
        VALUES ($1, $2, 'spent', $3, $4)
      `, [userId, -reward.points_cost, `Purchased reward: ${reward.name}`, { purchase_id: purchaseResult.rows[0].id }])
      
      return {
        success: true,
        data: {
          purchase_id: purchaseResult.rows[0].id,
          reward_name: reward.name,
          points_spent: reward.points_cost,
          remaining_points: userPoints - reward.points_cost,
          expires_at: reward.expires_at
        }
      }
    } catch (error) {
      console.error('Error purchasing reward:', error)
      return { success: false, error: 'Failed to purchase reward' }
    }
  }
  
  // Get user's points transactions
  async getPointsTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: PointsTransaction[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT id, user_id, amount, type, description, metadata, created_at
        FROM points_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset])
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching points transactions:', error)
      return { success: false, error: 'Failed to fetch points transactions' }
    }
  }
  
  // Get user's reward purchases
  async getRewardPurchases(userId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: RewardPurchase[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT rp.id, rp.user_id, rp.reward_id, rp.points_spent, 
               rp.purchased_at, r.name as reward_name, r.description as reward_description
        FROM reward_purchases rp
        JOIN rewards r ON rp.reward_id = r.id
        WHERE rp.user_id = $1
        ORDER BY rp.purchased_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset])
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching reward purchases:', error)
      return { success: false, error: 'Failed to fetch reward purchases' }
    }
  }
  
  // Award bonus points to user
  async awardBonusPoints(userId: string, amount: number, reason: string, metadata?: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Add points to user
      await pool.query(`
        UPDATE users SET points = points + $1, updated_at = NOW()
        WHERE id = $2
      `, [amount, userId])
      
      // Record points transaction
      await pool.query(`
        INSERT INTO points_transactions (user_id, amount, type, description, metadata)
        VALUES ($1, $2, 'bonus', $3, $4)
      `, [userId, amount, reason, metadata])
      
      return {
        success: true,
        data: {
          points_awarded: amount,
          reason: reason
        }
      }
    } catch (error) {
      console.error('Error awarding bonus points:', error)
      return { success: false, error: 'Failed to award bonus points' }
    }
  }
  
  // Get user's current points balance
  async getUserPoints(userId: string): Promise<{ success: boolean; data?: number; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT points FROM users WHERE id = $1
      `, [userId])
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' }
      }
      
      return { success: true, data: result.rows[0].points }
    } catch (error) {
      console.error('Error fetching user points:', error)
      return { success: false, error: 'Failed to fetch user points' }
    }
  }
  
  // Get leaderboard (top users by points)
  async getLeaderboard(limit: number = 10): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.username, u.points, u.telegram_id
        FROM users u
        WHERE u.is_active = true
        ORDER BY u.points DESC
        LIMIT $1
      `, [limit])
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return { success: false, error: 'Failed to fetch leaderboard' }
    }
  }
}

export const pointsService = new PointsService()
