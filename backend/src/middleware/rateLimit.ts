import rateLimit from 'express-rate-limit'

// Rate limiting configuration
export const createRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env['NODE_ENV'] === 'production' ? 50000 : 1000, // Much higher limit for production
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    skipFailedRequests: false
  })
}

export const rateLimiter = createRateLimiter()
