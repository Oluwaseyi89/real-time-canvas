import type { Metadata } from 'next'
import { StoreProvider } from '@/app/providers/StoreProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ThemeProvider, themeBootScript } from '@/lib/theme/ThemeProvider'
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
    // suppressHydrationWarning: the boot script below sets data-theme
    // synchronously before React hydrates, so the server-rendered markup
    // (which has no data-theme) intentionally differs from the first client
    // render — without this, React would log a hydration mismatch warning
    // for an attribute we're deliberately setting outside of React.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
