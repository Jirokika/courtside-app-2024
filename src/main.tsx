import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize Telegram Web App
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          isProgressVisible: boolean
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          showProgress: (leaveActive?: boolean) => void
          hideProgress: () => void
        }
        BackButton: {
          isVisible: boolean
          onClick: (callback: () => void) => void
          show: () => void
          hide: () => void
        }
        themeParams: {
          bg_color: string
          text_color: string
          hint_color: string
          link_color: string
          button_color: string
          button_text_color: string
        }
        colorScheme: 'light' | 'dark'
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        headerColor: string
        backgroundColor: string
        isClosingConfirmationEnabled: boolean
        enableClosingConfirmation: () => void
        disableClosingConfirmation: () => void
        onEvent: (eventType: string, eventHandler: () => void) => void
        offEvent: (eventType: string, eventHandler: () => void) => void
        sendData: (data: string) => void
        switchInlineQuery: (query: string, choose_chat_types?: string[]) => void
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void
        openTelegramLink: (url: string) => void
        openInvoice: (url: string, callback?: (status: string) => void) => void
        showPopup: (params: {
          title: string
          message: string
          buttons: Array<{
            id?: string
            type: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
            text: string
          }>
        }, callback?: (buttonId: string) => void) => void
        showAlert: (message: string, callback?: () => void) => void
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
        showScanQrPopup: (params: {
          text?: string
        }, callback?: (data: string) => void) => void
        closeScanQrPopup: () => void
        readTextFromClipboard: (callback?: (data: string | null) => void) => void
        requestWriteAccess: (callback?: (access: boolean) => void) => void
        requestContact: (callback?: (contact: {
          phone_number: string
          first_name: string
          last_name?: string
          user_id?: number
          vcard?: string
        }) => void) => void
        invokeCustomMethod: (method: string, params?: any) => void
        isVersionAtLeast: (version: string) => boolean
        platform: string
        version: string
        initData: string
        initDataUnsafe: {
          query_id?: string
          user?: {
            id: number
            is_bot?: boolean
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
            is_premium?: boolean
            added_to_attachment_menu?: boolean
            allows_write_to_pm?: boolean
            photo_url?: string
          }
          receiver?: {
            id: number
            type: 'user' | 'group' | 'supergroup' | 'channel'
            title?: string
            username?: string
            photo_url?: string
          }
          chat?: {
            id: number
            type: 'group' | 'supergroup' | 'channel'
            title: string
            username?: string
            photo_url?: string
          }
          chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel'
          chat_instance?: string
          start_param?: string
          can_send_after?: number
          auth_date: number
          hash: string
        }
        isIframe: boolean
      }
    }
  }
}

// Enhanced error suppression for development
if (import.meta.env.DEV) {
  // Override console.error to filter common development errors
  const originalConsoleError = console.error
  console.error = (...args) => {
    const message = args.join(' ')
    if (message.includes('message channel closed') || 
        message.includes('vendor.js:151') ||
        message.includes('A listener indicated an asynchronous response') ||
        message.includes('Failed to load resource') ||
        message.includes('404') ||
        message.includes('HMR')) {
      return // Don't log these errors
    }
    originalConsoleError.apply(console, args)
  }

  // Suppress unhandled errors
  window.addEventListener('error', (event) => {
    if (event.message.includes('message channel closed') || 
        event.message.includes('vendor.js') ||
        event.filename?.includes('vendor.js') ||
        event.filename?.includes('index-') ||
        event.message.includes('Failed to load resource')) {
      event.preventDefault()
      return false
    }
  })

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('message channel closed') ||
        event.reason?.message?.includes('vendor.js') ||
        event.reason?.message?.includes('Failed to load resource')) {
      event.preventDefault()
      return false
    }
  })

  // Suppress resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement
      if (target.tagName === 'SCRIPT' || target.tagName === 'LINK') {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href
        if (src && (src.includes('index-') || src.includes('vendor.js'))) {
          event.preventDefault()
          return false
        }
      }
    }
  }, true)
}

// Initialize the Telegram Web App
const initializeTelegramWebApp = () => {
  if (!window.Telegram?.WebApp) {
    return
  }

  try {
    window.Telegram.WebApp.ready()
    
    setTimeout(() => {
      try {
        if (!window.Telegram.WebApp.isExpanded) {
          window.Telegram.WebApp.expand()
        }
      } catch (expandError) {
        // Silently handle expand errors
      }
    }, 500)
    
  } catch (error) {
    // Silently handle initialization errors
  }
}

// Initialize with a slight delay to ensure DOM is ready
setTimeout(initializeTelegramWebApp, 100)

// Register service worker with improved error handling and timing
if ('serviceWorker' in navigator) {
  // Wait for the page to load before registering the service worker
  window.addEventListener('load', () => {
    // Add a small delay to ensure the page is fully loaded
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { 
        updateViaCache: 'none',
        scope: '/'
      })
        .then((registration) => {
          // Check if there's an update available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available, reload the page
                  window.location.reload()
                }
              })
            }
          })
          
          // Force update check
          registration.update()
          
          // Check for updates every hour
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
          // Don't show this error to users in production
          if (import.meta.env.DEV) {
            console.warn('Service Worker error (development only):', error)
          }
        })
    }, 1000) // 1 second delay to ensure page is fully loaded
  })
}

// Ensure root element exists before rendering
const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} else {
  console.error('Root element not found - cannot render app')
  // Create root element if it doesn't exist
  const newRoot = document.createElement('div')
  newRoot.id = 'root'
  document.body.appendChild(newRoot)
  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} 