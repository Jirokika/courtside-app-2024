import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'primary' | 'secondary'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'white',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const colorClasses = {
    white: 'text-white',
    primary: 'text-blue-500',
    secondary: 'text-cyan-500',
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <span className="sr-only">Loading...</span>
    </div>
  )
} 