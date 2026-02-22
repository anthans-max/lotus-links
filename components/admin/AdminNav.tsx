'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type TabKey = 'dashboard' | 'setup' | 'players' | 'groups'

const TABS: { k: TabKey; l: string }[] = [
  { k: 'dashboard', l: 'Dashboard' },
  { k: 'setup', l: 'Tournament Setup' },
  { k: 'players', l: 'Players' },
  { k: 'groups', l: 'Groups' },
]

interface AdminNavProps {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
}

export default function AdminNav({ activeTab, onTabChange }: AdminNavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const nav = (k: TabKey) => {
    onTabChange(k)
    setOpen(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 'var(--nav)',
          background: 'rgba(10,18,10,0.95)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 1.25rem',
            height: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            onClick={() => nav('dashboard')}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,var(--gold),#5a3e10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              ⛳
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1,
                }}
              >
                Lotus Links
              </div>
              <div
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  fontFamily: 'var(--fm)',
                }}
              >
                Tournament Platform
              </div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="dt" style={{ gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t.k}
                className={`nav-tab ${activeTab === t.k ? 'act' : ''}`}
                onClick={() => nav(t.k)}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* Desktop sign-out */}
          <button
            className="btn btn-ghost btn-sm dt"
            onClick={handleSignOut}
            style={{ fontSize: '0.68rem' }}
          >
            Sign Out
          </button>

          {/* Hamburger */}
          <button
            className={`hbg mob-toggle ${open ? 'open' : ''}`}
            onClick={() => setOpen(o => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="mob-drawer mob-toggle">
          {TABS.map(t => (
            <button
              key={t.k}
              className={`mob-item ${activeTab === t.k ? 'act' : ''}`}
              onClick={() => nav(t.k)}
            >
              {t.l}
            </button>
          ))}
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginTop: '0.875rem' }}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </>
  )
}
