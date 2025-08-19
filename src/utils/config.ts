// Configuration constants for the Courtside app
export const CONFIG = {
  // External service URLs
  EXTERNAL: {
    ABA_PAYMENT_URL: 'https://pay.ababank.com/aZFJ8PdS5wroBfW98',
    GOOGLE_MAPS_LINK: 'https://maps.app.goo.gl/TDxPqDFjD2tskzGj8',
    TELEGRAM_WEB_APP_JS: 'https://telegram.org/js/telegram-web-app.js',
    BOT_FATHER_URL: 'https://t.me/botfather',
  },
  
  // Default values
  DEFAULTS: {
    PORT: 8080,
    CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
  
  // Feature flags
  FEATURES: {
    ENABLE_CACHING: true,
    ENABLE_RETRIES: true,
    ENABLE_ANALYTICS: true,
    ENABLE_NOTIFICATIONS: true,
  }
} as const

// Environment-based configuration
export const getConfig = () => {
  const isDevelopment = import.meta.env.DEV
  const isProduction = import.meta.env.PROD
  
  return {
    ...CONFIG,
    ENV: {
      isDevelopment,
      isProduction,
      nodeEnv: import.meta.env.MODE,
    }
  }
}
