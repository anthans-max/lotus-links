import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Crimson_Pro, Outfit, DM_Mono, Syne } from 'next/font/google'
import './globals.css'

// Admin UI: Playfair Display headings + Crimson Pro body + DM Mono labels
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const crimson = Crimson_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-dm-mono',
  display: 'swap',
})

// Lotus AI branding font
const syne = Syne({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-syne',
  display: 'swap',
})

// Chaperone UI: Outfit body font
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit-var',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Lotus Links',
    template: '%s | Lotus Links',
  },
  description: 'Golf tournament management platform',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // prevents iOS zoom on input focus — critical for mobile score entry
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${crimson.variable} ${dmMono.variable} ${outfit.variable} ${syne.variable}`}
    >
      <body>
        {children}
      </body>
    </html>
  )
}
