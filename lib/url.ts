/**
 * Returns the canonical base URL for the app.
 * Prefers NEXT_PUBLIC_APP_URL (set to the custom domain in production),
 * falls back to window.location.origin at runtime, and finally to the
 * hardcoded production domain for SSR contexts.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://links.getlotusai.com'
}
