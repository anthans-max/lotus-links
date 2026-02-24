type BadgeVariant = 'gold' | 'green' | 'gray' | 'blue'

const STATUS_MAP: Record<string, BadgeVariant> = {
  upcoming: 'gold',
  active: 'green',
  completed: 'gray',
  draft: 'blue',
  not_started: 'gray',
  in_progress: 'green',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  status?: string
}

export default function Badge({ children, variant, status }: BadgeProps) {
  const v = variant || (status ? STATUS_MAP[status] ?? 'gray' : 'gray')
  return (
    <span className={`badge badge-${v}`}>
      {children}
    </span>
  )
}
