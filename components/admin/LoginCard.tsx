'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LoginCardProps {
  error?: string
}

export default function LoginCard({ error }: LoginCardProps) {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    // No need to setLoading(false) — page will navigate away on success
    // On error, Supabase redirects back to /login?error=...
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '-4rem',
          right: '-4rem',
          fontSize: '22rem',
          opacity: 0.025,
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        ⛳
      </div>

      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 40%, rgba(200,168,75,0.06), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'linear-gradient(135deg, var(--forest) 0%, var(--surface) 100%)',
          border: '1px solid var(--gold-border)',
          borderRadius: 2,
          padding: '2.5rem 2rem',
          position: 'relative',
          animation: 'fadeUp 0.6s ease',
        }}
      >
        {/* Inner corner glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '50%',
            background:
              'radial-gradient(ellipse at top right, rgba(200,168,75,0.07), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold), #5a3e10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 20px rgba(200,168,75,0.3)',
            }}
          >
            ⛳
          </div>
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.75rem',
              fontWeight: 400,
              color: 'var(--text)',
              lineHeight: 1.1,
              marginBottom: '0.3rem',
            }}
          >
            Lotus Links
          </div>
          <div
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              fontFamily: 'var(--fm)',
            }}
          >
            Tournament Platform
          </div>
        </div>

        {/* Gold divider */}
        <div className="gold-divider" style={{ margin: '0 auto 2rem', width: 80 }} />

        {/* Heading */}
        <div style={{ marginBottom: '0.4rem' }}>
          <span className="section-tag">Admin Portal</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--fd)',
            fontSize: '1.3rem',
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: '0.6rem',
          }}
        >
          Sign in to manage<br />
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>tournaments &amp; scores</em>
        </div>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Access the admin dashboard to create tournaments, manage groups, and view live leaderboards.
        </p>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'var(--over-dim)',
              border: '1px solid var(--over-border)',
              borderRadius: 2,
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--over)',
            }}
          >
            {error === 'auth_callback_failed'
              ? 'Sign-in failed. Please try again.'
              : 'An error occurred. Please try again.'}
          </div>
        )}

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: loading ? 'var(--surface2)' : 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: 2,
            color: loading ? 'var(--text-dim)' : 'var(--text)',
            fontFamily: 'var(--fm)',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            WebkitTapHighlightColor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={e => {
            if (!loading) {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold-border)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)'
            }
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)'
            ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: '2px solid var(--border2)',
                  borderTopColor: 'var(--gold)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  flexShrink: 0,
                }}
              />
              Signing in…
            </>
          ) : (
            <>
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            margin: '1.75rem 0 1.25rem',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>
            NOT AN ADMIN?
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Chaperone note */}
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Chaperones access score entry using their{' '}
          <span style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>group PIN</span>
          {' '}— no login needed.
        </p>
      </div>
    </div>
  )
}
