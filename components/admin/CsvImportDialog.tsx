'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { importPlayers } from '@/lib/actions/players'

interface CsvImportDialogProps {
  tournamentId: string
  onClose: () => void
}

interface ParsedRow {
  name: string
  grade: string
}

export default function CsvImportDialog({ tournamentId, onClose }: CsvImportDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)

      // Detect and skip header row
      const first = lines[0]?.toLowerCase()
      const startIdx = first?.includes('name') ? 1 : 0

      const parsed: ParsedRow[] = []
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim())
        if (parts[0]) {
          parsed.push({ name: parts[0], grade: parts[1] ?? '' })
        }
      }

      if (parsed.length === 0) {
        setError('No valid rows found. Expected format: name,grade')
        return
      }

      setRows(parsed)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    setError(null)
    startTransition(async () => {
      try {
        const { imported } = await importPlayers(tournamentId, rows)
        setResult(`Successfully imported ${imported} players`)
        setRows([])
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Import failed')
      }
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card card-gold"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '80vh',
          overflow: 'auto',
          animation: 'fadeUp 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: 'var(--text)' }}>
            Import Players (CSV)
          </div>
          <button className="btn btn-icon" onClick={onClose} style={{ fontSize: '0.9rem' }}>
            ✕
          </button>
        </div>

        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          Upload a CSV file with format: <span style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>name,grade</span> (one per line, header optional)
        </div>

        {/* File upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '1px dashed var(--gold-border)',
            borderRadius: 1,
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--text-dim)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}
        >
          Click to select CSV file
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'rgba(192,57,43,0.12)',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 2,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: '#e74c3c',
            }}
          >
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div
            style={{
              background: 'rgba(45,140,69,0.12)',
              border: '1px solid rgba(45,140,69,0.3)',
              borderRadius: 2,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: '#4CAF50',
            }}
          >
            {result}
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: '0.5rem' }}>
              Preview ({rows.length} players)
            </div>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table className="sc-table" style={{ minWidth: 300 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', paddingLeft: '0.75rem' }}>#</th>
                    <th style={{ textAlign: 'left' }}>Name</th>
                    <th style={{ textAlign: 'left' }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'left', paddingLeft: '0.75rem', color: 'var(--text-dim)' }}>{i + 1}</td>
                      <td style={{ textAlign: 'left', color: 'var(--text)' }}>{r.name}</td>
                      <td style={{ textAlign: 'left', color: 'var(--text-muted)' }}>{r.grade || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem', fontFamily: 'var(--fm)' }}>
                  ...and {rows.length - 20} more
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-gold"
                onClick={handleImport}
                disabled={isPending}
                style={{ flex: 1 }}
              >
                {isPending ? 'Importing...' : `Import ${rows.length} Players`}
              </button>
              <button className="btn btn-ghost" onClick={() => setRows([])}>
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
