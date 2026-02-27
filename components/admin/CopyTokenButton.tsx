'use client'

import { useState } from 'react'
import { getBaseUrl } from '@/lib/url'

interface Props {
  token: string
}

export default function CopyTokenButton({ token }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${getBaseUrl()}/t/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button
      onClick={handleCopy}
      className="btn btn-outline"
      style={{ fontSize: '0.82rem', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
    >
      {copied ? (
        <>
          <span style={{ color: '#4CAF50' }}>✓</span> Copied!
        </>
      ) : (
        <>🔗 Copy Scoring Link</>
      )}
    </button>
  )
}
