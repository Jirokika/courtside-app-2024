import React, { useState } from 'react'
import { ScreenProps } from '../../types'
import { ScaleButton } from '../ui/VisualPolish'
import { getCurrentUser } from '../../utils/telegram'
import { useApi } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'

interface WelcomeScreenProps extends ScreenProps {}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  navigateTo,
}) => {
  const [isRegistering, setIsRegistering] = useState(false)
  const { authenticateTelegram, createUser } = useApi()
  const { showToast } = useToast()

  const handleContinue = async () => {
    try {
      setIsRegistering(true)
      
      // Get current Telegram user
      const telegramUser = getCurrentUser()
      
      if (!telegramUser) {
        showToast('info', 'Welcome! Using demo mode.')
        navigateTo('home')
        return
      }

      // Try to authenticate first
      const authResponse = await authenticateTelegram(telegramUser)
      
      if (authResponse.success) {
        showToast('info', 'Welcome back!')
        navigateTo('home')
        return
      }

      // If authentication fails, try to create a new user
      const createResponse = await createUser({
        telegramId: telegramUser.id.toString(),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || '',
        username: telegramUser.username || '',
        photoUrl: telegramUser.photo_url || '',
        languageCode: telegramUser.language_code || 'en',
        isPremium: telegramUser.is_premium || false
      })
      
      if (createResponse.success) {
        // Try authentication again with the new user
        const retryAuthResponse = await authenticateTelegram(telegramUser)
        
        if (retryAuthResponse.success) {
          showToast('info', 'Welcome to Courtside!')
        } else {
          showToast('info', 'Welcome! Using demo mode.')
        }
      } else {
        showToast('error', 'Registration failed, using demo mode.')
      }
      
    } catch (error) {
      showToast('error', 'Registration failed, using demo mode.')
    } finally {
      setIsRegistering(false)
      navigateTo('home')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md text-center">
        {/* Main Content */}
        <div className="animate-fade-in">
          {/* Welcome Title */}
          <h1 className="text-4xl font-light text-white mb-4">Welcome to</h1>
          <h1 className="text-7xl font-black mb-12 leading-tight rainbow-text">Courtside</h1>
          
          {/* Slogan */}
          <p className="text-white/70 text-lg mb-20 animate-slide-up font-light">Tap, Pay, Play!</p>
          
          {/* Continue Button */}
          <div className="animate-bounce-in flex justify-center">
            <ScaleButton>
              <div className="rainbow-border" style={{ width: '280px' }}>
                <button 
                  onClick={handleContinue}
                  disabled={isRegistering}
                  className={`w-full backdrop-blur-md text-white py-5 rounded-3xl font-semibold text-lg transition-all duration-500 ${
                    isRegistering 
                      ? 'bg-white/10 cursor-not-allowed' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  {isRegistering ? 'Setting up...' : 'Continue'}
                </button>
              </div>
            </ScaleButton>
          </div>
        </div>
      </div>
    </div>
  )
} 