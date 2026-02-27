export default function PoweredByFooter() {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
      <a
        href="https://getlotusai.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lotus-logo.png"
          alt="Lotus AI"
          style={{
            height: 20,
            width: 20,
            objectFit: 'contain',
            borderRadius: 4,
            mixBlendMode: 'lighten',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-syne), sans-serif',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}
        >
          Powered by Lotus AI
        </span>
      </a>
    </div>
  )
}
