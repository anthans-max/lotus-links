interface SpinnerProps {
  size?: number
}

export default function Spinner({ size = 24 }: SpinnerProps) {
  return (
    <div
      className="spin"
      style={{
        width: size,
        height: size,
        border: '2px solid var(--gold-dim)',
        borderTopColor: 'var(--gold)',
        borderRadius: '50%',
        margin: '0 auto',
      }}
    />
  )
}
