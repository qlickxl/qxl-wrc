import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'Awagi WRC Rally',
  description: 'WRC Rally Analytics Platform',
  icons: {
    icon: [
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {/* WRC Animated Background */}
          <div className="wrc-background">
            <div className="radial-pulse"></div>
            <div className="gravel-line"></div>
            <div className="gravel-line"></div>
            <div className="gravel-line"></div>
            <div className="gravel-line"></div>
            <div className="corner-accent top-left"></div>
            <div className="corner-accent bottom-right"></div>
            <div className="grid-overlay"></div>
          </div>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
