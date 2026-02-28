'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/lib/actions/tournament'
import { DEFAULT_STABLEFORD_CONFIG, type StablefordPointsConfig } from '@/lib/scoring/stableford'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface CreateTournamentFormProps {
  leagueId: string
}

const STABLEFORD_LABELS: { key: keyof StablefordPointsConfig; label: string; hint: string }[] = [
  { key: 'albatross',             label: 'Albatross (−3 or better)', hint: 'Net score 3+ under par' },
  { key: 'eagle',                 label: 'Eagle (−2)',               hint: 'Net score 2 under par'  },
  { key: 'birdie',                label: 'Birdie (−1)',              hint: 'Net score 1 under par'  },
  { key: 'par',                   label: 'Par (0)',                  hint: 'Net score equal to par' },
  { key: 'bogey',                 label: 'Bogey (+1)',               hint: 'Net score 1 over par'   },
  { key: 'double_bogey_or_worse', label: 'Double Bogey or worse',   hint: 'Net score 2+ over par'  },
]

export default function CreateTournamentForm({ leagueId }: CreateTournamentFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [course, setCourse] = useState('')
  const [format, setFormat] = useState('Scramble')
  const [holes, setHoles] = useState('18')
  const [shotgunStart, setShotgunStart] = useState(false)
  const [notes, setNotes] = useState('')
  const [slopeRating, setSlopeRating] = useState('113')
  const [courseRating, setCourseRating] = useState('')
  const [sfConfig, setSfConfig] = useState<StablefordPointsConfig>({ ...DEFAULT_STABLEFORD_CONFIG })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isHandicapFormat = format === 'Stableford' || format === 'Stroke Play'
  const isStableford = format === 'Stableford'

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
        slope_rating: isHandicapFormat && slopeRating ? parseFloat(slopeRating) : null,
        course_rating: isHandicapFormat && courseRating ? parseFloat(courseRating) : null,
        stableford_points_config: isStableford ? sfConfig : null,
      })
      router.push(`/dashboard/leagues/${leagueId}/tournaments/${tournament.id}/holes`)
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament')
      setLoading(false)
    }
  }

  const updateSfConfig = (key: keyof StablefordPointsConfig, raw: string) => {
    const val = parseInt(raw)
    setSfConfig(prev => ({ ...prev, [key]: isNaN(val) || val < 0 ? 0 : val }))
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
            { value: 'Scramble',    label: 'Scramble'    },
            { value: 'Stableford',  label: 'Stableford'  },
            { value: 'Stroke Play', label: 'Stroke Play' },
            { value: 'Match Play',  label: 'Match Play'  },
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

        {/* Handicap fields — shown for Stableford and Stroke Play */}
        {isHandicapFormat && (
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: 4,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.875rem',
          }}>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: '0.25rem' }}>Course Handicap Settings</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Used to compute each player&apos;s Course Handicap via the USGA formula.
                Slope 113 = standard/flat course. Leave Course Rating blank to use par as the rating.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px', minWidth: 120 }}>
                <Input
                  id="slope_rating"
                  label="Slope Rating"
                  type="number"
                  min={55}
                  max={155}
                  value={slopeRating}
                  onChange={e => setSlopeRating(e.target.value)}
                  placeholder="113"
                />
              </div>
              <div style={{ flex: '1 1 120px', minWidth: 120 }}>
                <Input
                  id="course_rating"
                  label="Course Rating (optional)"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={courseRating}
                  onChange={e => setCourseRating(e.target.value)}
                  placeholder="= par if blank"
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
            gap: '0.875rem',
          }}>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: '0.25rem' }}>Stableford Points</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Points awarded per net score outcome. Scores are based on net (handicap-adjusted) strokes vs. par.
              </p>
            </div>
            {STABLEFORD_LABELS.map(({ key, label, hint }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>{hint}</div>
                </div>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step={1}
                  value={sfConfig[key]}
                  onChange={e => updateSfConfig(key, e.target.value)}
                  style={{ width: 72, minWidth: 72, textAlign: 'center', padding: '0.4rem 0.5rem', minHeight: 40 }}
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

        <Button type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>
          Create Tournament
        </Button>
      </form>
    </Card>
  )
}
