import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastType } from '../components/ui/Toast'

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<{
    type: ToastType
    message: string
    duration?: number
  } | null>(null)

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    setToast({ type, message, duration })
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  )
} 