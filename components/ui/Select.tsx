'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, options, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className="label" style={{ display: 'block' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`input ${className}`}
          style={error ? { borderColor: 'var(--over)' } : undefined}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.75rem', marginTop: '0.25rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
