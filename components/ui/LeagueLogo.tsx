import Image from 'next/image'

interface LeagueLogoProps {
  logoUrl: string | null | undefined
  leagueName: string
  /** Explicit pixel size for compact contexts (e.g. 28 for status bar).
   *  Omit to use the responsive CSS class (44px mobile / 56px desktop). */
  size?: number
  /** Inner padding around the image. Defaults to 8. */
  pad?: number
}

/**
 * League logo display container.
 * Renders nothing if logoUrl is absent — no empty box, no placeholder.
 */
export default function LeagueLogo({
  logoUrl,
  leagueName,
  size,
  pad = 8,
}: LeagueLogoProps) {
  if (!logoUrl) return null

  const containerStyle: React.CSSProperties = {
    borderRadius: 10,
    background: '#0D2818',
    border: '1px solid rgba(183,149,11,0.3)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    flexShrink: 0,
    padding: pad,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
    ...(size ? { width: size, height: size } : {}),
  }

  return (
    <div
      className={size ? undefined : 'league-logo-ctr'}
      style={containerStyle}
    >
      <Image
        src={logoUrl}
        alt={`${leagueName} logo`}
        width={56}
        height={56}
        style={{ objectFit: 'contain', width: '100%', height: '100%', display: 'block' }}
        sizes="56px"
      />
    </div>
  )
}
