'use client'

import Link from 'next/link'

interface PageHeaderProps {
  title: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, backHref, backLabel, action }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {backHref && (
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            fontFamily: 'var(--fm)',
            marginBottom: '0.75rem',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          &larr; {backLabel || 'Back'}
        </Link>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 400, color: 'var(--text)' }}>
          {title}
        </h1>
        {action && <div>{action}</div>}
      </div>
      <div className="gold-divider" />
    </div>
  )
}
