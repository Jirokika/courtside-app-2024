/**
 * Debounce utility to prevent rapid-fire function calls
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args)
    }, delay)
  }
}

/**
 * Throttle utility to limit function calls to once per interval
 * @param func Function to throttle
 * @param delay Delay in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCall >= delay) {
      lastCall = now
      func.apply(null, args)
    }
  }
}

/**
 * Create a submission guard to prevent duplicate submissions
 * @param submitFunction The function to guard
 * @param delay Delay in milliseconds (default: 2000)
 * @returns Guarded function with loading state
 */
export const createSubmissionGuard = <T extends (...args: any[]) => Promise<any>>(
  submitFunction: T,
  delay: number = 2000
) => {
  let isSubmitting = false
  let submissionTimeout: NodeJS.Timeout | null = null
  
  const guardedFunction = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (isSubmitting) {
      console.log('🚫 Submission blocked: Already in progress')
      throw new Error('Submission already in progress')
    }
    
    isSubmitting = true
    
    // Clear any existing timeout
    if (submissionTimeout) {
      clearTimeout(submissionTimeout)
    }
    
    try {
      const result = await submitFunction(...args)
      return result
    } finally {
      // Set timeout to prevent immediate resubmission
      submissionTimeout = setTimeout(() => {
        isSubmitting = false
        submissionTimeout = null
      }, delay)
    }
  }
  
  // Return both the guarded function and a way to check submission status
  return {
    submit: guardedFunction,
    isSubmitting: () => isSubmitting,
    reset: () => {
      isSubmitting = false
      if (submissionTimeout) {
        clearTimeout(submissionTimeout)
        submissionTimeout = null
      }
    }
  }
} 