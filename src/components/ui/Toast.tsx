import React, { useEffect, useState } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'error' | 'info' | 'warning'

interface ToastProps {
  type: ToastType
  message: string
  duration?: number
  onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({
  type,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white border-red-400'
      case 'warning':
        return 'bg-yellow-500 text-white border-yellow-400'
      case 'info':
        return 'bg-blue-500 text-white border-blue-400'
      default:
        return 'bg-blue-500 text-white border-blue-400'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white/10 backdrop-blur-md rounded-xl border p-4 shadow-lg transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${getStyles()}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
} 