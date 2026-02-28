'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'How does Stableford scoring work?',
  'What is a Course Handicap?',
  'Who is currently leading?',
  "What are today's tee times?",
  'How are net scores calculated?',
  'What format is this tournament?',
]

export default function ChatAssistant({ tournamentId }: { tournamentId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  const send = useCallback(
    async (text: string) => {
      const msg = text.trim()
      if (!msg || isLoading) return

      setInput('')
      setError(null)
      const priorHistory = messages
      setMessages(prev => [...prev, { role: 'user', content: msg }])
      setIsLoading(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            tournamentId,
            history: priorHistory.slice(-10),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(
            res.status === 429
              ? "You're sending messages quickly — please wait a moment before trying again."
              : (err.error || "Sorry, I'm having trouble connecting. Please try again in a moment."),
          )
          setIsLoading(false)
          return
        }

        const reader = res.body!.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let assistantText = ''
        let seeded = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantText += parsed.content
                if (!seeded) {
                  seeded = true
                  setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
                } else {
                  setMessages(prev => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: assistantText },
                  ])
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        // Fallback if no content arrived
        if (!seeded) {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again in a moment." },
          ])
        }
      } catch {
        setError("Sorry, I'm having trouble connecting. Please try again in a moment.")
      } finally {
        setIsLoading(false)
      }
    },
    [messages, tournamentId, isLoading],
  )

  const charsLeft = 300 - input.length
  // Show chips only when no messages have been sent yet
  const showChips = messages.length === 0 && !isLoading
  // Show typing indicator while waiting for first chunk
  const showTyping = isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user')

  return (
    <>
      {/* ── Floating action button ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: isOpen
            ? 'var(--surface2)'
            : 'linear-gradient(135deg, var(--gold), #5a3e10)',
          border: isOpen ? '1px solid var(--gold-border)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isOpen ? '1rem' : '1.3rem',
          color: isOpen ? 'var(--text-muted)' : undefined,
          boxShadow: '0 4px 20px rgba(200,168,75,0.35)',
          transition: 'all 0.2s',
        }}
        aria-label={isOpen ? 'Close golf assistant' : 'Open golf assistant'}
      >
        {isOpen ? '✕' : '⛳'}
      </button>

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            zIndex: 999,
            width: '100%',
            maxWidth: 380,
            height: '70dvh',
            maxHeight: 600,
            minHeight: 300,
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderBottom: 'none',
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.55)',
            animation: 'chatSlideUp 0.25s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gold), #5a3e10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}
              >
                ⛳
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--fd)',
                    fontSize: '0.9rem',
                    color: 'var(--text)',
                    lineHeight: 1.2,
                  }}
                >
                  Lotus Links Assistant
                </div>
                <div
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--gold)',
                    fontFamily: 'var(--fm)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  Golf &amp; Tournament Help
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: 0,
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close assistant"
            >
              ✕
            </button>
          </div>

          {/* Message list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.875rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {messages.length === 0 && !isLoading && (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--text-dim)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--fm)',
                  padding: '0.75rem 0',
                }}
              >
                Ask me anything about golf or this tournament
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div className={m.role === 'user' ? 'chat-user' : 'chat-ai'}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {showTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="chat-ai" style={{ padding: '0.6rem 0.875rem' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--over)',
                  textAlign: 'center',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(212,160,23,0.08)',
                  borderRadius: 6,
                  border: '1px solid var(--over-border)',
                  margin: '0.25rem 0',
                }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested chips — only on empty state */}
          {showChips && (
            <div
              style={{
                padding: '0 1rem 0.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
                flexShrink: 0,
              }}
            >
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  style={{
                    padding: '0.28rem 0.6rem',
                    borderRadius: 20,
                    border: '1px solid var(--gold-border)',
                    background: 'var(--gold-dim)',
                    color: 'var(--gold)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--fm)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,168,75,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold-dim)')}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <form
            onSubmit={e => { e.preventDefault(); send(input) }}
            style={{
              padding: '0.625rem 0.875rem 0.875rem',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 300))}
                placeholder="Ask about golf or this tournament…"
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.75rem',
                  borderRadius: 6,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'var(--fb)',
                  transition: 'border-color 0.2s',
                  minHeight: 40,
                  opacity: isLoading ? 0.6 : 1,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  border: 'none',
                  flexShrink: 0,
                  background: input.trim() && !isLoading ? 'var(--gold)' : 'var(--surface3)',
                  color: input.trim() && !isLoading ? '#0a120a' : 'var(--text-dim)',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  transition: 'background 0.15s',
                }}
                aria-label="Send message"
              >
                ↑
              </button>
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                color: charsLeft < 50 ? 'var(--over)' : 'var(--text-dim)',
                fontFamily: 'var(--fm)',
                marginTop: '0.3rem',
                textAlign: 'right',
              }}
            >
              {charsLeft}/300
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', height: '1rem' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
