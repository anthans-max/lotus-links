interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        borderStyle: 'dashed',
        borderColor: 'var(--border2)',
      }}
    >
      {icon && (
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      )}
      <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', maxWidth: 360, margin: '0 auto 1.25rem' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
