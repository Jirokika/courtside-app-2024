import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        telegramId: number
        [key: string]: any
      }
    }
  }
}

export {}
