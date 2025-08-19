import React from 'react'
import { motion } from 'framer-motion'

// Fallback component in case motion is not available
const MotionFallback: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ 
  children, 
  className, 
  onClick 
}) => (
  <button className={className} onClick={onClick}>
    {children}
  </button>
)

// Safe motion component
const SafeMotion = motion || MotionFallback

// Smooth fade in animation
export const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({ 
  children, 
  delay = 0 
}) => (
  <SafeMotion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    {children}
  </SafeMotion.div>
)

// Smooth scale animation for buttons
export const ScaleButton: React.FC<{ 
  children: React.ReactNode
  onClick?: () => void
  className?: string
}> = ({ children, onClick, className }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (typeof onClick === 'function') {
      onClick()
    }
    // Silently ignore undefined onClick handlers instead of logging warnings
  }

  return (
    <SafeMotion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={className}
      transition={{ duration: 0.1 }}
    >
      {children}
    </SafeMotion.button>
  )
}

// Slide animation for screen transitions
export const SlideTransition: React.FC<{ 
  children: React.ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
}> = ({ children, direction = 'right' }) => {
  const variants = {
    enter: {
      x: direction === 'left' ? 300 : direction === 'right' ? -300 : 0,
      y: direction === 'up' ? 300 : direction === 'down' ? -300 : 0,
      opacity: 0
    },
    center: {
      x: 0,
      y: 0,
      opacity: 1
    },
    exit: {
      x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0,
      y: direction === 'up' ? -300 : direction === 'down' ? 300 : 0,
      opacity: 0
    }
  }

  return (
    <SafeMotion.div
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </SafeMotion.div>
  )
}

// Enhanced focus states
export const FocusRing: React.FC<{ 
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <div className={`focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 focus:outline-none ${className}`}>
    {children}
  </div>
)

// Pulse animation for loading states
export const PulseAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeMotion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    {children}
  </SafeMotion.div>
)

// Bounce animation for success states
export const BounceAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeMotion.div
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </SafeMotion.div>
)

// Shake animation for error states
export const ShakeAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeMotion.div
    animate={{ x: [0, -10, 10, -10, 10, 0] }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </SafeMotion.div>
) 