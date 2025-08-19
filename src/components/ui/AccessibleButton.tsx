import React from 'react'
import { Button, ButtonProps } from './Button'

interface AccessibleButtonProps extends ButtonProps {
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaPressed?: boolean
  role?: string
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaPressed,
  role = 'button',
  onClick,
  disabled,
  className,
  ...props
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (onClick && !disabled) {
        onClick(event as any)
      }
    }
  }

  return (
    <Button
      {...props}
      onClick={onClick}
      disabled={disabled}
      className={className}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-pressed={ariaPressed}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </Button>
  )
} 