import React, { useState, useEffect, Suspense, lazy } from 'react'
import { initTelegramWebApp } from './utils/telegram'
import { AppState, AppScreen, BookingState } from './types'
import { ToastProvider } from './contexts/ToastContext'
import { AnalyticsManager } from './utils/analytics'
import { PointsTracker } from './utils/pointsTracker'
import { OfflineManager } from './utils/offline'
import { NotificationManager } from './utils/notifications'
import { LoadingScreen } from './components/screens/LoadingScreen'
import { authManager } from './utils/auth'

// Version check to ensure v2.0 is loaded
const APP_VERSION = '2.0.0'

// Lazy load all screen components for better performance
const WelcomeScreen = lazy(() => import('./components/screens/WelcomeScreen').then(module => ({ default: module.WelcomeScreen })))
const HomeScreen = lazy(() => import('./components/screens/HomeScreen').then(module => ({ default: module.HomeScreen })))
const BookingsScreen = lazy(() => import('./components/screens/BookingsScreen').then(module => ({ default: module.BookingsScreen })))
const CreditsScreen = lazy(() => import('./components/screens/CreditsScreen').then(module => ({ default: module.CreditsScreen })))
const PointsScreen = lazy(() => import('./components/screens/PointsScreen').then(module => ({ default: module.PointsScreen })))
const SportSelectionScreen = lazy(() => import('./components/screens/SportSelectionScreen').then(module => ({ default: module.SportSelectionScreen })))
const SimpleSportScreen = lazy(() => import('./components/screens/SimpleSportScreen').then(module => ({ default: module.SimpleSportScreen })))
const DateSelectionScreen = lazy(() => import('./components/screens/DateSelectionScreen').then(module => ({ default: module.DateSelectionScreen })))
const TimeSelectionScreen = lazy(() => import('./components/screens/TimeSelectionScreen').then(module => ({ default: module.TimeSelectionScreen })))
const DurationSelectionScreen = lazy(() => import('./components/screens/DurationSelectionScreen').then(module => ({ default: module.DurationSelectionScreen })))
const CourtSelectionScreen = lazy(() => import('./components/screens/CourtSelectionScreen').then(module => ({ default: module.CourtSelectionScreen })))
const BookingSummaryScreen = lazy(() => import('./components/screens/BookingSummaryScreen').then(module => ({ default: module.BookingSummaryScreen })))
// Removed BookingDetailsScreen import - using modal instead
const BookingModificationScreen = lazy(() => import('./components/screens/BookingModificationScreen').then(module => ({ default: module.BookingModificationScreen })))
const ModificationPaymentScreen = lazy(() => import('./components/screens/ModificationPaymentScreen').then(module => ({ default: module.ModificationPaymentScreen })))
const ModificationSuccessScreen = lazy(() => import('./components/screens/ModificationSuccessScreen').then(module => ({ default: module.ModificationSuccessScreen })))
const CancellationConfirmationScreen = lazy(() => import('./components/screens/CancellationConfirmationScreen').then(module => ({ default: module.CancellationConfirmationScreen })))
const ConfirmationScreen = lazy(() => import('./components/screens/ConfirmationScreen').then(module => ({ default: module.ConfirmationScreen })))
const SharedBookingScreen = lazy(() => import('./components/screens/SharedBookingScreen').then(module => ({ default: module.SharedBookingScreen })))
const ErrorScreen = lazy(() => import('./components/screens/ErrorScreen').then(module => ({ default: module.ErrorScreen })))
const NotificationsScreen = lazy(() => import('./components/screens/NotificationsScreen').then(module => ({ default: module.NotificationsScreen })))


const initialBookingState: BookingState = {
  mode: 'simple',
  selectedSport: null,
  selectedDates: [],
  selectedTimeSlot: null,
  selectedDuration: 1,
  selectedCourts: [],
  simpleBooking: null,
  advancedBooking: null,
}

