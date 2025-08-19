import React from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-neutral-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            'block w-full px-4 py-3 border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder-neutral-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all duration-200',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-error-500 focus:border-error-500 focus:ring-error-100',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-neutral-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-error-600' : 'text-neutral-500'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
} 