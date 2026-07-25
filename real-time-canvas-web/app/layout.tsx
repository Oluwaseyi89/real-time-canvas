import type { Metadata } from 'next'
import { StoreProvider } from '@/app/providers/StoreProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Real-Time Collaborative Canvas',
  description: 'Infinite canvas with real-time collaboration, physics, and more',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
