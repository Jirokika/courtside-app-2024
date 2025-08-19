import React from 'react'
import { cn } from '../../utils/cn'
import { HapticFeedback } from '../../utils/haptic'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline'
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'none'
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  haptic = 'light',
  className,
  disabled,
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
  
  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-soft',
    secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-500 shadow-soft',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 shadow-soft',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500 shadow-soft',
    error: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-soft',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500',
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback
    if (haptic !== 'none') {
      switch (haptic) {
        case 'light':
          HapticFeedback.light()
          break
        case 'medium':
          HapticFeedback.medium()
          break
        case 'heavy':
          HapticFeedback.heavy()
          break
        case 'success':
          HapticFeedback.success()
          break
        case 'error':
          HapticFeedback.error()
          break
      }
    }

    // Call original onClick handler
    onClick?.(e)
  }
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  )
} 