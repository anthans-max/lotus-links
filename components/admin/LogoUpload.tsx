'use client'

import { useState, useRef } from 'react'
import { uploadLogo, removeLogo } from '@/lib/storage'

interface LogoUploadProps {
  leagueId: string
  currentLogoUrl: string
  onUploaded: (url: string) => void
  onRemoved: () => void
}

export default function LogoUpload({ leagueId, currentLogoUrl, onUploaded, onRemoved }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    try {
      const url = await uploadLogo(file, leagueId)
      onUploaded(url)
      setPreview('')
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setPreview('')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be selected again
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = async () => {
    if (currentLogoUrl) {
      try {
        await removeLogo(currentLogoUrl)
      } catch {
        // Ignore removal errors from storage
      }
    }
    onRemoved()
    setPreview('')
  }

  const displayUrl = preview || currentLogoUrl

  return (
    <div>
      <label className="label" style={{ display: 'block' }}>Logo</label>

      {displayUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '4px',
              border: '1px solid var(--border2)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface2)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="League logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Change
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleRemove}
              disabled={uploading}
              style={{ color: 'var(--over)' }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.click() }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${dragOver ? 'var(--gold)' : 'var(--border2)'}`,
            borderRadius: '4px',
            padding: '1.25rem',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? 'var(--gold-dim)' : 'var(--surface2)',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span className="spin" style={{ width: 16, height: 16, border: '2px solid var(--gold)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Uploading...</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📁</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Drop an image here or click to upload
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.25rem', fontFamily: 'var(--fm)' }}>
                PNG, JPG, SVG, WEBP — max 2MB
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{ color: 'var(--over)', fontSize: '0.75rem', fontFamily: 'var(--fm)', marginTop: '0.4rem' }}>
          {error}
        </p>
      )}
    </div>
  )
}
