import cors from 'cors'

// CORS configuration
export const corsOptions = {
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

export const corsMiddleware = cors(corsOptions)
