'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/leagues', label: 'Leagues' },
]

export default function AdminNavBar() {
  const [open, setOpen] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    const resolveNav = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsAuthed(false); return }
      setIsAuthed(true)

      const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
      if (user.email === superAdmin) { setNavItems(DEFAULT_NAV_ITEMS); return }

      const { data: rows } = await supabase
        .from('league_admins')
        .select('league_id, role')
        .eq('email', user.email!)

      const isOwner = (rows ?? []).some((r: any) => r.role === 'owner')
      if (isOwner || !rows || rows.length === 0) {
        setNavItems(DEFAULT_NAV_ITEMS)
      } else {
        // Invited admin only — link directly to their league if they have one
        const leagueHref = rows.length === 1
          ? `/dashboard/leagues/${rows[0].league_id}`
          : '/dashboard/leagues'
        setNavItems([
          { href: '/dashboard', label: 'Dashboard' },
          { href: leagueHref, label: 'Tournaments' },
        ])
      }
    }

    resolveNav()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => resolveNav())
    return () => subscription.unsubscribe()
  }, [])

  if (pathname === '/login') return null
  if (!isAuthed) return null

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
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
          <Link
            href="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
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
          </Link>

          {/* Desktop tabs */}
          <div className="dt" style={{ gap: 0 }}>
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-tab ${isActive(item.href) ? 'act' : ''}`}
              >
                {item.label}
              </Link>
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
          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`mob-item ${isActive(item.href) ? 'act' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
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
