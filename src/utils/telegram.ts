// Telegram WebApp utilities
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
            is_premium?: boolean
            added_to_attachment_menu?: boolean
            allows_write_to_pm?: boolean
            photo_url?: string
          }
          chat?: {
            id: number
            type: string
            title?: string
            username?: string
            photo_url?: string
          }
          chat_type?: string
          chat_instance?: string
          start_param?: string
          can_send_after?: number
          auth_date: number
          hash: string
        }
        ready(): void
        expand(): void
        close(): void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isProgressVisible: boolean
          isActive: boolean
          setText(text: string): void
          onClick(fn: () => void): void
          show(): void
          hide(): void
          enable(): void
          disable(): void
          showProgress(leaveActive?: boolean): void
          hideProgress(): void
        }
        BackButton: {
          isVisible: boolean
          onClick(fn: () => void): void
          show(): void
          hide(): void
        }
        HapticFeedback: {
          impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
          notificationOccurred(type: 'error' | 'success' | 'warning'): void
          selectionChanged(): void
        }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
        colorScheme: 'light' | 'dark'
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        headerColor: string
        backgroundColor: string
        // Duplicated properties handled above with proper types
        isClosingConfirmationEnabled: boolean
        enableClosingConfirmation(): void
        disableClosingConfirmation(): void
        onEvent(eventType: string, eventHandler: () => void): void
        offEvent(eventType: string, eventHandler: () => void): void
        sendData(data: string): void
        switchInlineQuery(query: string, choose_chat_types?: string[]): void
        openLink(url: string, options?: { try_instant_view?: boolean }): void
        openTelegramLink(url: string): void
        openInvoice(url: string, callback?: (status: string) => void): void
        showPopup(params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text: string }> }, callback?: (buttonId: string) => void): void
        showAlert(message: string, callback?: () => void): void
        showConfirm(message: string, callback?: (confirmed: boolean) => void): void
        showScanQrPopup(params: { text?: string }, callback?: (data: string) => void): void
        closeScanQrPopup(): void
        readTextFromClipboard(callback?: (data: string | null) => void): void
        requestWriteAccess(callback?: (access: boolean) => void): void
        requestContact(callback?: (contact: { phone_number: string; first_name: string; last_name?: string; user_id?: number; vcard?: string } | null) => void): void
        invokeCustomMethod(method: string, params: any, callback?: (result: any) => void): void
        invokeCustomMethod(method: string, callback?: (result: any) => void): void
        isVersionAtLeast(version: string): boolean
        setHeaderColor(color: string): void
        setBackgroundColor(color: string): void
      }
    }
  }
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  added_to_attachment_menu?: boolean
  allows_write_to_pm?: boolean
  photo_url?: string
}

export interface TelegramChat {
  id: number
  type: string
  title?: string
  username?: string
  photo_url?: string
}

export interface TelegramWebAppData {
  user?: TelegramUser
  chat?: TelegramChat
  chat_type?: string
  chat_instance?: string
  start_param?: string
  can_send_after?: number
  auth_date: number
  hash: string
}

