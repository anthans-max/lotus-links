'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'gold' | 'outline' | 'ghost' | 'destructive'
type Size = 'default' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  gold: 'btn-gold',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  // Amber/dark — NOT red
  destructive: 'btn-outline',
}

const destructiveStyle: React.CSSProperties = {
  borderColor: 'var(--over-border)',
  color: 'var(--over)',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'gold', size = 'default', loading, className = '', style, disabled, children, ...props }, ref) => {
    const classes = [
      'btn',
      variantClass[variant],
      size === 'sm' ? 'btn-sm' : '',
      className,
    ].filter(Boolean).join(' ')

    const mergedStyle = variant === 'destructive'
      ? { ...destructiveStyle, ...style }
      : style

    return (
      <button
        ref={ref}
        className={classes}
        style={mergedStyle}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="spin" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
