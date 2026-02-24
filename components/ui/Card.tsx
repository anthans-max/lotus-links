interface CardProps {
  children: React.ReactNode
  gold?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function Card({ children, gold, className = '', style }: CardProps) {
  return (
    <div
      className={`card ${gold ? 'card-gold' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
