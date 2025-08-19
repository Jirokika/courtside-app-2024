import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../services/database'
import jwt from 'jsonwebtoken'

const router = Router()

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    
    const result = await pool.query(`
      SELECT id, telegram_id, first_name, last_name, username, photo_url, 
             language_code, is_premium, credits, points, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    })
  }
})

// Get user by Telegram ID
router.get('/telegram/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params
    
    const result = await pool.query(`
      SELECT id, telegram_id, first_name, last_name, username, photo_url, 
             language_code, is_premium, credits, points, created_at, updated_at
      FROM users 
      WHERE telegram_id = $1
    `, [telegramId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error fetching user by Telegram ID:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    })
  }
})

// Create or authenticate user via Telegram
router.post('/auth/telegram', async (req, res) => {
  try {
    const { telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium } = req.body
    
    if (!telegramId || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Telegram ID and first name are required'
      })
    }
    
    // Check if user exists
    let result = await pool.query(`
      SELECT * FROM users WHERE telegram_id = $1
    `, [telegramId])
    
    let user
    if (result.rows.length > 0) {
      // User exists, update last login
      user = result.rows[0]
      await pool.query(`
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [user.id])
    } else {
      // Create new user
      result = await pool.query(`
        INSERT INTO users (telegram_id, first_name, last_name, username, photo_url, 
                          language_code, is_premium, credits, points)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
        RETURNING *
      `, [telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium])
      
      user = result.rows[0]
    }
    
    // Generate JWT token
    const secret = process.env['JWT_SECRET'] || 'fallback-secret'
    const token = jwt.sign(
      { 
        id: user.id, 
        telegramId: user.telegram_id,
        firstName: user.first_name,
        lastName: user.last_name
      },
      secret,
      { expiresIn: '30d' }
    )
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          telegramId: user.telegram_id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username,
          photoUrl: user.photo_url,
          languageCode: user.language_code,
          isPremium: user.is_premium,
          credits: user.credits,
          points: user.points
        },
        token
      }
    })
  } catch (error) {
    console.error('Error authenticating user:', error)
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    })
  }
})

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    const { firstName, lastName, username, photoUrl } = req.body
    
    const result = await pool.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          username = COALESCE($3, username),
          photo_url = COALESCE($4, photo_url),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [firstName, lastName, username, photoUrl, userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    })
  }
})

// Update user credits
router.put('/credits', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    const { credits, operation = 'add' } = req.body
    
    if (!credits || credits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid credits amount required'
      })
    }
    
    let query
    if (operation === 'add') {
      query = `UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING *`
    } else if (operation === 'subtract') {
      query = `UPDATE users SET credits = GREATEST(0, credits - $1), updated_at = NOW() WHERE id = $2 RETURNING *`
    } else {
      query = `UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2 RETURNING *`
    }
    
    const result = await pool.query(query, [credits, userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating user credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update credits'
    })
  }
})

export default router
