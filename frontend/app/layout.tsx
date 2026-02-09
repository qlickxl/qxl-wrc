import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'Awagi WRC Rally',
  description: 'WRC Rally Analytics Platform',
  icons: {
    icon: [
      { url: '/favicon.svg?v=1', type: 'image/svg+xml' },
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
