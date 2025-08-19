import React, { Suspense, lazy, memo } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

// Lazy load components for better performance
export const LazyComponent = ({ 
  component: Component, 
  fallback = <LoadingSpinner size="md" color="white" />
}: { 
  component: React.ComponentType<any>
  fallback?: React.ReactNode 
}) => (
  <Suspense fallback={fallback}>
    <Component />
  </Suspense>
)

// Memoized components for better performance
export const MemoizedComponent = memo(({ children }: { children: React.ReactNode }) => (
  <>{children}</>
))

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const startTime = React.useRef<number>(0)
  
  const startTimer = () => {
    startTime.current = performance.now()
  }
  
  const endTimer = (action: string) => {
    const endTime = performance.now()
    const duration = endTime - startTime.current
    console.log(`⏱️ ${action} took ${duration.toFixed(2)}ms`)
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`🐌 Slow operation detected: ${action} took ${duration.toFixed(2)}ms`)
    }
  }
  
  return { startTimer, endTimer }
}

// Debounce hook for performance
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
} 