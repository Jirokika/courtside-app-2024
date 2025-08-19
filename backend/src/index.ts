import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { corsMiddleware } from './middleware/cors'
import { rateLimiter } from './middleware/rateLimit'
import { pool } from './services/database'
import routes from './routes'

// Load environment variables
dotenv.config()

const app = express()
const server = createServer(app)

// Environment variables
const PORT = process.env['PORT'] || 3001

// Trust proxy for Railway
app.set('trust proxy', 1)

// Global middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(rateLimiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(corsMiddleware)

// Use all routes
app.use('/', routes)

// WebSocket for real-time features (if needed)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket connection')
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('📩 WebSocket message:', data)
      
      // Echo back for now - add your real-time logic here
      ws.send(JSON.stringify({
        type: 'response',
        message: 'Message received',
        data
      }))
    } catch (error) {
      console.error('❌ WebSocket message error:', error)
    }
  })
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed')
  })
})

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global error handler:', error)
  
  if (res.headersSent) {
    return next(error)
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  
  server.close(() => {
    console.log('🚪 HTTP server closed')
  })
  
  try {
    await pool.end()
    console.log('🗄️ Database pool closed')
  } catch (error) {
    console.error('❌ Error closing database pool:', error)
  }
  
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  
  server.close(() => {
    console.log('🚪 HTTP server closed')
  })
  
  try {
    await pool.end()
    console.log('🗄️ Database pool closed')
  } catch (error) {
    console.error('❌ Error closing database pool:', error)
  }
  
  process.exit(0)
})

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Courtside Backend API v2.0 running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`)
  console.log(`🗄️ Database: ${process.env['DATABASE_URL'] ? 'Connected' : 'Not configured'}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`⚡ Server ready at: http://localhost:${PORT}`)
})

export default app