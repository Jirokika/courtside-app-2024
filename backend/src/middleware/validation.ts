import { Request, Response, NextFunction } from 'express'

// Basic validation middleware
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = requiredFields.filter(field => !req.body[field])
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      })
    }
    
    next()
  }
}

export const validateDateRange = (req: Request, res: Response, next: NextFunction) => {
  const { startDate, endDate } = req.body
  
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      })
    }
    
    // Check if booking is at least 30 minutes in advance
    const now = new Date()
    const minAdvance = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes
    
    if (start <= minAdvance) {
      return res.status(400).json({
        success: false,
        error: 'Bookings must be made at least 30 minutes in advance'
      })
    }
  }
  
  next()
}

export const validateTimeSlot = (req: Request, res: Response, next: NextFunction) => {
  const { time } = req.body
  
  if (time) {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time format. Use HH:MM format (e.g., 14:30)'
      })
    }
  }
  
  next()
}
