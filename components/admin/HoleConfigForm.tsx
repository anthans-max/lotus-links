'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertHoles } from '@/lib/actions/tournament'
import type { Hole } from '@/lib/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface HoleRow {
  hole_number: number
  par: number
  yardage: number | null
  handicap: number | null
}

// Standard 18-hole par 72 layout
const STANDARD_18: { par: number }[] = [
  { par: 4 }, { par: 4 }, { par: 3 }, { par: 5 }, { par: 4 },
  { par: 4 }, { par: 3 }, { par: 4 }, { par: 5 }, // front 9 = 36
  { par: 4 }, { par: 4 }, { par: 3 }, { par: 5 }, { par: 4 },
  { par: 4 }, { par: 3 }, { par: 4 }, { par: 5 }, // back 9 = 36
]

function createEmptyHoles(count: number): HoleRow[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    yardage: null,
    handicap: null,
  }))
}

function holesFromExisting(existing: Hole[], count: number): HoleRow[] {
  if (existing.length === 0) return createEmptyHoles(count)
  const map = new Map(existing.map(h => [h.hole_number, h]))
  return Array.from({ length: count }, (_, i) => {
    const h = map.get(i + 1)
    return {
      hole_number: i + 1,
      par: h?.par ?? 4,
      yardage: h?.yardage ?? null,
      handicap: h?.handicap ?? null,
    }
  })
}

interface HoleConfigFormProps {
  tournamentId: string
  leagueId: string
  holeCount: number
  existingHoles: Hole[]
}

export default function HoleConfigForm({ tournamentId, leagueId, holeCount, existingHoles }: HoleConfigFormProps) {
  const router = useRouter()
  const [holes, setHoles] = useState<HoleRow[]>(() => holesFromExisting(existingHoles, holeCount))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
  const totalYardage = holes.reduce((sum, h) => sum + (h.yardage || 0), 0)

  const updateHole = (idx: number, field: keyof HoleRow, value: number | null) => {
    setHoles(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
    setSaved(false)
  }

  const applyDefaultPars = () => {
    setHoles(prev => prev.map(h => ({ ...h, par: 4 })))
    setSaved(false)
  }

  const applyStandard18 = () => {
    if (holeCount !== 18) return
    setHoles(prev => prev.map((h, i) => ({
      ...h,
      par: STANDARD_18[i]?.par ?? 4,
    })))
    setSaved(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await upsertHoles(tournamentId, leagueId, holes)
      setSaved(true)
    } catch (err: any) {
      setError(err.message || 'Failed to save holes')
    }
    setLoading(false)
  }

  return (
    <div>
      {/* Quick setup buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Button variant="outline" size="sm" onClick={applyDefaultPars}>
          Default Pars (All 4)
        </Button>
        {holeCount === 18 && (
          <Button variant="outline" size="sm" onClick={applyStandard18}>
            Standard 18 (Par 72)
          </Button>
        )}
      </div>

      {/* Hole grid */}
      <Card style={{ overflowX: 'auto', padding: 0 }}>
        <table className="sc-table" style={{ minWidth: 500 }}>
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>Yardage</th>
              <th>Handicap</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, i) => (
              <tr key={h.hole_number}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {h.hole_number}
                </td>
                <td>
                  <select
                    className="input"
                    value={h.par}
                    onChange={e => updateHole(i, 'par', parseInt(e.target.value))}
                    style={{
                      width: 65,
                      padding: '0.35rem 0.5rem',
                      minHeight: 36,
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input"
                    value={h.yardage ?? ''}
                    onChange={e => updateHole(i, 'yardage', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="—"
                    style={{
                      width: 80,
                      padding: '0.35rem 0.5rem',
                      minHeight: 36,
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input"
                    value={h.handicap ?? ''}
                    onChange={e => updateHole(i, 'handicap', e.target.value ? parseInt(e.target.value) : null)}
                    min={1}
                    max={18}
                    placeholder="—"
                    style={{
                      width: 65,
                      padding: '0.35rem 0.5rem',
                      minHeight: 36,
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Totals bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.75rem',
          padding: '0.75rem 1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div>
            <span className="label">Total Par</span>
            <div style={{ fontFamily: 'var(--fm)', fontSize: '1.25rem', color: 'var(--gold)' }}>{totalPar}</div>
          </div>
          {totalYardage > 0 && (
            <div>
              <span className="label">Total Yards</span>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '1.25rem', color: 'var(--text)' }}>{totalYardage.toLocaleString()}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {saved && (
            <span style={{ color: 'var(--green-bright)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
              Saved
            </span>
          )}
          {error && (
            <span style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
              {error}
            </span>
          )}
          <Button onClick={handleSave} loading={loading}>
            Save Holes
          </Button>
        </div>
      </div>
    </div>
  )
}
