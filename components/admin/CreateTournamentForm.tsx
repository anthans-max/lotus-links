'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/lib/actions/tournament'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface CreateTournamentFormProps {
  leagueId: string
}

export default function CreateTournamentForm({ leagueId }: CreateTournamentFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [course, setCourse] = useState('')
  const [format, setFormat] = useState('Scramble')
  const [holes, setHoles] = useState('18')
  const [shotgunStart, setShotgunStart] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !date || !course.trim()) {
      setError('Name, date, and course are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const tournament = await createTournament({
        league_id: leagueId,
        name: name.trim(),
        date,
        course: course.trim(),
        format,
        holes: parseInt(holes),
        shotgun_start: shotgunStart,
        notes: notes.trim() || undefined,
      })
      router.push(`/dashboard/leagues/${leagueId}/tournaments/${tournament.id}/holes`)
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament')
      setLoading(false)
    }
  }

  return (
    <Card style={{ maxWidth: 520 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          id="name"
          label="Tournament Name"
          placeholder="e.g. WISH Spring Classic"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <Input
          id="date"
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        <Input
          id="course"
          label="Course Name"
          placeholder="e.g. The Lakes at El Segundo"
          value={course}
          onChange={e => setCourse(e.target.value)}
          required
        />

        <Select
          id="format"
          label="Format"
          value={format}
          onChange={e => setFormat(e.target.value)}
          options={[
            { value: 'Scramble', label: 'Scramble' },
          ]}
        />

        <Input
          id="holes"
          label="Number of Holes"
          type="number"
          min={1}
          max={18}
          value={holes}
          onChange={e => setHoles(e.target.value)}
        />

        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={shotgunStart}
              onChange={e => setShotgunStart(e.target.checked)}
              style={{
                width: 20,
                height: 20,
                accentColor: 'var(--gold)',
                cursor: 'pointer',
              }}
            />
            <div>
              <span className="label" style={{ display: 'block', marginBottom: '0.1rem' }}>
                Shotgun Start
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                All groups start simultaneously on different holes
              </span>
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="notes" className="label" style={{ display: 'block' }}>
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={3}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>
          Create Tournament
        </Button>
      </form>
    </Card>
  )
}
