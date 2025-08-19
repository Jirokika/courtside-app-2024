import React from 'react'
import { useAuth } from '../../utils/auth'
import { Button } from '../ui/Button'
import { ArrowLeft, Shield, User } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  onUnauthorized?: () => void
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  onUnauthorized
}) => {
  const { isAuthenticated, isLoading, error, user } = useAuth()

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Authenticating...</p>
        </div>
      </div>
    )
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>
  }

  // If user is authenticated, render children
  if (isAuthenticated && user) {
    return <>{children}</>
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>
  }

  // Default unauthorized state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center max-w-md w-full">
        <Shield className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
        
        <p className="text-gray-300 mb-6">
          {error 
            ? `Authentication failed: ${error}`
            : 'Please open this app in Telegram to access this feature.'
          }
        </p>

        {error && (
          <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-300/30 mb-6">
            <p className="text-red-300 text-sm">
              Error: {error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 py-3 rounded-xl"
          >
            <User className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          
          {onUnauthorized && (
            <Button
              onClick={onUnauthorized}
              variant="ghost"
              className="w-full text-gray-300 hover:text-white border border-gray-300/30 py-3 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </Button>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-400">
          <p>This feature requires a valid Telegram account.</p>
          <p>Please open this app through Telegram.</p>
        </div>
      </div>
    </div>
  )
}

// Hook to check if user can access a feature
export const useAuthGuard = (feature: string) => {
  const { isAuthenticated, user } = useAuth()
  
  return {
    canAccess: isAuthenticated && !!user,
    user,
    feature
  }
}

// Component for showing authentication status
export const AuthStatus: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        <span>Authenticating...</span>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <User className="w-4 h-4 text-green-400" />
        <span className="text-green-400">Authenticated</span>
        <span className="text-gray-400">•</span>
        <span>{user.firstName}</span>
        <span className="text-gray-400">•</span>
        <span>{user.credits} credits</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <Shield className="w-4 h-4 text-yellow-400" />
      <span className="text-yellow-400">Guest Mode</span>
    </div>
  )
} 