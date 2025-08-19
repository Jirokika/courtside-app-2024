import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)

// Environment variables
const PORT = process.env['PORT'] || 3001

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  query_timeout: 30000, // Return an error after 30 seconds if query could not be completed
  // Set timezone to Cambodia for all connections
  options: `-c timezone=Asia/Phnom_Penh`
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err)
  process.exit(-1)
})

// Rate limiting
// Trust proxy for rate limiting
app.set('trust proxy', 1)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env['NODE_ENV'] === 'production' ? 50000 : 1000, // Much higher limit for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      process.env['CORS_ORIGIN'] || 'http://localhost:5173',
      'https://frontend-production-9f50.up.railway.app',
      'https://courtside-web-app-2-0.vercel.app'
    ]
    
    console.log('🌐 CORS request from origin:', origin)
    console.log('🌐 Allowed origins:', allowedOrigins)
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🌐 Allowing request with no origin')
      return callback(null, true)
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('🌐 Allowing CORS request from:', origin)
      callback(null, true)
    } else {
      console.log('🌐 Blocking CORS request from:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
app.use(cors(corsOptions))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
    version: '1.1.5',
    pointsSystem: 'enabled'
  })
})

// Emergency deployment test endpoint
app.get('/api/emergency-deploy', (_req, res) => {
  res.json({
    success: true,
    message: 'Emergency deployment test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    pointsSystem: 'enabled',
    deployment: 'emergency',
    rebuild: 'forced'
  })
})

// Railway directory fix test endpoint
app.get('/api/railway-fix', (_req, res) => {
  res.json({
    success: true,
    message: 'Railway directory fix test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    railwayFix: 'active',
    deploymentPath: 'backend',
    status: 'fixed'
  })
})

// Force deployment test endpoint
app.get('/api/force-deploy', (_req, res) => {
  res.json({
    success: true,
    message: 'Force deployment test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    pointsSystem: 'enabled',
    deployment: 'forced'
  })
})

// Simple test endpoint at the top
app.get('/api/simple-test', (_req, res) => {
  res.json({
    success: true,
    message: 'Simple test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.0.7'
  })
})

// Emergency points test endpoint
app.get('/api/emergency-points', (_req, res) => {
  res.json({
    success: true,
    message: 'Emergency points endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    pointsSystem: 'enabled',
    deployment: 'forced'
  })
})

// MOVED POINTS ENDPOINTS TO EARLY POSITION TO AVOID RUNTIME ISSUES

// Points system test endpoint (moved from line 4653)
app.get('/api/points/test', async (_req, res) => {
  res.json({
    success: true,
    message: 'Points system endpoints are working!',
    timestamp: new Date().toISOString(),
    version: '1.1.2'
  })
})