const initialAppState: AppState = {
  currentScreen: 'welcome',
  bookingState: initialBookingState,
  user: null,
  isLoading: true,
  error: null,
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(initialAppState)


  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.warn('⚠️ App initialization timeout, forcing fallback')
          setAppState(prev => ({
            ...prev,
            isLoading: false,
            currentScreen: 'welcome'
          }))
        }, 10000) // 10 second timeout

        // Add a shorter timeout for screen rendering
        const screenTimeout = setTimeout(() => {
          console.warn('⚠️ Screen rendering timeout, checking for issues')
          if (appState.isLoading) {
            console.warn('⚠️ App still loading after 5 seconds, forcing fallback')
            setAppState(prev => ({
              ...prev,
              isLoading: false,
              currentScreen: 'welcome'
            }))
          }
        }, 5000) // 5 second timeout for screen rendering

        // Check for shared booking URL
        const path = window.location.pathname
        if (path.startsWith('/b/')) {
          const shortCode = path.replace('/b/', '')
          clearTimeout(timeout)
          clearTimeout(screenTimeout)
          setAppState(prev => ({
            ...prev,
            currentScreen: 'shared-booking',
            isLoading: false,
          }))
          return
        }

        // Initialize Telegram Web App
        const isReady = initTelegramWebApp()
        if (!isReady) {
          console.warn('Telegram Web App not available - using fallback mode')
        }

        // Initialize Phase 3.1 features
        AnalyticsManager.init()
        
        // Initialize points tracking
        PointsTracker.initDailyTracking()
        
        // Request notification permission
        if (NotificationManager.isSupported()) {
          await NotificationManager.requestPermission()
        }

        // Initialize authentication
        const authState = await authManager.initialize()
        
        clearTimeout(timeout)
        clearTimeout(screenTimeout)
        
        // Set app state based on authentication result
        setAppState(prev => ({
          ...prev,
          user: authState.user,
          isLoading: false,
        }))
        
        // Show authentication status to user
        if (authState.isAuthenticated) {
          console.log('✅ User authenticated successfully')
        } else if (authState.error) {
          console.warn('⚠️ Authentication failed:', authState.error)
        } else {
          console.log('👤 User in guest mode')
        }
        
        /* 
        // Backend authentication (commented out due to rate limiting)
        if (telegramUser) {
          try {
            console.log('🔐 Attempting backend authentication...')
            const authResponse = await apiService.authenticateTelegram(telegramUser)
            console.log('🔐 Auth response:', authResponse)
            
            if (authResponse.success && authResponse.data) {
              // Get the authenticated user data from backend
              const userResponse = await apiService.getCurrentUser()
              console.log('👤 User response:', userResponse)
              
              if (userResponse.success && userResponse.data) {
                console.log('✅ Backend authentication successful')
                clearTimeout(timeout)
                setAppState(prev => ({
                  ...prev,
                  user: userResponse.data,
                  isLoading: false,
                }))
                return
              }
            }
          } catch (error) {
            console.error('❌ Authentication failed:', error)
          }
        }
        
        // Fallback to Telegram user data if backend auth fails
        console.log('🔄 Using fallback authentication with Telegram user')
        clearTimeout(timeout)
        setAppState(prev => ({
          ...prev,
          user: telegramUser,
          isLoading: false,
        }))
        */
      } catch (error) {
        console.error('❌ App initialization error:', error)
        setAppState(prev => ({
          ...prev,
          error: {
            code: 'INIT_ERROR',
            message: 'Failed to initialize app',
            details: error,
          },
          isLoading: false,
        }))
      }
    }

    initializeApp()
  }, [])

  const navigateTo = (screen: AppScreen) => {
    try {
      setAppState(prev => ({
        ...prev,
        currentScreen: screen,
        error: null,
      }))
    } catch (error) {
      console.error('❌ App: Error in navigateTo:', error)
    }
  }

  const updateBookingState = (updates: Partial<BookingState>) => {
    setAppState(prev => ({
      ...prev,
      bookingState: {
        ...prev.bookingState,
        ...updates,
      },
    }))
  }

  const setError = (error: AppState['error']) => {
    setAppState(prev => ({
      ...prev,
      error,
      currentScreen: 'error',
    }))
  }

  const resetBooking = () => {
    setAppState(prev => ({
      ...prev,
      bookingState: initialBookingState,
      currentScreen: 'welcome',
      error: null,
    }))
  }

  if (appState.isLoading) {
    return <LoadingScreen />
  }

  if (appState.error && appState.currentScreen === 'error') {
    return (
      <ErrorScreen
        error={appState.error}
        onRetry={() => navigateTo('welcome')}
      />
    )
  }

  const screenProps = {
    navigateTo,
    updateBookingState,
    setError,
    resetBooking,
    appState,
  }

  // Safety check to ensure all required functions are available
  if (typeof navigateTo !== 'function' || typeof updateBookingState !== 'function') {
    console.error('App: Required functions not available:', { 
      navigateTo: typeof navigateTo, 
      updateBookingState: typeof updateBookingState 
    })
    return <LoadingScreen />
  }

  const renderScreen = () => {
    try {
      switch (appState.currentScreen) {
      case 'welcome':
        return <WelcomeScreen {...screenProps} />
      
      case 'home':
        return <HomeScreen {...screenProps} />
      
      case 'bookings':
        return <BookingsScreen {...screenProps} />
      
      case 'credits':
        return <CreditsScreen {...screenProps} />
      
      case 'points':
        return <PointsScreen {...screenProps} />
      
      case 'sport-selection':
        return <SportSelectionScreen {...screenProps} />
      
      case 'date-selection':
        return <DateSelectionScreen {...screenProps} />
      
      case 'time-selection':
        return <TimeSelectionScreen {...screenProps} />
      
      case 'duration-selection':
        return <DurationSelectionScreen {...screenProps} />
      
      case 'court-selection':
        return <CourtSelectionScreen {...screenProps} />
      
      case 'booking-summary':
        return <BookingSummaryScreen {...screenProps} />
      
      // Removed booking-details screen - using modal instead
      
      case 'booking-modification':
        return <BookingModificationScreen {...screenProps} />
      
      case 'modification-payment':
        return <ModificationPaymentScreen {...screenProps} />
      
      case 'modification-success':
        return <ModificationSuccessScreen {...screenProps} />
      
      case 'cancellation-confirmation':
        return <CancellationConfirmationScreen {...screenProps} />
      
      case 'confirmation':
        return <ConfirmationScreen {...screenProps} />
      
            case 'shared-booking':
        return <SharedBookingScreen />

      case 'notifications':
        return <NotificationsScreen {...screenProps} />

      default:
        return <HomeScreen {...screenProps} />
    }
    } catch (error) {
      console.error('❌ App: Error rendering screen:', appState.currentScreen, error)
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="text-center text-white p-6">
            <h1 className="text-2xl font-bold mb-4">Error Loading Screen</h1>
            <p className="mb-4">Something went wrong while loading the {appState.currentScreen} screen.</p>
            <button 
              onClick={() => navigateTo('home')}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl mr-2"
            >
              Go Home
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <ToastProvider>
      <Suspense fallback={<LoadingScreen />}>
        {renderScreen()}
      </Suspense>
    </ToastProvider>
  )
}

export default App 