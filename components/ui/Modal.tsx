'use client'

import { useEffect, useRef } from 'react'
import Button from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  confirmLabel?: string
  confirmDisabled?: boolean
  confirmLoading?: boolean
  onConfirm?: () => void
  destructive?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  confirmDisabled,
  confirmLoading,
  onConfirm,
  destructive,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      className="fade-in"
    >
      <div
        className="card"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '1rem' }}>
          {title}
        </h3>
        <div style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          {onConfirm && (
            <Button
              variant={destructive ? 'destructive' : 'gold'}
              size="sm"
              onClick={onConfirm}
              disabled={confirmDisabled}
              loading={confirmLoading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