// Get user's purchased rewards (MUST come BEFORE main rewards endpoint)
app.get('/api/points/rewards/user/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'User ID is required'
      })
    }

    client = await pool.connect()

    // Get user's reward purchases with reward details
    const rewardsResult = await client.query(`
      SELECT 
        rp.id,
        rp."userId",
        rp.reward_id,
        rp.points_spent,
        rp.status,
        rp.expires_at,
        rp."createdAt",
        rp."updatedAt",
        r.name as reward_name,
        r.description as reward_description,
        r.reward_type as reward_type,
        r.reward_value as reward_value,
        r.icon as reward_icon,
        r.category as reward_category
      FROM reward_purchases rp
      JOIN rewards r ON rp.reward_id = r.id
      WHERE rp."userId" = $1
      ORDER BY rp."createdAt" DESC
    `, [userId])

    const rewards = rewardsResult.rows.map(row => ({
      id: row.id,
      rewardId: row.reward_id,
      name: row.reward_name,
      description: row.reward_description,
      type: row.reward_type,
      value: row.reward_value,
      icon: row.reward_icon,
      category: row.reward_category,
      isActive: row.status === 'active',
      purchaseDate: row.createdAt,
      expiresAt: row.expires_at,
      status: row.status
    }))

    // Always return success, even if no rewards (empty array is valid)
    res.json({
      success: true,
      data: rewards,
      message: rewards.length > 0 ? 'User rewards retrieved successfully' : 'No rewards found for this user'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching user rewards:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user rewards',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get available rewards (moved from line 4891) - 3 random daily rewards
app.get('/api/points/rewards', async (_req, res) => {
  let client
  try {
    client = await pool.connect()

    const rewardsResult = await client.query(`
      SELECT * FROM rewards 
      WHERE is_active = true 
      ORDER BY RANDOM()
      LIMIT 3
    `)

    const rewards = rewardsResult.rows
    
    // Group by category
    const byCategory: Record<string, any[]> = {}
    rewards.forEach(reward => {
      if (!byCategory[reward.category]) {
        byCategory[reward.category] = []
      }
      byCategory[reward.category]!.push(reward)
    })

    res.json({
      success: true,
      data: {
        all: rewards,
        by_category: byCategory
      },
      message: 'Daily rewards retrieved successfully'
    })
    return
  } catch (error) {
    console.error('❌ Error fetching rewards:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Purchase reward with points (moved from line 5183 to fix route ordering)
app.post('/api/points/rewards/:rewardId/purchase', async (req, res) => {
  let client
  try {
    const { rewardId } = req.params
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'User ID is required'
      })
    }

    client = await pool.connect()
    await client.query('BEGIN')

    // Get reward details
    const rewardResult = await client.query('SELECT * FROM rewards WHERE id = $1 AND is_active = true', [rewardId])
    if (rewardResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        success: false,
        error: 'Reward not found',
        message: 'Reward does not exist or is inactive'
      })
    }

    const reward = rewardResult.rows[0]

    // Check if reward is in stock
    if (reward.stock_quantity !== null && reward.stock_quantity <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'Out of stock',
        message: 'This reward is currently out of stock'
      })
    }

    // Get user points
    const userResult = await client.query('SELECT points FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      })
    }

    const userPoints = userResult.rows[0].points

    // Check if user has enough points
    if (userPoints < reward.points_cost) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        error: 'Insufficient points',
        message: `You need ${reward.points_cost} points but have ${userPoints} points`
      })
    }

    // Deduct points from user (REAL-TIME DEDUCTION)
    await client.query(
      'UPDATE users SET points = points - $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [reward.points_cost, userId]
    )

    // Update stock if applicable
    if (reward.stock_quantity !== null) {
      await client.query(
        'UPDATE rewards SET stock_quantity = stock_quantity - 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1',
        [rewardId]
      )
    }

    // Create reward purchase record
    const purchaseId = `reward-purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = reward.duration_days ? new Date(Date.now() + (reward.duration_days * 24 * 60 * 60 * 1000)) : null

    await client.query(`
      INSERT INTO reward_purchases (
        id, "userId", reward_id, points_spent, expires_at, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [purchaseId, userId, rewardId, reward.points_cost, expiresAt])

    // Record points transaction
    const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(`
      INSERT INTO points_transactions (
        id, "userId", amount, type, source, description, reference_id
      ) VALUES ($1, $2, $3, 'spent', 'reward_purchase', $4, $5)
    `, [
      transactionId,
      userId,
      -reward.points_cost,
      `Purchased: ${reward.name}`,
      rewardId
    ])

    await client.query('COMMIT')

    res.json({
      success: true,
      data: {
        purchase_id: purchaseId,
        reward_name: reward.name,
        points_spent: reward.points_cost,
        remaining_points: userPoints - reward.points_cost,
        expires_at: expiresAt
      },
      message: `Successfully purchased ${reward.name}!`
    })
    return

  } catch (error) {
    if (client) await client.query('ROLLBACK')
    console.error('❌ Error purchasing reward:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to purchase reward',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Simple points test endpoint (moved from line 4663)
app.get('/api/points-simple', async (_req, res) => {
  res.json({
    success: true,
    message: 'Simple points endpoint working!',
    timestamp: new Date().toISOString()
  })
})

// Get user tasks (moved from line 4782)
app.get('/api/points/tasks/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    // Get all tasks with user completion data
    const tasksResult = await client.query(`
      SELECT 
        t.*,
        COALESCE(ut.completion_count, 0) as user_completion_count,
        COALESCE(ut.total_points_earned, 0) as user_points_earned,
        CASE 
          WHEN t.task_type = 'one-time' AND COALESCE(ut.completion_count, 0) >= 1 THEN true
          WHEN t.max_completions IS NOT NULL AND COALESCE(ut.completion_count, 0) >= t.max_completions THEN true
          ELSE false
        END as is_completed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut."userId" = $1
      WHERE t.is_active = true
      ORDER BY t.order_priority ASC, t."createdAt" ASC
      LIMIT 5
    `, [userId])

    const tasks = tasksResult.rows

    res.json({
      success: true,
      data: tasks,
      message: 'Daily tasks retrieved successfully'
    })
    return
  } catch (error) {
    console.error('❌ Error fetching tasks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Final test endpoint
app.get('/api/final-test', (_req, res) => {
  res.json({
    success: true,
    message: 'Final test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    pointsSystem: 'enabled',
    deployment: 'final'
  })
})

// Test API endpoint
app.get('/api/test', (_req, res) => {
  res.json({
    message: 'Courtside Backend API is running!',
    timestamp: new Date().toISOString()
  })
})

// Test database connection endpoint
app.get('/api/test-db', async (_req, res) => {
  let client
  try {
    // Get a client from the pool
    client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result.rows[0].now,
      environment: process.env['NODE_ENV']
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env['NODE_ENV'],
      hasDbUrl: !!process.env['DATABASE_URL']
    })
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release()
    }
  }
})

// Database migration endpoint
app.post('/api/migrate', async (_req, res) => {
  let client
  try {
    console.log('🔄 Starting database migration...')
    console.log('📊 DATABASE_URL exists:', !!process.env['DATABASE_URL'])
    console.log('📊 NODE_ENV:', process.env['NODE_ENV'])
    
    console.log('🔄 Attempting to connect to database...')
    client = await pool.connect()

    // Create tables
    const createTables = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "telegramId" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT,
        "username" TEXT,
        "photoUrl" TEXT,
        "languageCode" TEXT,
        "isPremium" BOOLEAN NOT NULL DEFAULT false,
        "credits" INTEGER NOT NULL DEFAULT 150,
        "points" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );

      -- Create courts table
      CREATE TABLE IF NOT EXISTS "courts" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "sport" TEXT NOT NULL,
        "pricePerHour" DECIMAL(10,2) NOT NULL,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
      );

      -- Create timeSlots table
      CREATE TABLE IF NOT EXISTS "timeSlots" (
        "id" TEXT NOT NULL,
        "courtId" TEXT NOT NULL,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "price" DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "timeSlots_pkey" PRIMARY KEY ("id")
      );

      -- Create bookings table
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "courtId" TEXT NOT NULL,
        "timeSlotId" TEXT NOT NULL,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "totalPrice" DECIMAL(10,2) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'confirmed',
        "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
        "paymentTrackingId" TEXT,
        "paymentMethod" TEXT,
        "paymentDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
      );

      -- Add payment tracking columns if they don't exist (for existing databases)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'paymentTrackingId') THEN
          ALTER TABLE "bookings" ADD COLUMN "paymentTrackingId" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'paymentMethod') THEN
          ALTER TABLE "bookings" ADD COLUMN "paymentMethod" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'paymentDate') THEN
          ALTER TABLE "bookings" ADD COLUMN "paymentDate" TIMESTAMP(3);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'modificationCount') THEN
          ALTER TABLE "bookings" ADD COLUMN "modificationCount" INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;

      -- Create payments table
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" TEXT NOT NULL,
        "bookingId" TEXT NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'USD',
        "status" TEXT NOT NULL DEFAULT 'pending',
        "paymentMethod" TEXT,
        "transactionId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
      );

      -- Create shortUrls table
      CREATE TABLE IF NOT EXISTS "shortUrls" (
        "id" TEXT NOT NULL,
        "originalUrl" TEXT NOT NULL,
        "shortCode" TEXT NOT NULL,
        "userId" TEXT,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "shortUrls_pkey" PRIMARY KEY ("id")
      );

      -- Create booking analytics table for popular time slots
      CREATE TABLE IF NOT EXISTS "bookingAnalytics" (
        "id" TEXT NOT NULL,
        "courtId" TEXT NOT NULL,
        "dayOfWeek" INTEGER NOT NULL,
        "hourOfDay" INTEGER NOT NULL,
        "bookingCount" INTEGER NOT NULL DEFAULT 0,
        "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "bookingAnalytics_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "unique_time_slot" UNIQUE ("courtId", "dayOfWeek", "hourOfDay")
      );

      -- Create promo codes table
      CREATE TABLE IF NOT EXISTS "promoCodes" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "discountType" TEXT NOT NULL,
        "discountValue" DECIMAL(10,2) NOT NULL,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "promoCodes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "unique_promo_code" UNIQUE ("code")
      );

      -- Create notifications table
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "bookingId" TEXT,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "scheduledFor" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      );

      -- Create credit purchases table
      CREATE TABLE IF NOT EXISTS "credit_purchases" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "package_id" TEXT NOT NULL,
        "amount_usd" DECIMAL(10,2) NOT NULL,
        "credits_amount" INTEGER NOT NULL,
        "bonus_credits" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "payment_proof_url" TEXT,
        "admin_notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "credit_purchases_pkey" PRIMARY KEY ("id")
      );

      -- Create credit transactions table for tracking all credit movements
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "reference_id" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
      );

      -- Create tasks table for defining available tasks
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "points_reward" INTEGER NOT NULL,
        "category" TEXT NOT NULL,
        "task_type" TEXT NOT NULL, -- one-time, repeatable, daily, weekly
        "max_completions" INTEGER, -- NULL for unlimited
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "icon" TEXT,
        "order_priority" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
      );

      -- Create rewards table for shop items
      CREATE TABLE IF NOT EXISTS "rewards" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "points_cost" INTEGER NOT NULL,
        "category" TEXT NOT NULL,
        "reward_type" TEXT NOT NULL, -- discount, voucher, feature, merchandise
        "reward_value" DECIMAL(10,2), -- discount amount or monetary value
        "duration_days" INTEGER, -- for temporary rewards like priority access
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "icon" TEXT,
        "image_url" TEXT,
        "stock_quantity" INTEGER, -- NULL for unlimited
        "order_priority" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
      );

      -- Create user tasks table for tracking completion
      CREATE TABLE IF NOT EXISTS "user_tasks" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "task_id" TEXT NOT NULL,
        "completion_count" INTEGER NOT NULL DEFAULT 0,
        "last_completed" TIMESTAMP(3),
        "total_points_earned" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "unique_user_task" UNIQUE ("userId", "task_id")
      );

      -- Create points transactions table for tracking all point movements
      CREATE TABLE IF NOT EXISTS "points_transactions" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "amount" INTEGER NOT NULL,
        "type" TEXT NOT NULL, -- earned, spent, bonus, refund
        "source" TEXT NOT NULL, -- task_completion, reward_purchase, admin_adjustment
        "description" TEXT NOT NULL,
        "reference_id" TEXT, -- task_id, reward_id, booking_id, etc
        "metadata" TEXT, -- JSON string for additional data
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
      );

      -- Create reward purchases table for tracking redemptions
      CREATE TABLE IF NOT EXISTS "reward_purchases" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "reward_id" TEXT NOT NULL,
        "points_spent" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active', -- active, used, expired, refunded
        "expires_at" TIMESTAMP(3),
        "used_at" TIMESTAMP(3),
        "metadata" TEXT, -- JSON for reward-specific data
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "reward_purchases_pkey" PRIMARY KEY ("id")
      );
    `

    await client.query(createTables)
    console.log('✅ Database tables created successfully')

    // Insert sample data
    const insertSampleData = `
      -- Insert sample courts for Courtside
      INSERT INTO courts (id, name, description, sport, "pricePerHour", "isAvailable", "createdAt", "updatedAt") 
      VALUES 
        -- 8 Badminton Courts at $12/hour
        ('badminton-1', 'Badminton Court 1', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-2', 'Badminton Court 2', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-3', 'Badminton Court 3', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-4', 'Badminton Court 4', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-5', 'Badminton Court 5', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-6', 'Badminton Court 6', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-7', 'Badminton Court 7', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('badminton-8', 'Badminton Court 8', 'Professional badminton court with premium flooring', 'badminton', 12.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        -- 4 Pickleball Courts at $14/hour
        ('pickleball-1', 'Pickleball Court 1', 'Professional pickleball court with proper markings', 'pickleball', 14.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('pickleball-2', 'Pickleball Court 2', 'Professional pickleball court with proper markings', 'pickleball', 14.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('pickleball-3', 'Pickleball Court 3', 'Professional pickleball court with proper markings', 'pickleball', 14.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('pickleball-4', 'Pickleball Court 4', 'Professional pickleball court with proper markings', 'pickleball', 14.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `

    await client.query(insertSampleData)
    console.log('✅ Sample data inserted successfully')

    // Insert sample tasks and rewards
    const insertPointsData = `
      -- Insert sample tasks
      INSERT INTO tasks (id, name, description, points_reward, category, task_type, max_completions, icon, order_priority, "createdAt", "updatedAt") 
      VALUES 
        -- One-time tasks
        ('first-booking', 'Make Your First Booking', 'Complete your very first court booking', 100, 'booking', 'one-time', 1, '🎯', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('complete-profile', 'Complete Your Profile', 'Fill in all your profile information', 75, 'profile', 'one-time', 1, '👤', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('upload-photo', 'Upload Profile Photo', 'Add a profile picture to your account', 50, 'profile', 'one-time', 1, '📸', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Repeatable tasks
        ('complete-booking', 'Complete a Booking', 'Successfully complete a court booking', 25, 'booking', 'repeatable', NULL, '🏸', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('refer-friend', 'Refer a Friend', 'Invite a friend to join Courtside', 200, 'social', 'repeatable', NULL, '👥', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('write-review', 'Write a Review', 'Leave a review for a court or facility', 30, 'social', 'repeatable', 5, '⭐', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('share-booking', 'Share Your Booking', 'Share your booking on social media', 15, 'social', 'repeatable', 3, '📱', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Daily tasks
        ('daily-login', 'Daily Check-in', 'Open the app and check in daily', 10, 'engagement', 'daily', NULL, '📅', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('view-courts', 'Explore Courts', 'Browse available courts (max 3 times daily)', 5, 'engagement', 'daily', 3, '🔍', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Special tasks
        ('early-booking', 'Early Bird', 'Book a court for 6-9 AM time slot', 35, 'booking', 'repeatable', NULL, '🌅', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('peak-booking', 'Peak Hour Player', 'Book during peak hours (6-9 PM)', 20, 'booking', 'repeatable', NULL, '🔥', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('booking-master', 'Booking Master', 'Complete 10 total bookings', 500, 'booking', 'one-time', 1, '👑', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('booking-expert', 'Booking Expert', 'Complete 25 total bookings', 1000, 'booking', 'one-time', 1, '🏆', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('profile-complete', 'Complete Profile', 'Add photo and fill all profile fields', 75, 'profile', 'one-time', 1, '👤', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('credit-purchase', 'Credit Buyer', 'Purchase your first credit package', 150, 'engagement', 'one-time', 1, '💳', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('weekly-active', 'Weekly Active', 'Use the app for 7 consecutive days', 50, 'engagement', 'weekly', NULL, '📅', 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('share-app', 'Share the App', 'Share Courtside with friends', 25, 'social', 'repeatable', 10, '📱', 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('refer-friend', 'Refer a Friend', 'Invite a friend who joins', 200, 'social', 'repeatable', NULL, '👥', 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('write-review', 'Write a Review', 'Leave a review for a court', 30, 'social', 'repeatable', 5, '⭐', 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('view-courts', 'Explore Courts', 'Browse available courts', 5, 'engagement', 'daily', 3, '🔍', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;

      -- Insert sample rewards
      INSERT INTO rewards (id, name, description, points_cost, category, reward_type, reward_value, duration_days, icon, order_priority, "createdAt", "updatedAt") 
      VALUES 
        -- Booking discounts
        ('discount-2', '$2 Booking Discount', 'Get $2 off your next booking', 200, 'discounts', 'discount', 2.00, NULL, '💰', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('discount-5', '$5 Booking Discount', 'Get $5 off your next booking', 450, 'discounts', 'discount', 5.00, NULL, '💰', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('discount-10', '$10 Booking Discount', 'Get $10 off your next booking', 850, 'discounts', 'discount', 10.00, NULL, '💰', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Vouchers
        ('free-hour', 'Free 1-Hour Booking', 'Completely free 1-hour court booking', 1200, 'vouchers', 'voucher', 12.00, 30, '🎁', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('weekend-discount', '25% Off Weekend Booking', 'Get 25% off any weekend booking', 600, 'vouchers', 'discount', 0.25, 7, '🎯', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Premium features
        ('priority-booking', '24h Priority Booking', 'Skip the queue and book immediately', 400, 'features', 'feature', NULL, 1, '⚡', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('court-upgrade', 'Free Court Upgrade', 'Automatic upgrade to premium court when available', 500, 'features', 'feature', NULL, 7, '⬆️', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('no-cancel-fee', 'No Cancellation Fee', 'Cancel bookings without penalty for 30 days', 300, 'features', 'feature', NULL, 30, '🚫', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        -- Merchandise
        ('sticker-pack', 'Courtside Sticker Pack', 'Exclusive branded sticker collection', 250, 'merchandise', 'merchandise', NULL, NULL, '🏷️', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('water-bottle', 'Branded Water Bottle', 'Premium Courtside water bottle', 800, 'merchandise', 'merchandise', NULL, NULL, '🍶', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('t-shirt', 'Courtside T-Shirt', 'Official Courtside branded t-shirt', 1500, 'merchandise', 'merchandise', NULL, NULL, '👕', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('free-weekend', 'Free Weekend Booking', 'Get one free weekend booking', 800, 'vouchers', 'voucher', 15.00, 30, '🎁', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('priority-access', 'Priority Access Pass', 'Skip the queue for 1 week', 600, 'features', 'feature', NULL, 7, '⚡', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('court-upgrade', 'Free Court Upgrade', 'Automatic upgrade to premium court', 400, 'features', 'feature', NULL, 7, '⬆️', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('no-cancel-fee', 'No Cancellation Fee', 'Cancel bookings without penalty', 300, 'features', 'feature', NULL, 30, '🚫', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('early-access', 'Early Access Pass', 'Book courts 24 hours before others', 500, 'features', 'feature', NULL, 7, '🌅', 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('coach-session', 'Free Coach Session', '30-minute session with a coach', 2000, 'services', 'service', NULL, 60, '👨‍🏫', 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('equipment-rental', 'Free Equipment Rental', 'Rent rackets, balls, etc.', 300, 'services', 'service', NULL, 7, '🏸', 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('locker-access', 'Premium Locker Access', 'Access to premium lockers', 200, 'features', 'feature', NULL, 30, '🔒', 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('refreshment-voucher', 'Refreshment Voucher', '$10 voucher for cafe', 400, 'vouchers', 'voucher', 10.00, 30, '☕', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `

    await client.query(insertPointsData)
    console.log('✅ Sample tasks and rewards inserted successfully')

    // No sample bookings - start with clean slate
    console.log('✅ Sample bookings skipped - clean database')

    console.log('✅ Database migration completed successfully')

    res.json({
      success: true,
      message: 'Database migration completed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release()
    }
  }
})

// API Routes
app.get('/api/test-new', (_req, res) => {
  res.json({
    success: true,
    message: "POST /api/bookings should be available now!",
    timestamp: new Date().toISOString(),
    version: "1.0.2"
  })
})

// Get available time slots for a court on a specific date
app.get('/api/timeslots/:courtId/availability', async (req, res) => {
  let client
  try {
    const { courtId } = req.params
    const { date } = req.query

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Missing date parameter',
        message: 'Please provide a date parameter'
      })
    }

    client = await pool.connect()

    // Get existing bookings for this court on this date
    const existingBookings = await client.query(`
      SELECT b."startTime", b."endTime", b."status"
      FROM bookings b
      WHERE b."courtId" = $1 
      AND DATE(b."startTime") = $2
      AND b."status" IN ('confirmed', 'pending')
    `, [courtId, date])

    // Generate available time slots (7 AM to 10 PM, 1-hour slots)
    const availableSlots = []
    const startHour = 7
    const endHour = 22  // Close at 22:00, so last booking slot is 21:00

    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = `${date}T${hour.toString().padStart(2, '0')}:00:00`
      const slotEnd = `${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`
      
      // Check if this slot conflicts with existing bookings
      const isAvailable = !existingBookings.rows.some(booking => {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)
        const slotStartTime = new Date(slotStart)
        const slotEndTime = new Date(slotEnd)
        
        return (slotStartTime < bookingEnd && slotEndTime > bookingStart)
      })

      availableSlots.push({
        id: `slot-${date}-${hour}`,
        startTime: slotStart,
        endTime: slotEnd,
        hour: hour,
        isAvailable: isAvailable,
        formattedTime: `${hour.toString().padStart(2, '0')}:00`
      })
    }

    res.json({
      success: true,
      data: {
        courtId,
        date,
        availableSlots,
        totalSlots: availableSlots.length,
        availableCount: availableSlots.filter(slot => slot.isAvailable).length
      },
      message: 'Time slots retrieved successfully'
    })
    return
  } catch (error) {
    console.error('❌ Error getting time slots:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get time slots',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get available time slots for multiple courts
app.get('/api/timeslots/availability', async (req, res) => {
  let client
  try {
    const { date, courts } = req.query

    if (!date || !courts) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Please provide date and courts parameters'
      })
    }

    const courtIds = Array.isArray(courts) ? courts : [courts]
    client = await pool.connect()

    // Get existing bookings for all courts on this date
    const existingBookings = await client.query(`
      SELECT b."courtId", b."startTime", b."endTime", b."status"
      FROM bookings b
      WHERE b."courtId" = ANY($1)
      AND DATE(b."startTime") = $2
      AND b."status" IN ('confirmed', 'pending')
    `, [courtIds, date])

    // Generate available time slots (7 AM to 10 PM, 1-hour slots)
    const availableSlots = []
    const startHour = 7
    const endHour = 22  // Close at 22:00, so last booking slot is 21:00

    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = `${date}T${hour.toString().padStart(2, '0')}:00:00`
      const slotEnd = `${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`
      
      // Check availability for each court
      const courtAvailability: Record<string, boolean> = {}
      
      for (const courtId of courtIds) {
        const courtBookings = existingBookings.rows.filter(booking => booking.courtId === courtId)
        
        const isAvailable = !courtBookings.some(booking => {
          const bookingStart = new Date(booking.startTime)
          const bookingEnd = new Date(booking.endTime)
          const slotStartTime = new Date(slotStart)
          const slotEndTime = new Date(slotEnd)
          
          return (slotStartTime < bookingEnd && slotEndTime > bookingStart)
        })

        courtAvailability[courtId as string] = isAvailable
      }

      availableSlots.push({
        id: `slot-${date}-${hour}`,
        startTime: slotStart,
        endTime: slotEnd,
        hour: hour,
        courtAvailability,
        formattedTime: `${hour.toString().padStart(2, '0')}:00`
      })
    }

    res.json({
      success: true,
      data: {
        date,
        courts: courtIds,
        availableSlots,
        totalSlots: availableSlots.length
      },
      message: 'Time slots retrieved successfully'
    })
    return
  } catch (error) {
    console.error('❌ Error getting time slots:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get time slots',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.get('/api/courts', async (req, res) => {
  let client
  try {
    const { sport } = req.query
    
    client = await pool.connect()
    
    let query = 'SELECT * FROM courts'
    const queryParams = []
    
    if (sport) {
      query += ' WHERE sport = $1'
      queryParams.push(sport as string)
    }
    
    query += ' ORDER BY name'
    
    const result = await client.query(query, queryParams)
    res.json({
      success: true,
      data: result.rows
    })
    return
  } catch (error) {
    console.error('❌ Error fetching courts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courts',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get courts with individual availability for a specific date and time
app.get('/api/courts/availability', async (req, res) => {
  let client
  try {
    const { sport, date, time } = req.query
    
    if (!sport || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Please provide sport, date, and time parameters'
      })
    }
    
    client = await pool.connect()
    
    // Get all courts for the sport
    const courtsResult = await client.query('SELECT * FROM courts WHERE sport = $1 ORDER BY name', [sport])
    const courts = courtsResult.rows
    
    // Get existing bookings for these courts on the specified date and time
    const startTime = `${date}T${time}:00`
    const endTime = `${date}T${time}:59`
    
    const existingBookings = await client.query(`
      SELECT b."courtId", b."startTime", b."endTime", b."status"
      FROM bookings b
      WHERE b."courtId" = ANY($1)
      AND b."startTime" <= $2 
      AND b."endTime" > $3
      AND b."status" IN ('confirmed', 'pending')
    `, [courts.map(c => c.id), endTime, startTime])
    
    // Update courts with availability information
    const courtsWithAvailability = courts.map(court => {
      const courtBookings = existingBookings.rows.filter(booking => booking.courtId === court.id)
      const isAvailable = courtBookings.length === 0
      
      return {
        ...court,
        isAvailable: isAvailable,
        bookingCount: courtBookings.length
      }
    })
    
    res.json({
      success: true,
      data: courtsWithAvailability
    })
    return
  } catch (error) {
    console.error('❌ Error fetching courts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courts',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Court availability endpoint
app.get('/api/courts/:courtId/availability', async (req, res) => {
  let client
  try {
    const { courtId } = req.params
    const { date } = req.query

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter required',
        message: 'Please provide a date parameter'
      })
    }

    client = await pool.connect()

    // Get court details
    const courtResult = await client.query('SELECT * FROM courts WHERE id = $1', [courtId])
    if (courtResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Court not found',
        message: 'Court with the specified ID does not exist'
      })
    }

    const court = courtResult.rows[0]

    // Get bookings for the court on the specified date
    const bookingsResult = await client.query(`
      SELECT b.*, u."firstName", u."lastName"
      FROM bookings b
      JOIN users u ON b."userId" = u.id
      WHERE b."courtId" = $1 
      AND DATE(b."startTime") = $2
      AND b.status IN ('confirmed', 'pending')
      ORDER BY b."startTime"
    `, [courtId, date])

    // Generate time slots (7 AM to 9 PM, 1-hour slots)
    const timeSlots = []
    const startHour = 7
    const endHour = 21  // Close at 21:00, so last booking slot is 20:00

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`)
      const endTime = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`)

      // Check if this time slot is booked
      const conflictingBooking = bookingsResult.rows.find(booking => {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)
        return (startTime < bookingEnd && endTime > bookingStart)
      })

      timeSlots.push({
        hour,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isAvailable: !conflictingBooking,
        formattedTime: `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`,
        booking: conflictingBooking ? {
          id: conflictingBooking.id,
          userId: conflictingBooking.userId,
          userName: `${conflictingBooking.firstName} ${conflictingBooking.lastName}`,
          sport: conflictingBooking.sport,
          status: conflictingBooking.status
        } : null
      })
    }

    res.json({
      success: true,
      data: {
        court,
        date,
        timeSlots,
        totalSlots: timeSlots.length,
        availableSlots: timeSlots.filter(slot => slot.isAvailable).length,
        bookedSlots: timeSlots.filter(slot => !slot.isAvailable).length
      }
    })
    return
  } catch (error) {
    console.error('❌ Error fetching court availability:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.get('/api/bookings', async (req, res) => {
  let client
  try {
    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token (format: jwt-userId-random)
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()
    
    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Get status filter from query params
    const { status } = req.query
    
    let query = `
      SELECT 
        b.*,
        c.name as courtName,
        c.sport as courtSport
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      WHERE b."userId" = $1
    `
    const queryParams = [userId]
    
    if (status) {
      query += ` AND b.status = $2`
      queryParams.push(status as string)
    }
    
    query += ` ORDER BY b."createdAt" DESC`

    const result = await client.query(query, queryParams)
    res.json({
      success: true,
      data: result.rows
    })
    return
  } catch (error) {
    console.error('❌ Error fetching bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Create new booking
app.post('/api/bookings', async (req, res) => {
  let client
  try {
    const { sport, date, time, duration, courts, paymentMethod } = req.body

    // Validate required fields
    if (!sport || !date || !time || !duration || !courts || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide sport, date, time, duration, courts, and paymentMethod'
      })
    }

    // Validate courts array
    if (!Array.isArray(courts) || courts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid courts selection',
        message: 'Please select at least one court'
      })
    }

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    // The user ID contains hyphens, so we need to reconstruct it
    const userId = tokenParts.slice(1, -1).join('-') // user ID from token (everything except jwt prefix and random suffix)
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    const user = userResult.rows[0]

    // Check if user has enough credits for payment (1 credit = $1)
    if (paymentMethod === 'credits') {
      const pricePerHour = sport === 'badminton' ? 12 : 
                          sport === 'pickleball' ? 14 : 12
      const totalPrice = pricePerHour * duration * courts.length
      
      if (user.credits < totalPrice) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credits',
          message: `You need ${totalPrice} credits but have ${user.credits} credits`
        })
      }
    }

    // Generate booking ID
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Generate shorter, more readable booking ID
    const shortBookingId = `B-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Calculate total price
    const pricePerHour = sport === 'badminton' ? 12 : 
                        sport === 'pickleball' ? 14 : 12
    const totalPrice = pricePerHour * duration * courts.length

    // Calculate start and end times (server now runs in Cambodia timezone)
    console.log(`🇰🇭 Processing booking for Cambodia local time: ${date}T${time}:00`)
    
    // Parse the date and time (server is already in Cambodia timezone)
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    
    // Create date directly (server timezone is already Cambodia)
    const cambodiaTime = new Date(year, month - 1, day, hour, minute)
    
    console.log(`🔧 DEBUG: Input date=${date}, time=${time}`)
    console.log(`🔧 DEBUG: Parsed year=${year}, month=${month}, day=${day}, hour=${hour}, minute=${minute}`)
    console.log(`🔧 DEBUG: Cambodia time=${cambodiaTime.toISOString()}`)
    
    const endTime = new Date(cambodiaTime.getTime() + duration * 60 * 60 * 1000)
    
    console.log(`🇰🇭 Cambodia local time: ${cambodiaTime.toISOString()}`)

    // Check if booking time is too soon (30-minute buffer)
    // Get current time (server is already in Cambodia timezone)
    const now = new Date()
    
    const bufferMinutes = 30
    const earliestBookingTime = new Date(now.getTime() + (bufferMinutes * 60 * 1000))
    
    console.log(`🇰🇭 Current time: ${now.toISOString()}`)
    console.log(`📅 Booking time: ${cambodiaTime.toISOString()}`)
    console.log(`⏰ Earliest allowed: ${earliestBookingTime.toISOString()}`)
    
    if (cambodiaTime <= earliestBookingTime) {
      console.log(`🚫 Booking rejected: Too soon (${bufferMinutes}min buffer required)`)
      return res.status(400).json({
        success: false,
        error: 'BOOKING_TOO_SOON',
        message: `Bookings must be made at least ${bufferMinutes} minutes in advance`
      })
    }

    // Check for booking conflicts (including user's own bookings)
    const conflictCheck = await client.query(`
      SELECT id, "startTime", "endTime", status, "userId"
      FROM bookings 
      WHERE "courtId" = $1 
      AND status IN ('confirmed', 'pending')
      AND (
        ($2 < "endTime" AND $3 > "startTime")
      )
    `, [courts[0], cambodiaTime, endTime])

    if (conflictCheck.rows.length > 0) {
      // Check if the conflict is with the user's own booking
      const userConflict = conflictCheck.rows.find(booking => booking.userId === userId)
      
      if (userConflict) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_BOOKING',
          message: 'You already have a booking for this time slot',
          conflicts: conflictCheck.rows
        })
      } else {
        return res.status(409).json({
          success: false,
          error: 'BOOKING_CONFLICT',
          message: 'This time slot is no longer available',
          conflicts: conflictCheck.rows
        })
      }
    }

    // Create booking record
    const insertBooking = `
      INSERT INTO bookings (
        id, "userId", "courtId", "timeSlotId", "startTime", "endTime", 
        "totalPrice", "status", "paymentStatus", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `

    // Generate time slot ID
    const timeSlotId = `timeslot-${Date.now()}`

    await client.query(insertBooking, [
      shortBookingId,
      userId,
      courts[0], // Use first court for now
      timeSlotId,
      cambodiaTime,
      endTime,
      totalPrice,
      'pending',
      'pending'
    ])

    // Create payment record
    const insertPayment = `
      INSERT INTO payments (
        id, "bookingId", amount, currency, status, "paymentMethod", 
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `

    const paymentId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(insertPayment, [
      paymentId,
      bookingId,
      totalPrice,
      'USD',
      'pending',
      paymentMethod
    ])

    // Create booking confirmation notification
    await createNotification(client, {
      userId,
      bookingId,
      type: 'confirmation',
      title: 'Booking Confirmed! ✅',
      message: `Your ${sport} court is booked for ${cambodiaTime.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Phnom_Penh'
      })} at ${cambodiaTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Phnom_Penh'
      })}, Court ${courts[0]}`
    })

    // Booking reminders removed - keeping other notifications

    // Create payment notification
    await createPaymentNotification(client, {
      userId,
      bookingId,
      status: 'pending',
      amount: totalPrice
    })

    // If credits were used, create credits notification
    if (paymentMethod === 'credits') {
      await createCreditsNotification(client, {
        userId,
        bookingId,
        type: 'spent',
        amount: totalPrice,
        reason: 'booking payment'
      })
    }

    // 🎯 AUTOMATIC POINTS AWARDING
    await awardPointsForBooking(client, userId, bookingId, sport)

    res.status(201).json({
      success: true,
      data: {
        id: shortBookingId,
        sport,
        date,
        time,
        duration,
        courts,
        totalPrice,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod,
        paymentId,
        createdAt: new Date().toISOString()
      },
      message: 'Booking created successfully'
    })

    // Broadcast court update
    broadcastCourtUpdate(courts[0], {
      type: 'BOOKING_CREATED',
      booking: {
        id: shortBookingId,
        sport,
        startTime: cambodiaTime,
        endTime,
        status: 'pending'
      },
      courtId: courts[0]
    })

    return

  } catch (error) {
    console.error('❌ Error creating booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Court availability endpoints
app.get('/api/courts/:courtId/availability/:date', async (req, res) => {
  let client
  try {
    const { courtId, date } = req.params

    client = await pool.connect()

    // Get court details
    const courtResult = await client.query('SELECT * FROM courts WHERE id = $1', [courtId])
    if (courtResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Court not found',
        message: 'Court with the specified ID does not exist'
      })
    }

    // Get existing bookings for this court on this date
    const startOfDay = new Date(`${date}T00:00:00`)
    const endOfDay = new Date(`${date}T23:59:59`)

    const bookingsResult = await client.query(`
      SELECT "startTime", "endTime", status
      FROM bookings 
      WHERE "courtId" = $1 
      AND "startTime" >= $2 
      AND "startTime" <= $3
      AND status IN ('confirmed', 'pending')
    `, [courtId, startOfDay, endOfDay])

    // Generate time slots from 9 AM to 9 PM
    const timeSlots = []
    for (let hour = 9; hour <= 21; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      const startTime = new Date(`${date}T${time}:00+07:00`) // Cambodia timezone
      const endTime = new Date(`${date}T${(hour + 1).toString().padStart(2, '0')}:00+07:00`) // Cambodia timezone

      // Check if this time slot is available
      const isBooked = bookingsResult.rows.some(booking => {
        const bookingStart = new Date(booking.startTime)
        const bookingEnd = new Date(booking.endTime)
        return startTime < bookingEnd && endTime > bookingStart
      })

      timeSlots.push({
        id: `slot-${date}-${hour}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        hour,
        isAvailable: !isBooked,
        formattedTime: time
      })
    }

    res.json({
      success: true,
      data: {
        courtId,
        date,
        availableSlots: timeSlots
      },
      message: 'Court availability retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error getting court availability:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get court availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Court management endpoints (admin only)
app.post('/api/courts', async (req, res) => {
  let client
  try {
    const { name, sport, description, hourlyRate, isActive } = req.body

    // Validate required fields
    if (!name || !sport) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide name and sport'
      })
    }

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists and is admin (for now, we'll allow any authenticated user)
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Generate court ID
    const courtId = `court-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create court record
    const insertCourt = `
      INSERT INTO courts (
        id, name, sport, description, "pricePerHour", "isAvailable", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `

    const result = await client.query(insertCourt, [
      courtId,
      name,
      sport,
      description || null,
      hourlyRate || 12,
      isActive !== false // Default to true
    ])

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Court created successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error creating court:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create court',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/courts/:courtId', async (req, res) => {
  let client
  try {
    const { courtId } = req.params
    const { name, sport, description, hourlyRate, isActive } = req.body

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Check if court exists
    const courtResult = await client.query('SELECT * FROM courts WHERE id = $1', [courtId])
    if (courtResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Court not found',
        message: 'Court with the specified ID does not exist'
      })
    }

    // Update court
    const updateCourt = `
      UPDATE courts 
      SET name = COALESCE($1, name),
          sport = COALESCE($2, sport),
          description = COALESCE($3, description),
          "pricePerHour" = COALESCE($4, "pricePerHour"),
          "isAvailable" = COALESCE($5, "isAvailable"),
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `

    const result = await client.query(updateCourt, [
      name,
      sport,
      description,
      hourlyRate,
      isActive,
      courtId
    ])

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Court updated successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error updating court:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update court',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Authentication endpoints
app.post('/api/auth/telegram', async (req, res) => {
  let client
  try {
    const { telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium } = req.body

    // Validate required fields
    if (!telegramId || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide telegramId and firstName'
      })
    }

    client = await pool.connect()

    // Check if user already exists
    const existingUser = await client.query('SELECT * FROM users WHERE "telegramId" = $1', [telegramId])
    
    let user
    if (existingUser.rows.length > 0) {
      // User exists, update last login
      user = existingUser.rows[0]
      await client.query(
        'UPDATE users SET "updatedAt" = CURRENT_TIMESTAMP WHERE "telegramId" = $1',
        [telegramId]
      )
    } else {
      // Create new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const insertUser = `
        INSERT INTO users (
          id, "telegramId", "firstName", "lastName", username, "photoUrl", 
          "languageCode", "isPremium", credits, points, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `

      const result = await client.query(insertUser, [
        userId,
        telegramId,
        firstName,
        lastName || null,
        username || null,
        photoUrl || null,
        languageCode || null,
        isPremium || false,
        150, // Default credits
        0    // Default points
      ])
      
      user = result.rows[0]
    }

    // Generate JWT token with user ID embedded
    const token = `jwt-${user.id}-${Math.random().toString(36).substr(2, 9)}`

    res.json({
      success: true,
      data: {
        user,
        token,
        message: existingUser.rows.length > 0 ? 'User logged in successfully' : 'User created successfully'
      }
    })
    return

  } catch (error) {
    console.error('❌ Error in Telegram authentication:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.get('/api/auth/me', async (req, res) => {
  let client
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    // For now, we'll use a simple token format: jwt-timestamp-random
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Extract user ID from token
    // Token format: jwt-userId-random
    // The user ID contains hyphens, so we need to reconstruct it
    const userId = tokenParts.slice(1, -1).join('-') // user ID from token (everything except jwt prefix and random suffix)
    
    client = await pool.connect()
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
    return
  } catch (error) {
    console.error('❌ Error fetching current user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// User management endpoints
app.get('/api/users/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params
    
    client = await pool.connect()
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
    return
  } catch (error) {
    console.error('❌ Error fetching user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get user by Telegram ID (for frontend integration)
app.get('/api/users/telegram/:telegramId', async (req, res) => {
  let client
  try {
    const { telegramId } = req.params
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'Missing telegramId',
        message: 'Telegram ID is required'
      })
    }
    
    client = await pool.connect()
    const result = await client.query('SELECT * FROM users WHERE "telegramId" = $1', [telegramId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified Telegram ID does not exist'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
    return
  } catch (error) {
    console.error('❌ Error fetching user by Telegram ID:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})



app.post('/api/users', async (req, res) => {
  let client
  try {
    const { telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium } = req.body

    // Validate required fields
    if (!telegramId || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide telegramId and firstName'
      })
    }

    client = await pool.connect()

    // Generate user ID
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create user record
    const insertUser = `
      INSERT INTO users (
        id, "telegramId", "firstName", "lastName", username, "photoUrl", 
        "languageCode", "isPremium", credits, points, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `

    const result = await client.query(insertUser, [
      userId,
      telegramId,
      firstName,
      lastName || null,
      username || null,
      photoUrl || null,
      languageCode || null,
      isPremium || false,
      150, // Default credits
      0    // Default points
    ])

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error creating user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/users/:userId/credits', async (req, res) => {
  let client
  try {
    const { userId } = req.params
    const { credits, operation = 'add' } = req.body // operation: 'add' or 'subtract'

    if (typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credits amount',
        message: 'Credits must be a positive number'
      })
    }

    client = await pool.connect()

    // Get current user
    const userResult = await client.query('SELECT credits FROM users WHERE id = $1', [userId])
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    const currentCredits = userResult.rows[0].credits
    let newCredits

    if (operation === 'subtract') {
      if (currentCredits < credits) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credits',
          message: `User has ${currentCredits} credits but needs ${credits}`
        })
      }
      newCredits = currentCredits - credits
    } else {
      newCredits = currentCredits + credits
    }

    // Update user credits
    const updateResult = await client.query(
      'UPDATE users SET credits = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newCredits, userId]
    )

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Credits ${operation === 'subtract' ? 'subtracted' : 'added'} successfully`
    })
    return

  } catch (error) {
    console.error('❌ Error updating user credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user credits',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/users/:userId/points', async (req, res) => {
  let client
  try {
    const { userId } = req.params
    const { points, operation = 'add' } = req.body // operation: 'add' or 'subtract'

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid points amount',
        message: 'Points must be a positive number'
      })
    }

    client = await pool.connect()

    // Get current user
    const userResult = await client.query('SELECT points FROM users WHERE id = $1', [userId])
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    const currentPoints = userResult.rows[0].points
    let newPoints

    if (operation === 'subtract') {
      if (currentPoints < points) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient points',
          message: `User has ${currentPoints} points but needs ${points}`
        })
      }
      newPoints = currentPoints - points
    } else {
      newPoints = currentPoints + points
    }

    // Update user points
    const updateResult = await client.query(
      'UPDATE users SET points = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newPoints, userId]
    )

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Points ${operation === 'subtract' ? 'subtracted' : 'added'} successfully`
    })
    return

  } catch (error) {
    console.error('❌ Error updating user points:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user points',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Credit Purchase System - Option 2: Escalating Bonuses

// Get available credit packages
app.get('/api/credits/packages', async (_req, res) => {
  try {
    const packages = [
      { id: 'starter', price: 5, credits: 6, bonus: 1, description: 'Starter Pack' },
      { id: 'value', price: 10, credits: 13, bonus: 3, description: 'Value Pack' },
      { id: 'popular', price: 20, credits: 26, bonus: 6, description: 'Popular Pack' },
      { id: 'premium', price: 50, credits: 70, bonus: 20, description: 'Premium Pack' },
      { id: 'ultimate', price: 100, credits: 145, bonus: 45, description: 'Ultimate Pack' }
    ]

    res.json({
      success: true,
      data: packages,
      message: 'Credit packages retrieved successfully'
    })
  } catch (error) {
    console.error('❌ Error fetching credit packages:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit packages',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Create credit purchase request
app.post('/api/credits/purchase', async (req, res) => {
  let client
  try {
    const { userId, packageId, paymentProofUrl } = req.body

    if (!userId || !packageId || !paymentProofUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide userId, packageId, and paymentProofUrl'
      })
    }

    // Package definitions
    const packages = {
      starter: { price: 5, credits: 6, bonus: 1 },
      value: { price: 10, credits: 13, bonus: 3 },
      popular: { price: 20, credits: 26, bonus: 6 },
      premium: { price: 50, credits: 70, bonus: 20 },
      ultimate: { price: 100, credits: 145, bonus: 45 }
    }

    const selectedPackage = packages[packageId as keyof typeof packages]
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package',
        message: 'Please select a valid credit package'
      })
    }

    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Create credit purchase record
    const purchaseId = `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const purchaseResult = await client.query(`
      INSERT INTO credit_purchases (
        id, "userId", "package_id", "amount_usd", "credits_amount", 
        "bonus_credits", "payment_proof_url", "status", "createdAt", "updatedAt"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      purchaseId,
      userId, 
      packageId, 
      selectedPackage.price, 
      selectedPackage.credits, 
      selectedPackage.bonus, 
      paymentProofUrl
    ])

    const purchase = purchaseResult.rows[0]

    // Create notification for pending credit purchase
    await createNotification(client, {
      userId,
      type: 'credit_purchase_pending',
      title: '💎 Credit Purchase Pending',
      message: `Your $${selectedPackage.price} credit purchase is being reviewed. You'll receive ${selectedPackage.credits} credits once approved.`
    })

    // 🎯 AUTOMATIC POINTS AWARDING FOR CREDIT PURCHASE
    await awardPointsForCreditPurchase(client, userId, selectedPackage.price)

    res.json({
      success: true,
      data: purchase,
      message: 'Credit purchase request created successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error creating credit purchase:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create credit purchase',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get user's credit purchase history
app.get('/api/credits/purchases/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    const purchasesResult = await client.query(`
      SELECT * FROM credit_purchases 
      WHERE "userId" = $1 
      ORDER BY "createdAt" DESC
    `, [userId])

    res.json({
      success: true,
      data: purchasesResult.rows,
      message: 'Credit purchase history retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching credit purchases:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit purchases',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get user's credit transactions
app.get('/api/credits/transactions/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    const transactionsResult = await client.query(`
      SELECT * FROM credit_transactions 
      WHERE "userId" = $1 
      ORDER BY "createdAt" DESC
    `, [userId])

    res.json({
      success: true,
      data: transactionsResult.rows,
      message: 'Credit transactions retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching credit transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Admin: Approve/Reject credit purchase
app.put('/api/credits/purchases/:purchaseId/review', async (req, res) => {
  let client
  try {
    const { purchaseId } = req.params
    const { action, adminNotes } = req.body // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        message: 'Action must be either "approve" or "reject"'
      })
    }

    client = await pool.connect()

    // Get purchase details
    const purchaseResult = await client.query(`
      SELECT * FROM credit_purchases WHERE id = $1
    `, [purchaseId])

    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Purchase not found',
        message: 'Credit purchase with the specified ID does not exist'
      })
    }

    const purchase = purchaseResult.rows[0]

    if (purchase.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Purchase already processed',
        message: `This purchase has already been ${purchase.status}`
      })
    }

    // Begin transaction
    await client.query('BEGIN')

    try {
      if (action === 'approve') {
        // Add credits to user account
        const totalCredits = purchase.credits_amount + purchase.bonus_credits
        await client.query(`
          UPDATE users 
          SET credits = credits + $1, "updatedAt" = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [totalCredits, purchase.userId])

        // Record credit transaction
        const transactionId = `transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await client.query(`
          INSERT INTO credit_transactions (
            id, "userId", amount, type, description, reference_id
          ) VALUES ($1, $2, $3, 'purchase', $4, $5)
        `, [
          transactionId,
          purchase.userId,
          totalCredits,
          `Purchased ${purchase.credits_amount} credits + ${purchase.bonus_credits} bonus`,
          purchaseId
        ])

        // Create approval notification
        await createNotification(client, {
          userId: purchase.userId,
          type: 'credit_purchase_approved',
          title: '✅ Credits Added!',
          message: `Your $${purchase.amount_usd} purchase was approved! ${totalCredits} credits have been added to your account.`
        })
      } else {
        // Create rejection notification
        await createNotification(client, {
          userId: purchase.userId,
          type: 'credit_purchase_rejected',
          title: '❌ Purchase Rejected',
          message: `Your $${purchase.amount_usd} credit purchase was rejected. ${adminNotes || 'Please contact support for more details.'}`
        })
      }

      // Update purchase status
      await client.query(`
        UPDATE credit_purchases 
        SET status = $1, admin_notes = $2, "updatedAt" = CURRENT_TIMESTAMP 
        WHERE id = $3
      `, [action === 'approve' ? 'approved' : 'rejected', adminNotes, purchaseId])

      await client.query('COMMIT')

      res.json({
        success: true,
        message: `Credit purchase ${action}d successfully`
      })
      return

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('❌ Error reviewing credit purchase:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to review credit purchase',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Conflict checking endpoint
app.post('/api/bookings/check-conflicts', async (req, res) => {
  let client
  try {
    const { courtId, startTime, endTime } = req.body

    if (!courtId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide courtId, startTime, and endTime'
      })
    }

    client = await pool.connect()

    // Check for booking conflicts
    const conflictCheck = await client.query(`
      SELECT b.id, b."startTime", b."endTime", b.status, u."firstName", u."lastName"
      FROM bookings b
      JOIN users u ON b."userId" = u.id
      WHERE b."courtId" = $1 
      AND b.status IN ('confirmed', 'pending')
      AND (
        ($2 < b."endTime" AND $3 > b."startTime")
      )
      ORDER BY b."startTime"
    `, [courtId, startTime, endTime])

    res.json({
      success: true,
      data: {
        hasConflicts: conflictCheck.rows.length > 0,
        conflicts: conflictCheck.rows,
        requestedSlot: {
          courtId,
          startTime,
          endTime
        }
      }
    })
    return

  } catch (error) {
    console.error('❌ Error checking conflicts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check conflicts',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Booking management endpoints
app.post('/api/bookings/:bookingId/confirm', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Get booking details
    const bookingResult = await client.query(`
      SELECT b.*, c.name as courtName, c.sport as courtSport
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      WHERE b.id = $1 AND b."userId" = $2
    `, [bookingId, userId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking with the specified ID does not exist'
      })
    }

    const booking = bookingResult.rows[0]

    // Check if booking can be confirmed (within 2 hours of start time)
    const bookingTime = new Date(booking.startTime)
    const now = new Date()
    const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking < 2) {
      return res.status(400).json({
        success: false,
        error: 'Booking too close',
        message: 'Bookings can only be confirmed at least 2 hours before start time'
      })
    }

    // Update booking status to confirmed
    await client.query(
      'UPDATE bookings SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      ['confirmed', bookingId]
    )

    // Update payment status
    await client.query(
      'UPDATE payments SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "bookingId" = $2',
      ['completed', bookingId]
    )

    // Create payment success notification
    await createPaymentNotification(client, {
      userId,
      bookingId,
      status: 'success',
      amount: booking.totalPrice
    })

    // Award credits for completed booking (8% of booking value)
    const creditsEarned = Math.floor(booking.totalPrice * 0.08)
    if (creditsEarned > 0) {
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE id = $2',
        [creditsEarned, userId]
      )
      
      // Record credit transaction
      const transactionId = `credit-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO credit_transactions (
          id, "userId", amount, type, description, reference_id
        ) VALUES ($1, $2, $3, 'earned', $4, $5)
      `, [
        transactionId,
        userId,
        creditsEarned,
        `Booking completion reward (8% of $${booking.totalPrice})`,
        bookingId
      ])
      
      await createCreditsNotification(client, {
        userId,
        bookingId,
        type: 'earned',
        amount: creditsEarned,
        reason: 'completing your booking'
      })
    }

    // Broadcast court update
    broadcastCourtUpdate(booking.courtId, {
      type: 'BOOKING_CONFIRMED',
      booking: {
        id: bookingId,
        status: 'confirmed',
        startTime: booking.startTime,
        endTime: booking.endTime
      },
      courtId: booking.courtId
    })

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'confirmed',
        message: 'Booking confirmed successfully'
      },
      message: 'Booking confirmed successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error confirming booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to confirm booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/bookings/:bookingId/modify', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params
    const { date, time, duration, courts } = req.body

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Get booking details
    const bookingResult = await client.query(`
      SELECT b.*, c.name as courtName, c.sport as courtSport, COALESCE(b."modificationCount", 0) as "modificationCount"
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      WHERE b.id = $1 AND b."userId" = $2
    `, [bookingId, userId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking with the specified ID does not exist'
      })
    }

    const booking = bookingResult.rows[0]

    // Check modification count limit (max 2 modifications per booking)
    const modificationCount = booking.modificationCount || 0
    if (modificationCount >= 2) {
      return res.status(400).json({
        success: false,
        error: 'MODIFICATION_LIMIT_REACHED',
        message: 'Maximum 2 modifications allowed per booking'
      })
    }

    // Check if booking can be modified (within 2 hours of start time)
    const bookingTime = new Date(booking.startTime)
    const now = new Date()
    const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking < 2) {
      return res.status(400).json({
        success: false,
        error: 'BOOKING_TOO_CLOSE',
        message: 'Bookings can only be modified at least 2 hours before start time'
      })
    }

    // Calculate new start and end times (server now runs in Cambodia timezone)
    
    // Parse the date and time (server is already in Cambodia timezone)
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      console.error('❌ Invalid date/time parsing:', { date, time, year, month, day, hour, minute })
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATE_TIME',
        message: 'Invalid date or time format provided'
      })
    }
    
    // Create date directly (server timezone is already Cambodia)
    const newStartTimeCambodia = new Date(year, month - 1, day, hour, minute)
    const newEndTime = new Date(newStartTimeCambodia.getTime() + duration * 60 * 60 * 1000)
    
    console.log('🔧 Backend modification debug:', {
      input: { date, time, duration, courts },
      parsed: { year, month, day, hour, minute },
      calculated: {
        startTime: newStartTimeCambodia.toISOString(),
        endTime: newEndTime.toISOString()
      }
    })

    // Note: Removed 30-minute buffer rule - only 2-hour modification window applies

    // Validate court exists
    const courtCheck = await client.query('SELECT id, name, sport FROM courts WHERE id = $1', [courts[0]])
    if (courtCheck.rows.length === 0) {
      console.error('❌ Court not found:', courts[0])
      return res.status(400).json({
        success: false,
        error: 'COURT_NOT_FOUND',
        message: `Court ${courts[0]} not found`
      })
    }

    // Check for conflicts with new time
    const conflictCheck = await client.query(`
      SELECT id, "startTime", "endTime", status
      FROM bookings 
      WHERE "courtId" = $1 
      AND id != $2
      AND status IN ('confirmed', 'pending')
      AND (
        ($3 < "endTime" AND $4 > "startTime")
      )
    `, [courts[0], bookingId, newStartTimeCambodia, newEndTime])

    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Booking conflict',
        message: 'This time slot is no longer available',
        conflicts: conflictCheck.rows
      })
    }

    // Update booking
    await client.query(`
      UPDATE bookings 
      SET "startTime" = $1, "endTime" = $2, "courtId" = $3, "modificationCount" = $4, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [newStartTimeCambodia, newEndTime, courts[0], modificationCount + 1, bookingId])

    // Recalculate total price
    const courtResult = await client.query('SELECT "pricePerHour" FROM courts WHERE id = $1', [courts[0]])
    const pricePerHour = parseFloat(courtResult.rows[0].pricePerHour)
    const newTotalPrice = pricePerHour * duration

    await client.query(
      'UPDATE bookings SET "totalPrice" = $1 WHERE id = $2',
      [newTotalPrice, bookingId]
    )

    // Update payment amount
    await client.query(
      'UPDATE payments SET amount = $1 WHERE "bookingId" = $2',
      [newTotalPrice, bookingId]
    )

    // Create modification notification
    await createNotification(client, {
      userId,
      bookingId,
      type: 'modification',
      title: 'Booking Modified 📝',
      message: `Your ${booking.sport} booking has been updated to ${newStartTimeCambodia.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Phnom_Penh'
      })} at ${newStartTimeCambodia.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Phnom_Penh'
      })}, Court ${courts[0]}.`
    })

    // Delete old scheduled reminders first
    await client.query(
      'DELETE FROM notifications WHERE "bookingId" = $1 AND type = $2 AND "scheduledFor" > CURRENT_TIMESTAMP',
      [bookingId, 'reminder']
    )
    
    // Booking reminders removed - keeping other notifications

    // Broadcast court update
    broadcastCourtUpdate(courts[0], {
      type: 'BOOKING_MODIFIED',
      booking: {
        id: bookingId,
        startTime: newStartTimeCambodia,
        endTime: newEndTime,
        status: booking.status
      },
      courtId: courts[0]
    })

    res.json({
      success: true,
      data: {
        bookingId,
        startTime: newStartTimeCambodia,
        endTime: newEndTime,
        duration,
        courts,
        totalPrice: newTotalPrice,
        message: 'Booking modified successfully'
      },
      message: 'Booking modified successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error modifying booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to modify booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.post('/api/bookings/:bookingId/cancel', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params
    // const { reason } = req.body || {} // Reason not used in current implementation

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Get booking details
    const bookingResult = await client.query(`
      SELECT b.*, c.name as courtName, c.sport as courtSport, p.amount
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      LEFT JOIN payments p ON b.id = p."bookingId"
      WHERE b.id = $1 AND b."userId" = $2
    `, [bookingId, userId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking with the specified ID does not exist'
      })
    }

    const booking = bookingResult.rows[0]

    // Check if booking can be cancelled (within 2 hours of start time)
    const bookingTime = new Date(booking.startTime)
    const now = new Date()
    const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilBooking < 2) {
      return res.status(400).json({
        success: false,
        error: 'Booking too close',
        message: 'Bookings can only be cancelled at least 2 hours before start time'
      })
    }

    // Calculate refund amount (full refund if cancelled more than 24 hours before)
    const hoursUntilBooking24 = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const refundPercentage = hoursUntilBooking24 >= 24 ? 1.0 : 0.5 // 100% or 50% refund
    const refundAmount = booking.amount * refundPercentage

    // Update booking status
    await client.query(
      'UPDATE bookings SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', bookingId]
    )

    // Update payment status
    await client.query(
      'UPDATE payments SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "bookingId" = $2',
      ['refunded', bookingId]
    )

    // Refund credits to user
    if (refundAmount > 0) {
      await client.query(
        'UPDATE users SET credits = credits + $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        [refundAmount, userId]
      )
    }

    // Create cancellation notification
    // bookingTime already declared above
    await createNotification(client, {
      userId,
      bookingId,
      type: 'cancellation',
      title: 'Booking Cancelled ❌',
      message: `Your ${booking.courtSport} booking for ${bookingTime.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'Asia/Phnom_Penh'
      })} at ${bookingTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true,
        timeZone: 'Asia/Phnom_Penh'
      })} has been cancelled.`
    })

    // Create refund notification if applicable
    if (refundAmount > 0) {
      await createCreditsNotification(client, {
        userId,
        bookingId,
        type: 'earned',
        amount: refundAmount,
        reason: `booking cancellation (${Math.round(refundPercentage * 100)}% refund)`
      })
    }

    // Broadcast court update
    broadcastCourtUpdate(booking.courtId, {
      type: 'BOOKING_CANCELLED',
      booking: {
        id: bookingId,
        status: 'cancelled',
        startTime: booking.startTime,
        endTime: booking.endTime
      },
      courtId: booking.courtId
    })

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'cancelled',
        refundAmount,
        refundPercentage: refundPercentage * 100,
        message: `Booking cancelled. ${refundAmount} credits refunded.`
      },
      message: 'Booking cancelled successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error cancelling booking:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Payment processing endpoints
app.get('/api/payments/:paymentId', async (req, res) => {
  let client
  try {
    const { paymentId } = req.params
    
    client = await pool.connect()
    const result = await client.query(`
      SELECT p.*, b."userId", b."courtId", b."startTime", b."endTime", b."totalPrice"
      FROM payments p
      JOIN bookings b ON p."bookingId" = b.id
      WHERE p.id = $1
    `, [paymentId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'Payment with the specified ID does not exist'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
    return
  } catch (error) {
    console.error('❌ Error fetching payment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/payments/:paymentId/status', async (req, res) => {
  let client
  try {
    const { paymentId } = req.params
    const { status, transactionId } = req.body

    if (!status || !['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be pending, completed, failed, or refunded'
      })
    }

    client = await pool.connect()

    // Update payment status
    const updateResult = await client.query(
      'UPDATE payments SET status = $1, "transactionId" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, transactionId || null, paymentId]
    )

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'Payment with the specified ID does not exist'
      })
    }

    // If payment is completed, update booking status
    if (status === 'completed') {
      await client.query(
        'UPDATE bookings SET "paymentStatus" = $1, "status" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
        ['completed', 'confirmed', updateResult.rows[0].bookingId]
      )
    }

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Payment status updated to ${status}`
    })
    return

  } catch (error) {
    console.error('❌ Error updating payment status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.post('/api/payments/:paymentId/process', async (req, res) => {
  let client
  try {
    const { paymentId } = req.params
    const { paymentMethod } = req.body

    if (!paymentMethod || !['credits', 'aba'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: 'Payment method must be credits or aba'
      })
    }

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token - handle user IDs with hyphens
    const userId = tokenParts.slice(1, -1).join('-') // user ID from token (everything except jwt prefix and random suffix)
    
    client = await pool.connect()

    // Verify user exists
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      })
    }

    // Get payment and booking details
    const paymentResult = await client.query(`
      SELECT p.*, b."userId", b."totalPrice", b."courtId"
      FROM payments p
      JOIN bookings b ON p."bookingId" = b.id
      WHERE p.id = $1
    `, [paymentId])

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        message: 'Payment with the specified ID does not exist'
      })
    }

    const payment = paymentResult.rows[0]
    const amount = parseFloat(payment.totalPrice)

    // Process payment based on method
    if (paymentMethod === 'credits') {
      // Check if user has enough credits (1 credit = $1)
      const userResult = await client.query('SELECT credits FROM users WHERE id = $1', [userId])
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        })
      }

      const userCredits = userResult.rows[0].credits
      if (userCredits < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient credits',
          message: `User has ${userCredits} credits but needs ${amount}`
        })
      }

      // Deduct credits
      await client.query(
        'UPDATE users SET credits = credits - $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
        [amount, userId]
      )

      // Record credit transaction
      const transactionId = `transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO credit_transactions (
          id, "userId", amount, type, description, reference_id
        ) VALUES ($1, $2, $3, 'spent', $4, $5)
      `, [
        transactionId,
        userId,
        -amount, // Negative amount for spending
        `Booking payment (${amount} credits)`,
        payment.bookingId
      ])

    } else if (paymentMethod === 'aba') {
      // For ABA payments, we just mark as pending and let the user complete payment externally
      // The payment will be verified manually by admin
      console.log('ABA payment initiated for payment ID:', paymentId)
    }

    // Update payment status
    await client.query(
      'UPDATE payments SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [paymentMethod === 'credits' ? 'completed' : 'pending', paymentId]
    )

    // Update booking payment status
    await client.query(
      'UPDATE bookings SET "paymentStatus" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [paymentMethod === 'credits' ? 'paid' : 'pending', payment.bookingId]
    )

    res.json({
      success: true,
      message: paymentMethod === 'credits' ? 'Payment completed successfully' : 'Payment initiated, please complete external payment'
    })
    return

  } catch (error) {
    console.error('❌ Error processing payment:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// New endpoint for ABA payment proof upload for court bookings
app.post('/api/bookings/:bookingId/payment-proof', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params
    const { paymentProofUrl, paymentMethod = 'aba' } = req.body

    if (!paymentProofUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment proof',
        message: 'Payment proof URL is required'
      })
    }

    if (paymentMethod !== 'aba') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: 'Only ABA payment method is supported for proof upload'
      })
    }

    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    // Get user ID from token - handle user IDs with hyphens
    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    // Verify user exists and owns the booking
    const bookingResult = await client.query(`
      SELECT b.*, u.id as "userId"
      FROM bookings b
      JOIN users u ON u.id = b."userId"
      WHERE b.id = $1 AND u.id = $2
    `, [bookingId, userId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking not found or you do not have permission to access it'
      })
    }

    const booking = bookingResult.rows[0]

    // Create a credit purchase record to store the payment proof
    const purchaseId = `purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(`
      INSERT INTO credit_purchases (
        id, "userId", "package_id", "amount_usd", "credits_amount", 
        "bonus_credits", "payment_proof_url", "status", "createdAt", "updatedAt"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      purchaseId,
      userId,
      'court-booking-aba', // Special package ID for court booking ABA payments
      booking.totalPrice,
      0, // No credits awarded for court bookings
      0, // No bonus credits
      paymentProofUrl
    ])

    // Update the booking to link it to this payment proof
    await client.query(`
      UPDATE bookings 
      SET "paymentTrackingId" = $1, "paymentStatus" = 'pending', "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [purchaseId, bookingId])

    // Create notification for pending payment
    await createNotification(client, {
      userId,
      type: 'payment_proof_submitted',
      title: '💰 Payment Proof Submitted',
      message: `Your ABA payment proof for ${booking.totalPrice} has been submitted and is being reviewed.`
    })

    res.json({
      success: true,
      message: 'Payment proof submitted successfully',
      data: {
        purchaseId,
        status: 'pending'
      }
    })
    return

  } catch (error) {
    console.error('❌ Error submitting payment proof:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit payment proof',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Promo code endpoints
app.post('/api/promo-codes/validate', async (req, res) => {
  let client
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing promo code',
        message: 'Please provide a promo code'
      })
    }

    client = await pool.connect()

    // Get promo code details
    const promoResult = await client.query(`
      SELECT * FROM "promoCodes"
      WHERE code = $1 AND "isActive" = true
      AND (
        "startDate" IS NULL OR "startDate" <= CURRENT_TIMESTAMP
      )
      AND (
        "endDate" IS NULL OR "endDate" >= CURRENT_TIMESTAMP
      )
      AND (
        "maxUses" IS NULL OR "usedCount" < "maxUses"
      )
    `, [code])

    if (promoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid promo code',
        message: 'This promo code is invalid or has expired'
      })
    }

    res.json({
      success: true,
      data: promoResult.rows[0]
    })
    return

  } catch (error) {
    console.error('❌ Error validating promo code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to validate promo code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.post('/api/bookings/:bookingId/apply-promo', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing promo code',
        message: 'Please provide a promo code'
      })
    }

    client = await pool.connect()

    // Get booking details
    const bookingResult = await client.query(`
      SELECT b.*, c."pricePerHour"
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      WHERE b.id = $1
    `, [bookingId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking with the specified ID does not exist'
      })
    }

    const booking = bookingResult.rows[0]

    // Get promo code details
    const promoResult = await client.query(`
      SELECT * FROM "promoCodes"
      WHERE code = $1 AND "isActive" = true
      AND (
        "startDate" IS NULL OR "startDate" <= CURRENT_TIMESTAMP
      )
      AND (
        "endDate" IS NULL OR "endDate" >= CURRENT_TIMESTAMP
      )
      AND (
        "maxUses" IS NULL OR "usedCount" < "maxUses"
      )
    `, [code])

    if (promoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid promo code',
        message: 'This promo code is invalid or has expired'
      })
    }

    const promoCode = promoResult.rows[0]
    const originalAmount = parseFloat(booking.totalPrice)
    let discountAmount = 0

    // Calculate discount
    if (promoCode.discountType === 'percentage') {
      discountAmount = originalAmount * (promoCode.discountValue / 100)
    } else {
      discountAmount = promoCode.discountValue
    }

    // Ensure discount doesn't exceed original amount
    discountAmount = Math.min(discountAmount, originalAmount)
    const finalAmount = originalAmount - discountAmount

    // Update booking with new price
    await client.query(
      'UPDATE bookings SET "totalPrice" = $1, "promoCodeId" = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3',
      [finalAmount, promoCode.id, bookingId]
    )

    // Increment promo code usage
    await client.query(
      'UPDATE "promoCodes" SET "usedCount" = "usedCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1',
      [promoCode.id]
    )

    res.json({
      success: true,
      data: {
        bookingId,
        originalAmount,
        discountAmount,
        finalAmount,
        promoCode
      }
    })
    return

  } catch (error) {
    console.error('❌ Error applying promo code:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to apply promo code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Notifications endpoints
app.get('/api/notifications', async (req, res) => {
  let client
  try {
    // Get user from authentication token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Authorization header required'
      })
    }

    const token = authHeader.substring(7)
    const tokenParts = token.split('-')
    if (tokenParts.length < 3 || tokenParts[0] !== 'jwt') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'Token format is invalid'
      })
    }

    const userId = tokenParts.slice(1, -1).join('-')
    
    client = await pool.connect()

    const result = await client.query(`
      SELECT * FROM notifications
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [userId])

    res.json({
      success: true,
      data: result.rows
    })
    return

  } catch (error) {
    console.error('❌ Error fetching notifications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.put('/api/notifications/:notificationId/read', async (req, res) => {
  let client
  try {
    const { notificationId } = req.params

    client = await pool.connect()

    const result = await client.query(`
      UPDATE notifications
      SET "isRead" = true, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [notificationId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Notification with the specified ID does not exist'
      })
    }

    res.json({
      success: true,
      data: result.rows[0]
    })
    return

  } catch (error) {
    console.error('❌ Error marking notification as read:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

app.post('/api/notifications/schedule', async (req, res) => {
  let client
  try {
    const { bookingId, type, scheduledFor } = req.body

    if (!bookingId || !type || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide bookingId, type, and scheduledFor'
      })
    }

    client = await pool.connect()

    // Get booking details
    const bookingResult = await client.query(`
      SELECT b.*, u.id as "userId", u."firstName", u."lastName"
      FROM bookings b
      JOIN users u ON b."userId" = u.id
      WHERE b.id = $1
    `, [bookingId])

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        message: 'Booking with the specified ID does not exist'
      })
    }

    const booking = bookingResult.rows[0]
    const notificationId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create notification
    const result = await client.query(`
      INSERT INTO notifications (
        id, "userId", "bookingId", type, title, message, "scheduledFor",
        "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      notificationId,
      booking.userId,
      bookingId,
      type,
      'Booking Reminder',
      `Your booking for ${booking.sport} is coming up soon!`,
      scheduledFor
    ])

    res.json({
      success: true,
      data: result.rows[0]
    })
    return

  } catch (error) {
    console.error('❌ Error scheduling notification:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to schedule notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Analytics endpoints
app.get('/api/analytics/popular-times', async (req, res) => {
  let client
  try {
    const { sport, dayOfWeek } = req.query

    if (!sport) {
      return res.status(400).json({
        success: false,
        error: 'Missing sport parameter',
        message: 'Please provide a sport'
      })
    }

    client = await pool.connect()

    let query = `
      SELECT ba."hourOfDay", ba."bookingCount",
        CASE 
          WHEN ba."bookingCount" >= 5 THEN true
          ELSE false
        END as "isPopular",
        CASE
          WHEN ba."bookingCount" >= 8 THEN 'Very popular time slot!'
          WHEN ba."bookingCount" >= 5 THEN 'Popular time slot'
          WHEN ba."bookingCount" >= 3 THEN 'Moderately busy'
          ELSE 'Usually available'
        END as "recommendationReason"
      FROM "bookingAnalytics" ba
      JOIN courts c ON ba."courtId" = c.id
      WHERE c.sport = $1
    `

    const params = [sport]

    if (dayOfWeek !== undefined) {
      query += ' AND ba."dayOfWeek" = $2'
      params.push(dayOfWeek)
    }

    query += ' ORDER BY ba."bookingCount" DESC, ba."hourOfDay"'

    const result = await client.query(query, params)

    res.json({
      success: true,
      data: result.rows
    })
    return

  } catch (error) {
    console.error('❌ Error fetching popular times:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular times',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Multiple courts availability endpoint
app.post('/api/courts/check-multi-availability', async (req, res) => {
  let client
  try {
    const { courts, date, time, duration } = req.body

    if (!courts || !Array.isArray(courts) || courts.length === 0 || !date || !time || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide courts array, date, time, and duration'
      })
    }

    client = await pool.connect()

    // Calculate start and end times using proper timezone handling
    const cambodiaOffset = 7 * 60 // Cambodia is UTC+7
    
    // Parse the date and time as if it's in Cambodia timezone
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)
    
    // Create date in UTC, treating the input as Cambodia local time
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute))
    // Store the UTC time directly (no need to add offset back)
    const startTimeCambodia = utcDate
    const endTime = new Date(startTimeCambodia.getTime() + duration * 60 * 60 * 1000)

    // Check if booking time is too soon (30-minute buffer)
    const now = new Date()
    const nowCambodia = new Date(now.getTime() + (cambodiaOffset * 60000))
    const bufferMinutes = 30
    const earliestBookingTime = new Date(nowCambodia.getTime() + (bufferMinutes * 60 * 1000))
    
    // Convert booking time to Cambodia timezone for comparison
    const bookingTimeCambodia = new Date(startTimeCambodia.getTime() + (cambodiaOffset * 60000))
    
    if (bookingTimeCambodia <= earliestBookingTime) {
      return res.status(400).json({
        success: false,
        error: 'BOOKING_TOO_SOON',
        message: `Bookings must be made at least ${bufferMinutes} minutes in advance`
      })
    }

    // Check for conflicts for each court
    const conflicts = []
    for (const courtId of courts) {
      const conflictCheck = await client.query(`
        SELECT id, "startTime", "endTime"
        FROM bookings 
        WHERE "courtId" = $1 
        AND status IN ('confirmed', 'pending')
        AND (
          ($2 < "endTime" AND $3 > "startTime")
        )
      `, [courtId, startTimeCambodia, endTime])

      if (conflictCheck.rows.length > 0) {
        conflicts.push({
          courtId,
          conflictingBookings: conflictCheck.rows
        })
      }
    }

    res.json({
      success: true,
      data: {
        available: conflicts.length === 0,
        conflicts
      }
    })
    return

  } catch (error) {
    console.error('❌ Error checking multi-court availability:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to check court availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env['NODE_ENV'] || 'development',
        timezone: 'UTC+7 (Cambodia)',
        version: '1.0.2'
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    })
  }
})

// Debug endpoint to check current time and timezone handling
app.get('/api/debug/time', async (_req, res) => {
  try {
    const now = new Date()
    const cambodiaOffset = 7 * 60 // Cambodia is UTC+7
    
    // Current time calculations
    const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const nowCambodia = new Date(nowUtc + (cambodiaOffset * 60000))
    
    // Test booking time calculations (new approach)
    const testDate = '2025-01-15'
    const testTime = '18:00'
    const [year, month, day] = testDate.split('-').map(Number)
    const [hour, minute] = testTime.split(':').map(Number)
    
    // Ensure all values are defined
    if (year && month && day && hour !== undefined && minute !== undefined) {
      // NEW CORRECTED APPROACH: Store UTC time directly
      const testUtcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute))
      const testCambodiaTime = testUtcDate // Store UTC directly
      
      // OLD INCORRECT APPROACH: Double offset conversion
      const oldTestUtcDate = new Date(Date.UTC(year, month - 1, day, hour - 7, minute))
      const oldTestCambodiaTime = new Date(oldTestUtcDate.getTime() + (cambodiaOffset * 60000))
      
      // RAW INPUT APPROACH: Treat as local time
      const rawTestDate = new Date(`${testDate}T${testTime}:00`)
      
      res.json({
        success: true,
        data: {
          serverTime: {
            raw: now.toISOString(),
            local: now.toString(),
            utc: now.toUTCString(),
            timezone: now.getTimezoneOffset()
          },
          cambodiaTime: {
            calculated: nowCambodia.toISOString(),
            local: nowCambodia.toString(),
            utc: nowCambodia.toUTCString()
          },
          testBooking: {
            input: `${testDate}T${testTime}:00`,
            correctedApproach: {
              description: "Store UTC time directly (correct)",
              utcStored: testCambodiaTime.toISOString(),
              cambodiaDisplay: testCambodiaTime.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }),
              utcDisplay: testCambodiaTime.toLocaleString('en-US', { timeZone: 'UTC' })
            },
            oldIncorrectApproach: {
              description: "Double offset conversion (wrong)",
              cambodia: oldTestCambodiaTime.toISOString(),
              local: oldTestCambodiaTime.toString(),
              utc: oldTestUtcDate.toISOString()
            },
            rawInputApproach: {
              description: "Treat as local time (wrong)",
              raw: rawTestDate.toISOString(),
              local: rawTestDate.toString()
            }
          },
          timezoneInfo: {
            cambodiaOffset: cambodiaOffset,
            offsetMinutes: cambodiaOffset,
            offsetHours: cambodiaOffset / 60
          }
        }
      })
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid date/time format'
      })
    }
  } catch (error) {
    console.error('Error in time debug endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get time information'
    })
  }
})

// Debug endpoint to check all bookings
app.get('/api/debug/bookings', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Get all bookings with user details
    const result = await client.query(`
      SELECT 
        b.id,
        b."userId",
        b."startTime",
        b."endTime",
        b."totalPrice",
        b.status,
        b."paymentStatus",
        b."createdAt",
        u."firstName",
        u."lastName",
        u."telegramId",
        c.name as "courtName",
        c.sport as "courtSport"
      FROM bookings b
      JOIN users u ON b."userId" = u.id
      JOIN courts c ON b."courtId" = c.id
      ORDER BY b."createdAt" DESC
    `)
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
    return
    
  } catch (error) {
    console.error('❌ Error fetching debug bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Admin endpoint to clear all bookings and notifications
app.post('/api/admin/clear-all', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Clear all bookings
    const bookingsResult = await client.query('DELETE FROM bookings')
    
    // Clear all notifications
    const notificationsResult = await client.query('DELETE FROM notifications')
    
    // Clear all payments
    const paymentsResult = await client.query('DELETE FROM payments')
    
    res.json({
      success: true,
      data: {
        bookingsDeleted: bookingsResult.rowCount,
        notificationsDeleted: notificationsResult.rowCount,
        paymentsDeleted: paymentsResult.rowCount,
        message: 'All bookings, notifications, and payments cleared successfully'
      }
    })
    return
    
  } catch (error) {
    console.error('❌ Error clearing data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear data',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Admin endpoint to update user credits
app.post('/api/admin/update-credits', async (req, res) => {
  let client
  try {
    const { userId, credits } = req.body
    
    if (!userId || credits === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId and credits'
      })
    }
    
    client = await pool.connect()
    
    // Update user credits
    const result = await client.query(
      'UPDATE users SET credits = $1 WHERE id = $2 RETURNING *',
      [credits, userId]
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        user: result.rows[0],
        message: `Credits updated to ${credits}`
      }
    })
    return
    
  } catch (error) {
    console.error('❌ Error updating credits:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update credits',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Debug endpoint to check users
app.get('/api/debug/users', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Get all users
    const result = await client.query(`
      SELECT 
        id,
        "firstName",
        "lastName",
        "telegramId",
        credits,
        points,
        "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
    `)
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
    return
    
  } catch (error) {
    console.error('❌ Error fetching debug users:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug users',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Debug endpoint to fix booking time
app.patch('/api/debug/bookings/:bookingId/fix-time', async (req, res) => {
  let client
  try {
    const { bookingId } = req.params
    const { newStartTime, newEndTime } = req.body
    
    client = await pool.connect()
    
    // Update the booking time
    const result = await client.query(`
      UPDATE bookings 
      SET "startTime" = $1, "endTime" = $2, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [newStartTime, newEndTime, bookingId])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }
    
    res.json({
      success: true,
      message: 'Booking time updated successfully',
      data: result.rows[0]
    })
    return
    
  } catch (error) {
    console.error('❌ Error fixing booking time:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fix booking time',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Production notification system is now properly integrated
// Database tables are created during server startup in initializeDatabase()

// Debug endpoint to clear all bookings
app.delete('/api/debug/bookings/clear', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Delete all bookings
    const result = await client.query('DELETE FROM bookings')
    
    res.json({
      success: true,
      message: 'All bookings cleared successfully',
      deletedCount: result.rowCount
    })
    return
    
  } catch (error) {
    console.error('❌ Error clearing bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Debug endpoint to clear all notifications
app.delete('/api/debug/notifications/clear', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Delete all notifications
    const result = await client.query('DELETE FROM notifications')
    
    res.json({
      success: true,
      message: 'All notifications cleared successfully',
      deletedCount: result.rowCount
    })
    return
    
  } catch (error) {
    console.error('❌ Error clearing notifications:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Notification utility functions
const createNotification = async (client: any, data: {
  userId: string,
  bookingId?: string,
  type: string,
  title: string,
  message: string,
  scheduledFor?: Date
}) => {
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  await client.query(`
    INSERT INTO notifications (id, "userId", "bookingId", type, title, message, "scheduledFor", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
  `, [
    notificationId,
    data.userId,
    data.bookingId || null,
    data.type,
    data.title,
    data.message,
    data.scheduledFor || null
  ])
  
  console.log(`🔔 Notification created: ${data.type} for user ${data.userId}`)
  return notificationId
}

// Booking reminders function removed - no longer needed

const createPaymentNotification = async (client: any, data: {
  userId: string,
  bookingId: string,
  status: 'success' | 'failed' | 'pending',
  amount?: number,
  trackingId?: string
}) => {
  let title = ''
  let message = ''
  let type = 'payment'
  
  switch (data.status) {
    case 'success':
      title = 'Payment Successful ✅'
      message = `Payment confirmed for booking #${data.bookingId.slice(-8).toUpperCase()}${data.amount ? ` ($${data.amount})` : ''}`
      break
    case 'failed':
      title = 'Payment Failed ❌'
      message = `Payment failed for booking #${data.bookingId.slice(-8).toUpperCase()}. Please update your payment method.`
      type = 'payment_failed'
      break
    case 'pending':
      title = 'Payment Pending ⏳'
      message = `Payment processing for booking #${data.bookingId.slice(-8).toUpperCase()}. We'll notify you once confirmed.`
      break
  }
  
  await createNotification(client, {
    userId: data.userId,
    bookingId: data.bookingId,
    type,
    title,
    message
  })
}

const createCreditsNotification = async (client: any, data: {
  userId: string,
  bookingId?: string,
  type: 'earned' | 'spent' | 'expiring',
  amount: number,
  reason?: string
}) => {
  let title = ''
  let message = ''
  
  switch (data.type) {
    case 'earned':
      title = 'Credits Earned! 🎁'
      message = `You earned ${data.amount} credits${data.reason ? ` for ${data.reason}` : ''}. Keep playing to earn more!`
      break
    case 'spent':
      title = 'Credits Used 💎'
      message = `${data.amount} credits applied to your booking. Great savings!`
      break
    case 'expiring':
      title = 'Credits Expiring Soon ⏰'
      message = `${data.amount} credits expire in 7 days. Use them before they're gone!`
      break
  }
  
  const notificationData: any = {
    userId: data.userId,
    type: 'credits',
    title,
    message
  }
  
  if (data.bookingId) {
    notificationData.bookingId = data.bookingId
  }
  
  await createNotification(client, notificationData)
}

// 🎯 Points awarding utility function
const awardPointsForBooking = async (client: any, userId: string, _bookingId: string, sport: string) => {
  try {
    // Get user's booking count to determine if this is their first booking
    const userBookingsResult = await client.query(`
      SELECT COUNT(*) as booking_count 
      FROM bookings 
      WHERE "userId" = $1 AND status IN ('confirmed', 'pending')
    `, [userId])
    
    const bookingCount = parseInt(userBookingsResult.rows[0].booking_count)
    const isFirstBooking = bookingCount === 1
    
    // Award points for first booking
    if (isFirstBooking) {
      const firstBookingTaskId = 'first-booking'
      const pointsToAward = 100
      
      // Check if user has already completed this task
      const existingTaskResult = await client.query(`
        SELECT * FROM user_tasks 
        WHERE "userId" = $1 AND task_id = $2
      `, [userId, firstBookingTaskId])
      
      if (existingTaskResult.rows.length === 0) {
        // Award points and create task completion record
        await client.query(`
          UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [pointsToAward, userId])
        
        // Create user task record
        const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await client.query(`
          INSERT INTO user_tasks (id, "userId", task_id, completion_count, total_points_earned, last_completed, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [userTaskId, userId, firstBookingTaskId, 1, pointsToAward])
        
        // Record points transaction
        const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await client.query(`
          INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
          VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5)
        `, [transactionId, userId, pointsToAward, 'Completed: Make Your First Booking', firstBookingTaskId])
        
        console.log(`🎯 First booking points awarded: ${pointsToAward} points to user ${userId}`)
      }
    }
    
    // Award points for regular booking completion
    const regularBookingTaskId = 'complete-booking'
    const regularPointsToAward = 25
    
    // Check if user can complete this task (repeatable)
    const regularTaskResult = await client.query(`
      SELECT * FROM user_tasks 
      WHERE "userId" = $1 AND task_id = $2
    `, [userId, regularBookingTaskId])
    
    if (regularTaskResult.rows.length === 0) {
      // Create new user task record
      const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO user_tasks (id, "userId", task_id, completion_count, total_points_earned, last_completed, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userTaskId, userId, regularBookingTaskId, 1, regularPointsToAward])
    } else {
      // Update existing task record
      await client.query(`
        UPDATE user_tasks 
        SET completion_count = completion_count + 1, 
            total_points_earned = total_points_earned + $1,
            last_completed = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2 AND task_id = $3
      `, [regularPointsToAward, userId, regularBookingTaskId])
    }
    
    // Award points to user
    await client.query(`
      UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [regularPointsToAward, userId])
    
    // Record points transaction
    const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(`
      INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
      VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5)
    `, [transactionId, userId, regularPointsToAward, `Completed: ${sport} booking`, regularBookingTaskId])
    
    console.log(`🎯 Regular booking points awarded: ${regularPointsToAward} points to user ${userId}`)
    
    // 🎯 NEW: Award points for milestone bookings
    if (bookingCount === 5) {
      await awardMilestonePoints(client, userId, 'multiple-bookings', 200, 'Completed 5 Bookings')
    } else if (bookingCount === 10) {
      await awardMilestonePoints(client, userId, 'booking-master', 500, 'Completed 10 Bookings')
    } else if (bookingCount === 25) {
      await awardMilestonePoints(client, userId, 'booking-expert', 1000, 'Completed 25 Bookings')
    }
    
    // 🎯 NEW: Award points for early bird bookings (6-9 AM)
    const bookingHour = new Date().getHours()
    if (bookingHour >= 6 && bookingHour <= 9) {
      await awardSpecialBookingPoints(client, userId, 'early-booking', 35, 'Early Bird Booking')
    }
    
    // 🎯 NEW: Award points for peak hour bookings (6-9 PM)
    if (bookingHour >= 18 && bookingHour <= 21) {
      await awardSpecialBookingPoints(client, userId, 'peak-booking', 20, 'Peak Hour Booking')
    }
    
  } catch (error) {
    console.error('❌ Error awarding points for booking:', error)
    // Don't fail the booking if points awarding fails
  }
}

// 🎯 NEW: Award milestone points
const awardMilestonePoints = async (client: any, userId: string, taskId: string, points: number, description: string) => {
  try {
    // Check if user has already completed this milestone
    const existingTaskResult = await client.query(`
      SELECT * FROM user_tasks 
      WHERE "userId" = $1 AND task_id = $2
    `, [userId, taskId])
    
    if (existingTaskResult.rows.length === 0) {
      // Award points
      await client.query(`
        UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [points, userId])
      
      // Create user task record
      const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO user_tasks (id, "userId", task_id, completion_count, total_points_earned, last_completed, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userTaskId, userId, taskId, 1, points])
      
      // Record points transaction
      const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
        VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5)
      `, [transactionId, userId, points, description, taskId])
      
      console.log(`🎯 Milestone points awarded: ${points} points to user ${userId} for ${description}`)
    }
  } catch (error) {
    console.error('❌ Error awarding milestone points:', error)
  }
}

// 🎯 NEW: Award special booking points
const awardSpecialBookingPoints = async (client: any, userId: string, taskId: string, points: number, description: string) => {
  try {
    // Check if user can complete this task (repeatable)
    const existingTaskResult = await client.query(`
      SELECT * FROM user_tasks 
      WHERE "userId" = $1 AND task_id = $2
    `, [userId, taskId])
    
    if (existingTaskResult.rows.length === 0) {
      // Create new user task record
      const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO user_tasks (id, "userId", task_id, completion_count, total_points_earned, last_completed, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userTaskId, userId, taskId, 1, points])
    } else {
      // Update existing task record
      await client.query(`
        UPDATE user_tasks 
        SET completion_count = completion_count + 1, 
            total_points_earned = total_points_earned + $1,
            last_completed = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2 AND task_id = $3
      `, [points, userId, taskId])
    }
    
    // Award points to user
    await client.query(`
      UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [points, userId])
    
    // Record points transaction
    const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(`
      INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
      VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5)
    `, [transactionId, userId, points, description, taskId])
    
    console.log(`🎯 Special booking points awarded: ${points} points to user ${userId} for ${description}`)
  } catch (error) {
    console.error('❌ Error awarding special booking points:', error)
  }
}

// 🎯 NEW: Award points for credit purchases
const awardPointsForCreditPurchase = async (client: any, userId: string, purchaseAmount: number) => {
  try {
    // Get user's credit purchase count
    const purchaseCountResult = await client.query(`
      SELECT COUNT(*) as purchase_count 
      FROM credit_purchases 
      WHERE "userId" = $1 AND status = 'completed'
    `, [userId])
    
    const purchaseCount = parseInt(purchaseCountResult.rows[0].purchase_count)
    const isFirstPurchase = purchaseCount === 0
    
    // Award points for first credit purchase
    if (isFirstPurchase) {
      const firstPurchaseTaskId = 'credit-purchase'
      const pointsToAward = 150
      
      // Check if user has already completed this task
      const existingTaskResult = await client.query(`
        SELECT * FROM user_tasks 
        WHERE "userId" = $1 AND task_id = $2
      `, [userId, firstPurchaseTaskId])
      
      if (existingTaskResult.rows.length === 0) {
        // Award points and create task completion record
        await client.query(`
          UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [pointsToAward, userId])
        
        // Create user task record
        const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await client.query(`
          INSERT INTO user_tasks (id, "userId", task_id, completion_count, total_points_earned, last_completed, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [userTaskId, userId, firstPurchaseTaskId, 1, pointsToAward])
        
        // Record points transaction
        const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await client.query(`
          INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
          VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5)
        `, [transactionId, userId, pointsToAward, 'Completed: Credit Buyer', firstPurchaseTaskId])
        
        console.log(`🎯 First credit purchase points awarded: ${pointsToAward} points to user ${userId}`)
      }
    }
    
    // Award points based on purchase amount (bonus points)
    let bonusPoints = 0
    if (purchaseAmount >= 50) {
      bonusPoints = 100
    } else if (purchaseAmount >= 25) {
      bonusPoints = 50
    } else if (purchaseAmount >= 10) {
      bonusPoints = 25
    }
    
    if (bonusPoints > 0) {
      // Award bonus points
      await client.query(`
        UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [bonusPoints, userId])
      
      // Record points transaction
      const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO points_transactions (id, "userId", amount, type, source, description, reference_id)
        VALUES ($1, $2, $3, 'earned', 'credit_purchase_bonus', $4, $5)
      `, [transactionId, userId, bonusPoints, `Bonus points for $${purchaseAmount} purchase`, null])
      
      console.log(`🎯 Credit purchase bonus points awarded: ${bonusPoints} points to user ${userId}`)
    }
    
  } catch (error) {
    console.error('❌ Error awarding points for credit purchase:', error)
    // Don't fail the credit purchase if points awarding fails
  }
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  })
})

// WebSocket server setup
const wss = new WebSocketServer({ server })

// Store connected clients
const connectedClients = new Map<string, WebSocket>()

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 New WebSocket connection')
  
  // Generate client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  connectedClients.set(clientId, ws)
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    clientId,
    message: 'Connected to Courtside WebSocket server'
  }))
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('📨 Received WebSocket message:', message.type)
      
      switch (message.type) {
        case 'SUBSCRIBE_COURT':
          // Subscribe to court updates
          ws.send(JSON.stringify({
            type: 'COURT_SUBSCRIPTION',
            courtId: message.courtId,
            message: `Subscribed to court ${message.courtId} updates`
          }))
          break
          
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }))
          break
          
        default:
          console.log('❓ Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error)
    }
  })
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected:', clientId)
    connectedClients.delete(clientId)
  })
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
    connectedClients.delete(clientId)
  })
})

// Function to broadcast court updates
const broadcastCourtUpdate = (courtId: string, data: any) => {
  const message = JSON.stringify({
    type: 'COURT_UPDATE',
    courtId,
    data,
    timestamp: new Date().toISOString()
  })
  
  connectedClients.forEach((client, clientId) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    } else {
      connectedClients.delete(clientId)
    }
  })
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...')
  wss.close()
  await pool.end()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...')
  wss.close()
  await pool.end()
  process.exit(0)
})

// Notification processing system
const processScheduledNotifications = async () => {
  let client
  try {
    client = await pool.connect()
    
    // Get notifications that are due to be sent
    const dueNotifications = await client.query(`
      SELECT * FROM notifications 
      WHERE "scheduledFor" <= CURRENT_TIMESTAMP 
      AND "scheduledFor" IS NOT NULL
      AND "isRead" = false
      ORDER BY "scheduledFor" ASC
      LIMIT 50
    `)
    
    for (const notification of dueNotifications.rows) {
      // Clear the scheduled time so it doesn't get processed again
      await client.query(
        'UPDATE notifications SET "scheduledFor" = NULL WHERE id = $1',
        [notification.id]
      )
      
      // Send notification (for now just log, in future could send push notifications)
      console.log(`🔔 Sending scheduled notification: ${notification.type} to user ${notification.userId}`)
      console.log(`   Title: ${notification.title}`)
      console.log(`   Message: ${notification.message}`)
      
      // Here you could integrate with push notification services like:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNS)
      // - Telegram Bot API
      
      // For Telegram Mini Apps, we could send a message via bot
      // or rely on in-app notifications when user opens the app
    }
    
    if (dueNotifications.rows.length > 0) {
      console.log(`📨 Processed ${dueNotifications.rows.length} scheduled notifications`)
    }
    
  } catch (error) {
    console.error('❌ Error processing scheduled notifications:', error)
  } finally {
    if (client) client.release()
  }
}

// Check for scheduled notifications every 5 minutes
setInterval(processScheduledNotifications, 5 * 60 * 1000)

// Process notifications on startup
processScheduledNotifications()

// ===== POINTS SYSTEM API ENDPOINTS =====

// Test endpoint to verify points system is deployed
app.get('/api/points/test', async (_req, res) => {
  res.json({
    success: true,
    message: 'Points system endpoints are working!',
    timestamp: new Date().toISOString(),
    version: '1.0.4'
  })
})

// Very simple points test endpoint
app.get('/api/points-simple', async (_req, res) => {
  res.json({
    success: true,
    message: 'Simple points endpoint working!',
    timestamp: new Date().toISOString()
  })
})

// Alternative points test endpoint
app.get('/api/pointsystem/test', async (_req, res) => {
  res.json({
    success: true,
    message: 'Points system test endpoint working!',
    timestamp: new Date().toISOString()
  })
})

// Simple test endpoint for debugging
app.get('/api/test-points', async (_req, res) => {
  res.json({
    success: true,
    message: 'Points test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.0.3'
  })
})

// Simple database test endpoint
app.get('/api/test-db', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time')
    res.json({
      success: true,
      message: 'Database connection working!',
      timestamp: new Date().toISOString(),
      dbTime: result.rows[0].current_time,
      version: '1.0.3'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    if (client) client.release()
  }
})

// Get available tasks for user (5 random daily tasks)
app.get('/api/points/tasks/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    // Get 5 random daily tasks with user progress
    const tasksResult = await client.query(`
      SELECT 
        t.*,
        COALESCE(ut.completion_count, 0) as user_completion_count,
        COALESCE(ut.total_points_earned, 0) as user_points_earned,
        ut.last_completed,
        CASE 
          WHEN t.task_type = 'one-time' AND COALESCE(ut.completion_count, 0) >= 1 THEN true
          WHEN t.max_completions IS NOT NULL AND COALESCE(ut.completion_count, 0) >= t.max_completions THEN true
          ELSE false
        END as is_completed
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut."userId" = $1
      WHERE t.is_active = true
      ORDER BY RANDOM()
      LIMIT 5
    `, [userId])

    res.json({
      success: true,
      data: tasksResult.rows,
      message: 'Tasks retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching tasks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Complete a task and award points
app.post('/api/points/tasks/:taskId/complete', async (req, res) => {
  let client
  try {
    const { taskId } = req.params
    const { userId, metadata } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'User ID is required'
      })
    }

    client = await pool.connect()
    await client.query('BEGIN')

    // Get task details
    const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1 AND is_active = true', [taskId])
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task does not exist or is inactive'
      })
    }

    const task = taskResult.rows[0]

    // Get or create user task record
    const userTaskResult = await client.query(`
      SELECT * FROM user_tasks WHERE "userId" = $1 AND task_id = $2
    `, [userId, taskId])

    let userTask = userTaskResult.rows[0]
    let newCompletionCount = 1

    if (userTask) {
      newCompletionCount = userTask.completion_count + 1

      // Check if task can be completed again
      if (task.task_type === 'one-time' && userTask.completion_count >= 1) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'Task already completed',
          message: 'This task can only be completed once'
        })
      }

      if (task.max_completions && userTask.completion_count >= task.max_completions) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          success: false,
          error: 'Task completion limit reached',
          message: `This task can only be completed ${task.max_completions} times`
        })
      }

      // Update existing user task
      await client.query(`
        UPDATE user_tasks 
        SET completion_count = completion_count + 1,
            total_points_earned = total_points_earned + $1,
            last_completed = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $2 AND task_id = $3
      `, [task.points_reward, userId, taskId])
    } else {
      // Create new user task record
      const userTaskId = `user-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await client.query(`
        INSERT INTO user_tasks (
          id, "userId", task_id, completion_count, total_points_earned, 
          last_completed, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, 1, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [userTaskId, userId, taskId, task.points_reward])
    }

    // Update user points
    await client.query(
      'UPDATE users SET points = points + $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [task.points_reward, userId]
    )

    // Record points transaction
    const transactionId = `points-txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await client.query(`
      INSERT INTO points_transactions (
        id, "userId", amount, type, source, description, reference_id, metadata
      ) VALUES ($1, $2, $3, 'earned', 'task_completion', $4, $5, $6)
    `, [
      transactionId,
      userId,
      task.points_reward,
      `Completed task: ${task.name}`,
      taskId,
      metadata ? JSON.stringify(metadata) : null
    ])

    await client.query('COMMIT')

    res.json({
      success: true,
      data: {
        points_earned: task.points_reward,
        completion_count: newCompletionCount,
        task_name: task.name
      },
      message: `Task completed! You earned ${task.points_reward} points.`
    })
    return

  } catch (error) {
    if (client) await client.query('ROLLBACK')
    console.error('❌ Error completing task:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to complete task',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})





// Purchase reward with points - MOVED TO LINE 300 TO FIX ROUTE ORDERING

// Get user's points transactions
app.get('/api/points/transactions/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    const transactionsResult = await client.query(`
      SELECT * FROM points_transactions 
      WHERE "userId" = $1 
      ORDER BY "createdAt" DESC
    `, [userId])

    res.json({
      success: true,
      data: transactionsResult.rows,
      message: 'Points transactions retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching points transactions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch points transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Get user's reward purchases
app.get('/api/points/purchases/:userId', async (req, res) => {
  let client
  try {
    const { userId } = req.params

    client = await pool.connect()

    const purchasesResult = await client.query(`
      SELECT 
        rp.*,
        r.name as reward_name,
        r.description as reward_description,
        r.reward_type,
        r.reward_value,
        r.icon as reward_icon
      FROM reward_purchases rp
      JOIN rewards r ON rp.reward_id = r.id
      WHERE rp."userId" = $1 
      ORDER BY rp."createdAt" DESC
    `, [userId])

    res.json({
      success: true,
      data: purchasesResult.rows,
      message: 'Reward purchases retrieved successfully'
    })
    return

  } catch (error) {
    console.error('❌ Error fetching reward purchases:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reward purchases',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Database management endpoint (ADMIN ONLY - for development/testing)
app.delete('/api/admin/clear-bookings', async (req, res) => {
  let client
  try {
    // Check if this is a development environment or has admin key
    const adminKey = req.headers['x-admin-key']
    const isDevelopment = process.env['NODE_ENV'] === 'development'
    
    if (!isDevelopment && adminKey !== process.env['ADMIN_SECRET_KEY']) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin access required'
      })
    }

    client = await pool.connect()
    
    // First, count existing bookings
    const countResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const bookingCount = parseInt(countResult.rows[0].count)
    
    console.log(`🗑️  ADMIN: Clearing ${bookingCount} bookings from database`)
    
    if (bookingCount === 0) {
      return res.json({
        success: true,
        message: 'No bookings to clear',
        deletedCount: 0
      })
    }
    
    // Delete all bookings
    const deleteResult = await client.query('DELETE FROM "bookings"')
    
    // Verify deletion
    const verifyResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const remainingCount = parseInt(verifyResult.rows[0].count)
    
    console.log(`✅ ADMIN: Successfully deleted ${deleteResult.rowCount} bookings`)
    
    res.json({
      success: true,
      message: `Successfully cleared ${deleteResult.rowCount} bookings`,
      deletedCount: deleteResult.rowCount,
      remainingCount: remainingCount
    })
    return
    
  } catch (error) {
    console.error('❌ Error clearing bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Simple database clear endpoint for development (NO AUTH REQUIRED)
app.delete('/api/dev/clear-bookings', async (_req, res) => {
  let client
  try {
    client = await pool.connect()
    
    // Count existing bookings
    const countResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const bookingCount = parseInt(countResult.rows[0].count)
    
    console.log(`🗑️  DEV: Clearing ${bookingCount} bookings from database`)
    
    if (bookingCount === 0) {
      return res.json({
        success: true,
        message: 'No bookings to clear',
        deletedCount: 0
      })
    }
    
    // Delete all bookings
    const deleteResult = await client.query('DELETE FROM "bookings"')
    
    // Verify deletion
    const verifyResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const remainingCount = parseInt(verifyResult.rows[0].count)
    
    console.log(`✅ DEV: Successfully deleted ${deleteResult.rowCount} bookings`)
    
    res.json({
      success: true,
      message: `Successfully cleared ${deleteResult.rowCount} bookings`,
      deletedCount: deleteResult.rowCount,
      remainingCount: remainingCount
    })
    return
    
  } catch (error) {
    console.error('❌ Error clearing bookings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to clear bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Execute SQL command endpoint
app.post('/api/dev/execute-sql', async (req, res) => {
  let client
  try {
    const { sql } = req.body
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL command required',
        message: 'Please provide a SQL command in the request body'
      })
    }
    
    console.log(`🔧 DEV: Executing SQL command: ${sql}`)
    
    client = await pool.connect()
    
    // Execute the SQL command
    const result = await client.query(sql)
    
    console.log(`✅ DEV: SQL command executed successfully`)
    
    res.json({
      success: true,
      message: 'SQL command executed successfully',
      rowCount: result.rowCount,
      rows: result.rows
    })
    return
    
  } catch (error) {
    console.error('❌ Error executing SQL command:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to execute SQL command',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  } finally {
    if (client) client.release()
  }
})

// Initialize database timezone
const initializeDatabaseTimezone = async () => {
  let client
  try {
    client = await pool.connect()
    
    // Set timezone for the current session
    await client.query('SET timezone = \'Asia/Phnom_Penh\'')
    
    // Verify timezone setting
    const timezoneResult = await client.query('SHOW timezone')
    console.log(`🌍 Database timezone set to: ${timezoneResult.rows[0].TimeZone}`)
    
    // Test timezone with a sample query
    const testTimeResult = await client.query('SELECT NOW() as current_time')
    console.log(`🕐 Database current time: ${testTimeResult.rows[0].current_time}`)
    
  } catch (error) {
    console.error('❌ Error setting database timezone:', error)
  } finally {
    if (client) client.release()
  }
}

// Test endpoint at the end of file to verify full loading
app.get('/api/end-of-file-test', (_req, res) => {
  res.json({
    success: true,
    message: 'End of file test endpoint working!',
    timestamp: new Date().toISOString(),
    version: '1.1.5',
    fileEndLoaded: true
  })
})

// GitHub automatic deployment test endpoint
app.get('/api/github-deploy-test', (_req, res) => {
  res.json({
    success: true,
    message: 'GitHub automatic deployment is working!',
    timestamp: new Date().toISOString(),
    version: '1.1.6',
    deployment: 'github-automatic',
    status: 'success',
    method: 'github-push-triggered'
  })
})

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Environment: ${process.env['NODE_ENV'] || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`)
  console.log(`🔔 Smart Notification System active - processing reminders every 5 minutes`)
  console.log(`🎯 Points System API endpoints ready`)
  
  // Initialize database timezone
  await initializeDatabaseTimezone()
  
  console.log(`✅ Production ready with Cambodia timezone support (UTC+7)`)
  console.log(`✅ Points System v1.1.0 deployed successfully`)
}) 

