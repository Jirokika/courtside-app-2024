import { pool } from './database'

export interface PaymentData {
  id: string
  bookingId: string
  userId: string
  amount: number
  method: 'credits' | 'aba'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  proofUrl?: string
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreditPackage {
  id: string
  name: string
  description: string
  credits: number
  priceUsd: number
  isPopular: boolean
  isActive: boolean
}

export interface CreditPurchase {
  id: string
  userId: string
  packageId: string
  amountPaid: number
  paymentMethod: string
  status: 'pending' | 'approved' | 'rejected'
  proofUrl?: string
  requestedCredits: number
  createdAt: Date
  updatedAt: Date
}

export class PaymentService {
  // Process payment for a booking
  async processPayment(bookingId: string, userId: string, paymentMethod: 'credits' | 'aba', amount: number, proofUrl?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Verify booking exists and belongs to user
      const bookingResult = await pool.query(`
        SELECT * FROM bookings WHERE id = $1 AND user_id = $2
      `, [bookingId, userId])
      
      if (bookingResult.rows.length === 0) {
        return { success: false, error: 'Booking not found or not authorized' }
      }
      
      const booking = bookingResult.rows[0]
      
      // Check if payment already processed
      if (booking.payment_status === 'paid') {
        return { success: false, error: 'Payment already processed for this booking' }
      }
      
      if (paymentMethod === 'credits') {
        return await this.processCreditPayment(bookingId, userId, amount)
      } else if (paymentMethod === 'aba') {
        return await this.processABAPayment(bookingId, userId, amount, proofUrl)
      } else {
        return { success: false, error: 'Invalid payment method' }
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      return { success: false, error: 'Payment processing failed' }
    }
  }
  
  // Process credit payment
  private async processCreditPayment(bookingId: string, userId: string, amount: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Check if user has enough credits
      const userResult = await pool.query(`
        SELECT credits FROM users WHERE id = $1
      `, [userId])
      
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' }
      }
      
      const userCredits = userResult.rows[0].credits
      
      if (userCredits < amount) {
        return { success: false, error: 'Insufficient credits' }
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
      
      return {
        success: true,
        data: {
          booking_id: bookingId,
          payment_status: 'paid',
          message: 'Payment processed successfully'
        }
      }
    } catch (error) {
      console.error('Error processing credit payment:', error)
      return { success: false, error: 'Credit payment failed' }
    }
  }
  
  // Process ABA payment
  private async processABAPayment(bookingId: string, userId: string, amount: number, proofUrl?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Mark as pending until admin approval
      await pool.query(`
        UPDATE bookings 
        SET payment_status = 'pending', payment_method = 'aba',
            payment_proof_url = $1, updated_at = NOW()
        WHERE id = $2
      `, [proofUrl, bookingId])
      
      // Create payment record
      await pool.query(`
        INSERT INTO payments (booking_id, user_id, amount, method, status, proof_url)
        VALUES ($1, $2, $3, 'aba', 'pending', $4)
      `, [bookingId, userId, amount, proofUrl])
      
      return {
        success: true,
        data: {
          booking_id: bookingId,
          payment_status: 'pending',
          message: 'Payment proof submitted, awaiting admin approval'
        }
      }
    } catch (error) {
      console.error('Error processing ABA payment:', error)
      return { success: false, error: 'ABA payment processing failed' }
    }
  }
  
  // Get payment status
  async getPaymentStatus(bookingId: string, userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT b.payment_status, b.payment_method, b.payment_processed_at,
               b.payment_proof_url, b.status, p.status as payment_record_status
        FROM bookings b
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.id = $1 AND b.user_id = $2
      `, [bookingId, userId])
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Booking not found or not authorized' }
      }
      
      return { success: true, data: result.rows[0] }
    } catch (error) {
      console.error('Error fetching payment status:', error)
      return { success: false, error: 'Failed to fetch payment status' }
    }
  }
  
  // Get credit packages
  async getCreditPackages(): Promise<{ success: boolean; data?: CreditPackage[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT id, name, description, credits, price_usd, is_popular, is_active
        FROM credit_packages
        WHERE is_active = true
        ORDER BY credits ASC
      `)
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching credit packages:', error)
      return { success: false, error: 'Failed to fetch credit packages' }
    }
  }
  
  // Purchase credits
  async purchaseCredits(userId: string, packageId: string, paymentMethod: string, proofUrl?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get credit package details
      const packageResult = await pool.query(`
        SELECT * FROM credit_packages WHERE id = $1 AND is_active = true
      `, [packageId])
      
      if (packageResult.rows.length === 0) {
        return { success: false, error: 'Credit package not found' }
      }
      
      const creditPackage = packageResult.rows[0]
      
      if (paymentMethod === 'aba') {
        // Create pending credit purchase
        const purchaseResult = await pool.query(`
          INSERT INTO credit_purchases (user_id, package_id, amount_paid, payment_method, 
                                      status, proof_url, requested_credits)
          VALUES ($1, $2, $3, 'aba', 'pending', $4, $5)
          RETURNING id
        `, [userId, packageId, creditPackage.price_usd, proofUrl, creditPackage.credits])
        
        return {
          success: true,
          data: {
            purchase_id: purchaseResult.rows[0].id,
            status: 'pending',
            message: 'Credit purchase submitted, awaiting admin approval'
          }
        }
      } else {
        return { success: false, error: 'Only ABA payment method supported for credit purchases' }
      }
    } catch (error) {
      console.error('Error purchasing credits:', error)
      return { success: false, error: 'Failed to purchase credits' }
    }
  }
  
  // Get credit purchase history
  async getCreditPurchaseHistory(userId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: CreditPurchase[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT cp.*, c.name as package_name, c.credits as package_credits
        FROM credit_purchases cp
        JOIN credit_packages c ON cp.package_id = c.id
        WHERE cp.user_id = $1
        ORDER BY cp.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset])
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching credit history:', error)
      return { success: false, error: 'Failed to fetch credit history' }
    }
  }
  
  // Get credit transactions
  async getCreditTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const result = await pool.query(`
        SELECT id, amount, type, description, booking_id, created_at
        FROM credit_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset])
      
      return { success: true, data: result.rows }
    } catch (error) {
      console.error('Error fetching credit transactions:', error)
      return { success: false, error: 'Failed to fetch credit transactions' }
    }
  }
}

export const paymentService = new PaymentService()
