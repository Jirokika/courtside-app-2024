import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

// Import extracted modules
import { corsMiddleware } from './middleware/cors'
import { rateLimiter } from './middleware/rateLimit'
import routes from './routes'
import { pool } from './services/database'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)

// Environment variables
const PORT = process.env['PORT'] || 3001

// Trust proxy for rate limiting
app.set('trust proxy', 1)

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(rateLimiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(corsMiddleware)

// Routes
app.use('/', routes)

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection established')
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('📨 WebSocket message received:', data)
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          break
        case 'subscribe':
          // Handle subscription to specific events
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            channel: data.channel,
            timestamp: Date.now() 
          }))
          break
        default:
          console.log('❓ Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error)
    }
  })
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed')
  })
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  
  // Close WebSocket server
  wss.close()
  
  // Close database pool
  await pool.end()
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  
  // Close WebSocket server
  wss.close()
  
  // Close database pool
  await pool.end()
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed')
    process.exit(0)
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Courtside Backend Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)
  console.log(`🔌 WebSocket server ready`)
  console.log(`💾 Database pool initialized`)
})
