import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '../ui'
import { BookingError } from '../../types'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorScreenProps {
  error: BookingError
  onRetry: () => void
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center safe-area-top safe-area-bottom">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error-100 mb-6">
            <AlertTriangle className="w-10 h-10 text-error-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Oops! Something went wrong
          </h2>
          
          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            {error.message || 'We encountered an unexpected error. Please try again.'}
          </p>
          
          <Card className="max-w-md mx-auto mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Error Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-left">
                <div>
                  <span className="text-sm font-medium text-neutral-500">Error Code:</span>
                  <p className="text-sm text-neutral-700 font-mono">{error.code}</p>
                </div>
                {error.details && (
                  <div>
                    <span className="text-sm font-medium text-neutral-500">Details:</span>
                    <p className="text-sm text-neutral-700">{JSON.stringify(error.details)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={onRetry}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Try Again
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              icon={<Home className="w-4 h-4" />}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 