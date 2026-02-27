'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTournament } from '@/lib/actions/tournament'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { Tournament } from '@/lib/types'

interface EditTournamentModalProps {
  open: boolean
  onClose: () => void
  tournament: Tournament
}

export default function EditTournamentModal({ open, onClose, tournament }: EditTournamentModalProps) {
  const router = useRouter()
  const [name, setName] = useState(tournament.name)
  const [date, setDate] = useState(tournament.date)
  const [course, setCourse] = useState(tournament.course)
  const [format, setFormat] = useState(tournament.format)
  const [holes, setHoles] = useState(String(tournament.holes))
  const [shotgunStart, setShotgunStart] = useState(tournament.shotgun_start)
  const [notes, setNotes] = useState(tournament.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !date || !course.trim()) {
      setError('Name, date, and course are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await updateTournament(tournament.id, {
        name: name.trim(),
        date,
        course: course.trim(),
        format,
        holes: parseInt(holes),
        shotgun_start: shotgunStart,
        notes: notes.trim() || null,
      })
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update tournament')
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Tournament"
      confirmLabel="Save Changes"
      confirmLoading={loading}
      onConfirm={handleSave}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          id="edit-t-name"
          label="Tournament Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <Input
          id="edit-t-date"
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />

        <Input
          id="edit-t-course"
          label="Course Name"
          value={course}
          onChange={e => setCourse(e.target.value)}
          required
        />

        <Select
          id="edit-t-format"
          label="Format"
          value={format}
          onChange={e => setFormat(e.target.value)}
          options={[
            { value: 'Scramble', label: 'Scramble' },
            { value: 'Stableford', label: 'Stableford' },
            { value: 'Stroke Play', label: 'Stroke Play' },
            { value: 'Match Play', label: 'Match Play' },
          ]}
        />

        <Input
          id="edit-t-holes"
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
            <span className="label">Shotgun Start</span>
          </label>
        </div>

        <div>
          <label htmlFor="edit-t-notes" className="label" style={{ display: 'block' }}>
            Notes (Optional)
          </label>
          <textarea
            id="edit-t-notes"
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
      </div>
    </Modal>
  )
}
