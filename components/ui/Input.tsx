'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="label" style={{ display: 'block' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`input ${className}`}
          style={error ? { borderColor: 'var(--over)' } : undefined}
          {...props}
        />
        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
