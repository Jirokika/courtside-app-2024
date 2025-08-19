import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../services/database'

const router = Router()

// Process payment for a booking
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { bookingId, paymentMethod, amount, paymentProofUrl } = req.body
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    
    if (!bookingId || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID, payment method, and amount are required'
      })
    }
    
    // Verify booking exists and belongs to user
    const bookingResult = await pool.query(`
      SELECT * FROM bookings WHERE id = $1 AND user_id = $2
    `, [bookingId, userId])
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found or not authorized'
      })
    }
    
    const booking = bookingResult.rows[0]
    
    // Check if payment already processed
    if (booking.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment already processed for this booking'
      })
    }
    
    if (paymentMethod === 'credits') {
      // Check if user has enough credits
      const userResult = await pool.query(`
        SELECT credits FROM users WHERE id = $1
      `, [userId])
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }
      
      const userCredits = userResult.rows[0].credits
      
      if (userCredits < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credits'
        })
      }
      
      // Deduct credits and confirm payment
      await pool.query(`
        UPDATE users SET credits = credits - $1, updated_at = NOW()
        WHERE id = $2
      `, [amount, userId])
      
      await pool.query(`
        UPDATE bookings 
        SET payment_status = 'paid', payment_method = 'credits', 
            payment_processed_at = NOW(), status = 'confirmed', updated_at = NOW()
        WHERE id = $1
      `, [bookingId])
      
      // Record credit transaction
      await pool.query(`
        INSERT INTO credit_transactions (user_id, amount, type, description, booking_id)
        VALUES ($1, $2, 'spent', 'Court booking payment', $3)
      `, [userId, amount, bookingId])
      
    } else if (paymentMethod === 'aba') {
      // For ABA payments, mark as pending until admin approval
      await pool.query(`
        UPDATE bookings 
        SET payment_status = 'pending', payment_method = 'aba',
            payment_proof_url = $1, updated_at = NOW()
        WHERE id = $2
      `, [paymentProofUrl, bookingId])
      
      // Create payment record
      await pool.query(`
        INSERT INTO payments (booking_id, user_id, amount, method, status, proof_url)
        VALUES ($1, $2, $3, 'aba', 'pending', $4)
      `, [bookingId, userId, amount, paymentProofUrl])
    }
    
    res.json({
      success: true,
      data: {
        booking_id: bookingId,
        payment_status: paymentMethod === 'credits' ? 'paid' : 'pending',
        message: paymentMethod === 'credits' 
          ? 'Payment processed successfully' 
          : 'Payment proof submitted, awaiting admin approval'
      }
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process payment'
    })
  }
})

// Get payment status for a booking
router.get('/status/:bookingId', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    
    const result = await pool.query(`
      SELECT b.payment_status, b.payment_method, b.payment_processed_at,
             b.payment_proof_url, b.status, p.status as payment_record_status
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.id = $1 AND b.user_id = $2
    `, [bookingId, userId])
    
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
    console.error('Error fetching payment status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment status'
    })
  }
})

// Submit payment proof for ABA payment
router.post('/proof', authenticateToken, async (req, res) => {
  try {
    const { bookingId, paymentProofUrl } = req.body
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    
    if (!bookingId || !paymentProofUrl) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and payment proof are required'
      })
    }
    
    // Verify booking exists and belongs to user
    const bookingResult = await pool.query(`
      SELECT * FROM bookings WHERE id = $1 AND user_id = $2
    `, [bookingId, userId])
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found or not authorized'
      })
    }
    
    const booking = bookingResult.rows[0]
    
    // Update booking with payment proof
    await pool.query(`
      UPDATE bookings 
      SET payment_proof_url = $1, payment_status = 'pending', updated_at = NOW()
      WHERE id = $2
    `, [paymentProofUrl, bookingId])
    
    // Create or update payment record
    await pool.query(`
      INSERT INTO payments (booking_id, user_id, amount, method, status, proof_url)
      VALUES ($1, $2, $3, 'aba', 'pending', $4)
      ON CONFLICT (booking_id) 
      DO UPDATE SET proof_url = $4, status = 'pending', updated_at = NOW()
      RETURNING *
    `, [bookingId, userId, booking.total_amount || 0, paymentProofUrl])
    
    res.json({
      success: true,
      data: {
        booking_id: bookingId,
        payment_status: 'pending',
        message: 'Payment proof submitted successfully, awaiting admin approval'
      }
    })
  } catch (error) {
    console.error('Error submitting payment proof:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit payment proof'
    })
  }
})

// Get credit packages for purchase
router.get('/credit-packages', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, credits, price_usd, is_popular, is_active
      FROM credit_packages
      WHERE is_active = true
      ORDER BY credits ASC
    `)
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit packages'
    })
  }
})

// Purchase credits
router.post('/purchase-credits', authenticateToken, async (req, res) => {
  try {
    const { packageId, paymentMethod, paymentProofUrl } = req.body
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      })
    }
    const userId = req.user.id
    
    if (!packageId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Package ID and payment method are required'
      })
    }
    
    // Get credit package details
    const packageResult = await pool.query(`
      SELECT * FROM credit_packages WHERE id = $1 AND is_active = true
    `, [packageId])
    
    if (packageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credit package not found'
      })
    }
    
    const creditPackage = packageResult.rows[0]
    
    if (paymentMethod === 'aba') {
      // Create pending credit purchase
      const purchaseResult = await pool.query(`
        INSERT INTO credit_purchases (user_id, package_id, amount_paid, payment_method, 
                                    status, proof_url, requested_credits)
        VALUES ($1, $2, $3, 'aba', 'pending', $4, $5)
        RETURNING id
      `, [userId, packageId, creditPackage.price_usd, paymentProofUrl, creditPackage.credits])
      
      res.json({
        success: true,
        data: {
          purchase_id: purchaseResult.rows[0].id,
          status: 'pending',
          message: 'Credit purchase submitted, awaiting admin approval'
        }
      })
    } else {
      return res.status(400).json({
        success: false,
        error: 'Only ABA payment method supported for credit purchases'
      })
    }
  } catch (error) {
    console.error('Error purchasing credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to purchase credits'
    })
  }
})

// Get credit purchase history
router.get('/credit-history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const result = await pool.query(`
      SELECT cp.*, c.name as package_name, c.credits as package_credits
      FROM credit_purchases cp
      JOIN credit_packages c ON cp.package_id = c.id
      WHERE cp.user_id = $1
      ORDER BY cp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)])
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching credit history:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit history'
    })
  }
})

// Get credit transactions
router.get('/credit-transactions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 50, offset = 0 } = req.query
    
    const result = await pool.query(`
      SELECT id, amount, type, description, booking_id, created_at
      FROM credit_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit as string), parseInt(offset as string)])
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching credit transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit transactions'
    })
  }
})

export default router
