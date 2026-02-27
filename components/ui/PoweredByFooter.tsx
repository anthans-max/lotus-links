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
            height: 32,
            width: 32,
            borderRadius: 4,
            mixBlendMode: 'lighten',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-syne), sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#ffffff',
          }}
        >
          Powered by Lotus AI
        </span>
      </a>
    </div>
  )
}
