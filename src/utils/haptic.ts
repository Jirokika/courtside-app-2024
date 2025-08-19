// Haptic feedback utility for mobile devices
export class HapticFeedback {
  private static isSupported(): boolean {
    return 'vibrate' in navigator || 'Vibrate' in navigator
  }

  /**
   * Light haptic feedback for button presses
   */
  static light(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate(10)
      } catch (error) {
        console.warn('Haptic feedback not supported:', error)
      }
    }
  }

  /**
   * Medium haptic feedback for selections
   */
  static medium(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate([10, 10, 10])
      } catch (error) {
        console.warn('Haptic feedback not supported:', error)
      }
    }
  }

  /**
   * Heavy haptic feedback for important actions
   */
  static heavy(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate([20, 10, 20])
      } catch (error) {
        console.warn('Haptic feedback not supported:', error)
      }
    }
  }

  /**
   * Success haptic feedback pattern
   */
  static success(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate([10, 50, 10])
      } catch (error) {
        console.warn('Haptic feedback not supported:', error)
      }
    }
  }

  /**
   * Error haptic feedback pattern
   */
  static error(): void {
    if (this.isSupported()) {
      try {
        navigator.vibrate([50, 10, 50])
      } catch (error) {
        console.warn('Haptic feedback not supported:', error)
      }
    }
  }
}

// React hook for haptic feedback
export const useHaptic = () => {
  return {
    light: HapticFeedback.light,
    medium: HapticFeedback.medium,
    heavy: HapticFeedback.heavy,
    success: HapticFeedback.success,
    error: HapticFeedback.error,
  }
} 