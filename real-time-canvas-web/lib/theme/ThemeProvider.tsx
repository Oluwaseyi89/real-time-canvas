'use client'

/**
 * Light/dark theme state. Defaults to the OS-level preference; once the
 * user picks explicitly via toggleTheme/setTheme, that choice is persisted
 * to localStorage and wins over the system setting from then on.
 *
 * The actual attribute this drives (`data-theme` on <html>) is first set
 * synchronously by an inline script in layout.tsx, before hydration — this
 * provider takes over afterward so a live OS theme change (while no
 * explicit choice is stored) still updates the page without a reload.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Matches whatever the inline boot script already put on <html>, so this
  // never causes a hydration mismatch or a flash on mount.
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? getSystemTheme())

  const applyTheme = useCallback((next: Theme) => {
    setThemeState(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next)
    }
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      window.localStorage.setItem(STORAGE_KEY, next)
      applyTheme(next)
    },
    [applyTheme]
  )

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  // Live-follow the OS setting for as long as the user hasn't made an
  // explicit choice — matches the "default system until user chooses
  // otherwise" behavior, including switching mid-session (e.g. the OS
  // flips to dark at sunset).
  useEffect(() => {
    if (readStoredTheme()) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (readStoredTheme()) return
      applyTheme(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [applyTheme])

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

/**
 * Inline script source, injected as a raw <script> in the document head by
 * layout.tsx. Runs before first paint (and before this file's React code
 * ever executes) so the correct theme attribute is present from frame one —
 * without it, the page would render in whatever CSS default is defined,
 * then visibly snap to the real theme once React mounts.
 */
export const themeBootScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`