// Enhanced Telegram WebApp initialization with retry mechanism
export const initTelegramWebApp = (): boolean => {
  console.log('🔧 Initializing Telegram WebApp...')
  
  if (typeof window === 'undefined') {
    console.warn('⚠️ Window not available - running in SSR mode')
    return false
  }

  if (!window.Telegram?.WebApp) {
    console.warn('⚠️ Telegram WebApp not available - running in development mode')
    return false
  }

  try {
    // Initialize the WebApp
    window.Telegram.WebApp.ready()
    console.log('✅ Telegram WebApp ready() called successfully')
    
    // Expand the WebApp to full height with timeout to avoid message channel issues
    setTimeout(() => {
      try {
        window.Telegram.WebApp.expand()
        console.log('✅ Telegram WebApp expand() called successfully')
      } catch (expandError) {
        console.warn('⚠️ Could not expand WebApp (this is normal in some environments):', expandError)
      }
    }, 100)
    
    // Log detailed information for debugging
    console.log('📱 WebApp initialization details:')
    console.log('  - initData:', window.Telegram.WebApp.initData)
    console.log('  - initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe)
    console.log('  - user:', window.Telegram.WebApp.initDataUnsafe.user)
    console.log('  - chat:', window.Telegram.WebApp.initDataUnsafe.chat)
    console.log('  - theme:', window.Telegram.WebApp.colorScheme)
    console.log('  - viewport height:', window.Telegram.WebApp.viewportHeight)
    console.log('  - is expanded:', window.Telegram.WebApp.isExpanded)
    
    return true
  } catch (error) {
    console.error('❌ Error initializing Telegram WebApp:', error)
    return false
  }
}

// Enhanced getCurrentUser with retry mechanism and better fallback
export const getCurrentUser = (): TelegramUser | null => {
  console.log('🔍 Getting current Telegram user...')
  
  if (typeof window === 'undefined') {
    console.warn('⚠️ Window not available - SSR mode')
    return getDevelopmentUser()
  }

  if (!window.Telegram?.WebApp) {
    console.warn('⚠️ Telegram WebApp not available')
    return getDevelopmentUser()
  }

  // Try to get user from initDataUnsafe
  const user = window.Telegram.WebApp.initDataUnsafe.user
  if (user && user.id) {
    console.log('✅ Telegram user found:', user)
    return user
  }

  // Check if we have initData that might contain user info
  const initData = window.Telegram.WebApp.initData
  if (initData) {
    console.log('📋 Found initData, attempting to parse...')
    try {
      // Try to parse initData if it's available
      const params = new URLSearchParams(initData)
      const userParam = params.get('user')
      if (userParam) {
        const parsedUser = JSON.parse(decodeURIComponent(userParam))
        console.log('✅ Parsed user from initData:', parsedUser)
        return parsedUser
      }
    } catch (error) {
      console.error('❌ Error parsing initData:', error)
    }
  }

  console.warn('⚠️ No Telegram user found in WebApp data')
  console.log('📊 Available WebApp data:', {
    initData: window.Telegram.WebApp.initData,
    initDataUnsafe: window.Telegram.WebApp.initDataUnsafe,
    hasUser: !!window.Telegram.WebApp.initDataUnsafe.user,
    userKeys: window.Telegram.WebApp.initDataUnsafe.user ? Object.keys(window.Telegram.WebApp.initDataUnsafe.user) : []
  })

  return getDevelopmentUser()
}

// Development fallback user
const getDevelopmentUser = (): TelegramUser => {
  console.log('🛠️ Using development fallback user')
  return {
    id: 123456789,
    first_name: 'Test User',
    last_name: 'Development',
    username: 'testuser',
    language_code: 'en',
    is_premium: false,
    added_to_attachment_menu: false,
    allows_write_to_pm: true,
    photo_url: 'https://via.placeholder.com/150'
  }
}

// Enhanced getTelegramWebAppData with better error handling
export const getTelegramWebAppData = (): TelegramWebAppData | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const data = window.Telegram.WebApp.initDataUnsafe
    console.log('📊 Telegram WebApp data retrieved:', data)
    return data
  }
  console.warn('⚠️ No Telegram WebApp data available')
  return null
}

// Check if running in Telegram WebApp with enhanced detection
export const isTelegramWebApp = (): boolean => {
  const isAvailable = typeof window !== 'undefined' && !!window.Telegram?.WebApp
  console.log('🔍 Telegram WebApp availability check:', isAvailable)
  return isAvailable
}

// Get Telegram theme
export const getTelegramTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.colorScheme
  }
  return 'light'
}

// Get Telegram theme colors
export const getTelegramThemeColors = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp.themeParams
  }
  return {
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#999999',
    link_color: '#2481cc',
    button_color: '#2481cc',
    button_text_color: '#ffffff'
  }
}

// Show Telegram alert
export const showTelegramAlert = (message: string, callback?: () => void): void => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.showAlert(message, callback)
  } else {
    alert(message)
    if (callback) callback()
  }
}

// Show Telegram confirm dialog
export const showTelegramConfirm = (message: string, callback?: (confirmed: boolean) => void): void => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.showConfirm(message, callback)
  } else {
    const confirmed = confirm(message)
    if (callback) callback(confirmed)
  }
}

// Send data to Telegram bot
export const sendTelegramData = (data: string): void => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.sendData(data)
  } else {
    console.log('📤 Data to send to Telegram:', data)
  }
}

// Close Telegram WebApp
export const closeTelegramWebApp = (): void => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.close()
  } else {
    console.log('📱 Would close Telegram WebApp')
  }
}

// Enhanced haptic feedback
export const hapticFeedback = {
  light: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
    }
  },
  medium: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }
  },
  heavy: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy')
    }
  },
  success: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
    }
  },
  error: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error')
    }
  },
  warning: () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning')
    }
  }
} 