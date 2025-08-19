import { Router } from 'express'
import bookingsRouter from './bookings'
import usersRouter from './users'
import courtsRouter from './courts'
import pointsRouter from './points'
import adminRouter from './admin'
import paymentsRouter from './payments'

const router = Router()

// API routes
router.use('/api/bookings', bookingsRouter)
router.use('/api/users', usersRouter)
router.use('/api/courts', courtsRouter)
router.use('/api/points', pointsRouter)
router.use('/api/admin', adminRouter)
router.use('/api/payments', paymentsRouter)

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
    version: '1.1.5',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'connected'
  })
})

// Test endpoint
router.get('/api/test', (_req, res) => {
  res.json({
    success: true,
    message: 'Courtside API is running!',
    timestamp: new Date().toISOString(),
    version: '1.1.5'
  })
})

// Catch-all for undefined routes
router.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  })
})

export default router
