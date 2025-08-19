import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    telegramId: number
    [key: string]: any
  }
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    })
  }

  try {
    const secret = process.env['JWT_SECRET'] || 'fallback-secret'
    const decoded = jwt.verify(token, secret) as any
    
    req.user = {
      id: decoded.id,
      telegramId: decoded.telegramId,
      ...decoded
    }
    
    next()
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    })
  }
}

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const secret = process.env['JWT_SECRET'] || 'fallback-secret'
      const decoded = jwt.verify(token, secret) as any
      
      req.user = {
        id: decoded.id,
        telegramId: decoded.telegramId,
        ...decoded
      }
    } catch (error) {
      // Token is invalid, but we continue without authentication
      console.log('Optional auth: Invalid token, continuing as guest')
    }
  }
  
  next()
}
