'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createLeague } from '@/lib/actions/leagues'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const COLOR_OPTIONS = [
  { value: '#1a5c2a', label: 'Green', color: '#1a5c2a' },
  { value: '#2980b9', label: 'Blue', color: '#2980b9' },
  { value: '#7b3fa0', label: 'Purple', color: '#7b3fa0' },
  { value: '#d4730c', label: 'Orange', color: '#d4730c' },
  { value: '#1a8a7a', label: 'Teal', color: '#1a8a7a' },
  { value: '#b8960c', label: 'Gold', color: '#b8960c' },
  { value: '#2c2c2c', label: 'Black', color: '#2c2c2c' },
]

interface CreateLeagueFormProps {
  userEmail: string
}

export default function CreateLeagueForm({ userEmail }: CreateLeagueFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [adminEmail, setAdminEmail] = useState(userEmail)
  const [primaryColor, setPrimaryColor] = useState('#1a5c2a')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('League name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const league = await createLeague({
        name: name.trim(),
        admin_email: adminEmail,
        primary_color: primaryColor,
      })
      router.push(`/dashboard/leagues/${league.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create league')
      setLoading(false)
    }
  }

  return (
    <Card style={{ maxWidth: 520 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          id="name"
          label="League Name"
          placeholder="e.g. WISH Golf League"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <Input
          id="email"
          label="Admin Email"
          type="email"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
          required
        />

        <div>
          <label className="label" style={{ display: 'block' }}>Primary Color</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPrimaryColor(opt.value)}
                title={opt.label}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: opt.color,
                  border: primaryColor === opt.value
                    ? '3px solid var(--gold)'
                    : '2px solid var(--border2)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label" style={{ display: 'block' }}>Logo</label>
          <div
            className="input"
            style={{
              opacity: 0.4,
              cursor: 'not-allowed',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Logo upload coming soon
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>
          Create League
        </Button>
      </form>
    </Card>
  )
}
