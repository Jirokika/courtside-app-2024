import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../services/database'

const router = Router()

// Get all available tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, points_reward, category, requirements, 
             is_active, created_at, updated_at
      FROM tasks
      WHERE is_active = true
      ORDER BY category, points_reward
    `)
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    })
  }
})

// Complete a task
router.post('/tasks/:taskId/complete', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    const { userId, metadata } = req.body
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }
    
    // Check if task exists and is active
    const taskResult = await pool.query(`
      SELECT * FROM tasks WHERE id = $1 AND is_active = true
    `, [taskId])
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or inactive'
      })
    }
    
    const task = taskResult.rows[0]
    
    // Check if user already completed this task recently (prevent abuse)
    const recentCompletion = await pool.query(`
      SELECT id FROM task_completions 
      WHERE user_id = $1 AND task_id = $2 
      AND completed_at > NOW() - INTERVAL '1 day'
    `, [userId, taskId])
    
    if (recentCompletion.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Task already completed recently'
      })
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
    
    res.json({
      success: true,
      data: {
        points_earned: task.points_reward,
        completion_count: 1,
        task_name: task.name
      }
    })
  } catch (error) {
    console.error('Error completing task:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to complete task'
    })
  }
})

// Get available rewards
router.get('/rewards', async (req, res) => {
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
    }, {} as Record<string, any[]>)
    
    res.json({
      success: true,
      data: {
        all: result.rows,
        by_category: rewardsByCategory
      }
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards'
    })
  }
})

// Purchase a reward
router.post('/rewards/:rewardId/purchase', authenticateToken, async (req, res) => {
  try {
    const { rewardId } = req.params
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      })
    }
    
    // Check if reward exists and is available
    const rewardResult = await pool.query(`
      SELECT * FROM rewards 
      WHERE id = $1 AND is_active = true 
      AND (expires_at IS NULL OR expires_at > NOW())
    `, [rewardId])
    
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found or expired'
      })
    }
    
    const reward = rewardResult.rows[0]
    
    // Check if user has enough points
    const userResult = await pool.query(`
      SELECT points FROM users WHERE id = $1
    `, [userId])
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    const userPoints = userResult.rows[0].points
    
    if (userPoints < reward.points_cost) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient points'
      })
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
    
    res.json({
      success: true,
      data: {
        purchase_id: purchaseResult.rows[0].id,
        reward_name: reward.name,
        points_spent: reward.points_cost,
        remaining_points: userPoints - reward.points_cost,
        expires_at: reward.expires_at
      }
    })
  } catch (error) {
    console.error('Error purchasing reward:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to purchase reward'
    })
  }
})

// Get user's points transactions
router.get('/transactions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const result = await pool.query(`
      SELECT id, amount, type, description, metadata, created_at
      FROM points_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)])
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching points transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch points transactions'
    })
  }
})

// Get user's reward purchases
router.get('/purchases/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const result = await pool.query(`
      SELECT rp.id, r.name as reward_name, r.description, rp.points_spent, 
             rp.purchased_at, r.expires_at
      FROM reward_purchases rp
      JOIN rewards r ON rp.reward_id = r.id
      WHERE rp.user_id = $1
      ORDER BY rp.purchased_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)])
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching reward purchases:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reward purchases'
    })
  }
})

export default router
