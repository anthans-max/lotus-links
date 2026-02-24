export default function PoweredByFooter() {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
      <a
        href="https://lotusailab.framer.ai/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          textDecoration: 'none',
          color: 'var(--text-dim)',
          transition: 'color 0.2s',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lotus-ai-lab-logo.png"
          alt="Lotus AI Lab"
          style={{
            height: 24,
            width: 'auto',
            borderRadius: 4,
            mixBlendMode: 'lighten',
          }}
        />
        <span style={{ fontSize: '0.65rem', fontFamily: 'var(--fm)', letterSpacing: '0.06em' }}>
          Powered by Lotus AI Lab
        </span>
      </a>
    </div>
  )
}
