import { Router } from 'express'
import { authenticateToken, optionalAuth } from '../middleware/auth'
import { validateRequiredFields, validateDateRange, validateTimeSlot } from '../middleware/validation'
import { pool } from '../services/database'

const router = Router()

// Get all bookings for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { status, limit = 50, offset = 0 } = req.query
    
    let query = `
      SELECT b.*, c.name as court_name, c.sport as court_sport
      FROM bookings b
      LEFT JOIN courts c ON b.court_id = c.id
      WHERE b.user_id = $1
    `
    const params: (string | number)[] = [userId as string]
    
    if (status) {
      query += ` AND b.status = $2`
      params.push(status as string)
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
    console.error('Error fetching user bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    })
  }
})

// Get a specific booking
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(`
      SELECT b.*, c.name as court_name, c.sport as court_sport, u.first_name, u.last_name
      FROM bookings b
      LEFT JOIN courts c ON b.court_id = c.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `, [id])
    
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
    console.error('Error fetching booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    })
  }
})

// Create a new booking
router.post('/', authenticateToken, 
  validateRequiredFields(['sport', 'date', 'time', 'duration', 'courts']),
  validateDateRange,
  validateTimeSlot,
  async (req, res) => {
    try {
      const { sport, date, time, duration, courts, paymentMethod = 'credits' } = req.body
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      const userId = req.user.id
      
      // Check for booking conflicts
      const conflictCheck = await pool.query(`
        SELECT id FROM bookings 
        WHERE court_id = ANY($1) 
        AND date = $2 
        AND time = $3 
        AND status IN ('confirmed', 'pending')
      `, [courts, date, time])
      
      if (conflictCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time slot already booked for selected courts'
        })
      }
      
      // Create booking
      const result = await pool.query(`
        INSERT INTO bookings (user_id, sport, date, time, duration, court_id, payment_method, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING *
      `, [userId, sport, date, time, duration, courts[0], paymentMethod])
      
      res.status(201).json({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Error creating booking:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create booking'
      })
    }
  }
)

// Update booking status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      })
    }
    
    const result = await pool.query(`
      UPDATE bookings 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, id])
    
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

// Cancel a booking
router.delete('/:id', authenticateToken, async (req, res) => {
      try {
      const { id } = req.params
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        })
      }
      const userId = req.user.id
      
      const result = await pool.query(`
      UPDATE bookings 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found or not authorized'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking'
    })
  }
})

export default router
