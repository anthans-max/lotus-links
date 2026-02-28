'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTournament } from '@/lib/actions/tournament'
import { DEFAULT_STABLEFORD_CONFIG, parseStablefordConfig, type StablefordPointsConfig } from '@/lib/scoring/stableford'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import type { Tournament } from '@/lib/types'

interface EditTournamentModalProps {
  open: boolean
  onClose: () => void
  tournament: Tournament
}

const STABLEFORD_LABELS: { key: keyof StablefordPointsConfig; label: string }[] = [
  { key: 'albatross',             label: 'Albatross (−3 or better)' },
  { key: 'eagle',                 label: 'Eagle (−2)'               },
  { key: 'birdie',                label: 'Birdie (−1)'              },
  { key: 'par',                   label: 'Par (0)'                  },
  { key: 'bogey',                 label: 'Bogey (+1)'               },
  { key: 'double_bogey_or_worse', label: 'Double Bogey or worse'    },
]

export default function EditTournamentModal({ open, onClose, tournament }: EditTournamentModalProps) {
  const router = useRouter()
  const [name, setName] = useState(tournament.name)
  const [date, setDate] = useState(tournament.date)
  const [course, setCourse] = useState(tournament.course)
  const [format, setFormat] = useState(tournament.format)
  const [holes, setHoles] = useState(String(tournament.holes))
  const [shotgunStart, setShotgunStart] = useState(tournament.shotgun_start)
  const [notes, setNotes] = useState(tournament.notes || '')
  const [slopeRating, setSlopeRating] = useState(String(tournament.slope_rating ?? 113))
  const [courseRating, setCourseRating] = useState(String(tournament.course_rating ?? ''))
  const [sfConfig, setSfConfig] = useState<StablefordPointsConfig>(
    parseStablefordConfig(tournament.stableford_points_config)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isHandicapFormat = format === 'Stableford' || format === 'Stroke Play'
  const isStableford = format === 'Stableford'

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
        slope_rating: isHandicapFormat && slopeRating ? parseFloat(slopeRating) : null,
        course_rating: isHandicapFormat && courseRating ? parseFloat(courseRating) : null,
        stableford_points_config: isStableford ? sfConfig : null,
      })
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update tournament')
      setLoading(false)
    }
  }

  const updateSfConfig = (key: keyof StablefordPointsConfig, raw: string) => {
    const val = parseInt(raw)
    setSfConfig(prev => ({ ...prev, [key]: isNaN(val) || val < 0 ? 0 : val }))
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
            { value: 'Scramble',    label: 'Scramble'    },
            { value: 'Stableford',  label: 'Stableford'  },
            { value: 'Stroke Play', label: 'Stroke Play' },
            { value: 'Match Play',  label: 'Match Play'  },
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

        {/* Handicap settings */}
        {isHandicapFormat && (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: 4,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <span className="label">Course Handicap Settings</span>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 100px', minWidth: 100 }}>
                <Input
                  id="edit-t-slope"
                  label="Slope"
                  type="number"
                  min={55}
                  max={155}
                  value={slopeRating}
                  onChange={e => setSlopeRating(e.target.value)}
                  placeholder="113"
                />
              </div>
              <div style={{ flex: '1 1 100px', minWidth: 100 }}>
                <Input
                  id="edit-t-rating"
                  label="Course Rating"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={courseRating}
                  onChange={e => setCourseRating(e.target.value)}
                  placeholder="= par"
                />
              </div>
            </div>
          </div>
        )}

        {/* Stableford points config */}
        {isStableford && (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--gold-border)',
            borderRadius: 4,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <span className="label">Stableford Points per Outcome</span>
            {STABLEFORD_LABELS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>{label}</span>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step={1}
                  value={sfConfig[key]}
                  onChange={e => updateSfConfig(key, e.target.value)}
                  style={{ width: 64, minWidth: 64, textAlign: 'center', padding: '0.4rem 0.5rem', minHeight: 40 }}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
