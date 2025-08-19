import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'

import { pool } from '../services/database'

const router = Router()

// Admin middleware - check if user is admin
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }
    
    // Check if user is admin
    const adminCheck = await pool.query(`
      SELECT is_admin FROM users WHERE id = $1
    `, [userId])
    
    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }
    
    next()
  } catch (error) {
    console.error('Admin check error:', error)
    res.status(500).json({
      success: false,
      error: 'Admin verification failed'
    })
  }
}

// Get all bookings (admin view)
router.get('/bookings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, limit = 100, offset = 0, date } = req.query
    
    let query = `
      SELECT b.*, u.first_name, u.last_name, u.telegram_id, c.name as court_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN courts c ON b.court_id = c.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (status) {
      query += ` AND b.status = $${params.length + 1}`
      params.push(status)
    }
    
    if (date) {
      query += ` AND b.date = $${params.length + 1}`
      params.push(date)
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit as string), parseInt(offset as string))
    
    const result = await pool.query(query, params)
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching admin bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    })
  }
})

// Update booking status (admin)
router.put('/bookings/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes } = req.body
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      })
    }
    
    const result = await pool.query(`
      UPDATE bookings 
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, adminNotes, id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating booking status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update booking status'
    })
  }
})

// Get all users (admin view)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query
    
    let query = `
      SELECT id, telegram_id, first_name, last_name, username, email, 
             credits, points, is_admin, is_active, created_at, last_login
      FROM users
      WHERE 1=1
    `
    const params: any[] = []
    
    if (search) {
      query += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR username ILIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit as string), parseInt(offset as string))
    
    const result = await pool.query(query, params)
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    })
  }
})

// Update user (admin)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { credits, points, isAdmin, isActive, adminNotes } = req.body
    
    const result = await pool.query(`
      UPDATE users 
      SET credits = COALESCE($1, credits),
          points = COALESCE($2, points),
          is_admin = COALESCE($3, is_admin),
          is_active = COALESCE($4, is_active),
          admin_notes = COALESCE($5, admin_notes),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [credits, points, isAdmin, isActive, adminNotes, id])
    
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
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    })
  }
})

// Get system analytics
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query // days
    
    // Get booking statistics
    const bookingStats = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '${period} days' THEN 1 END) as recent_bookings
      FROM bookings
    `)
    
    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '${period} days' THEN 1 END) as new_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as active_users
      FROM users
    `)
    
    // Get revenue statistics
    const revenueStats = await pool.query(`
      SELECT 
        SUM(CASE WHEN payment_method = 'credits' THEN 1 ELSE 0 END) as credit_payments,
        SUM(CASE WHEN payment_method = 'aba' THEN 1 ELSE 0 END) as aba_payments,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as successful_payments
      FROM bookings
      WHERE status = 'confirmed'
    `)
    
    res.json({
      success: true,
      data: {
        period_days: parseInt(period as string),
        bookings: bookingStats.rows[0],
        users: userStats.rows[0],
        revenue: revenueStats.rows[0],
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    })
  }
})

// Process payment proof (admin approval)
router.post('/payments/:bookingId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bookingId } = req.params
    const { approved, adminNotes } = req.body
    
    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Approval status is required'
      })
    }
    
    // Update booking status based on approval
    const newStatus = approved ? 'confirmed' : 'cancelled'
    
    const result = await pool.query(`
      UPDATE bookings 
      SET status = $1, admin_notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newStatus, adminNotes, bookingId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }
    
    // If approved, deduct credits from user
    if (approved) {
      const booking = result.rows[0]
      await pool.query(`
        UPDATE users 
        SET credits = GREATEST(0, credits - $1), updated_at = NOW()
        WHERE id = $2
      `, [booking.credits_required || 1, booking.user_id])
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: `Payment ${approved ? 'approved' : 'rejected'} successfully`
    })
  } catch (error) {
    console.error('Error processing payment approval:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process payment approval'
    })
  }
})

// Get payment proofs pending approval
router.get('/payments/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.user_id, b.sport, b.date, b.time, b.payment_method,
             b.payment_proof_url, b.created_at, b.admin_notes,
             u.first_name, u.last_name, u.telegram_id
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.payment_method = 'aba' AND b.status = 'pending'
      ORDER BY b.created_at ASC
    `)
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching pending payments:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending payments'
    })
  }
})

export default router
