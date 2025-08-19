import React from 'react'
import { Loader2 } from 'lucide-react'

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-8">
            <div className="flex justify-center space-x-4 mb-4">
              <div className="w-6 h-6 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-6 h-6 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-6 h-6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
            <div className="flex justify-center space-x-4">
              <div className="w-6 h-6 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
              <div className="w-6 h-6 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              <div className="w-6 h-6 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '500ms' }}></div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-4">
            Courtside
          </h2>
          
          <p className="text-white/80 text-lg mb-8">
            Getting ready for you...
          </p>
          
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      </div>
    </div>
  )
} 