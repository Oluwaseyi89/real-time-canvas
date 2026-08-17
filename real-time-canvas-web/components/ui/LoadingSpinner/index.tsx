/**
 * Shared loading spinner. Replaces the hand-rolled
 * `border-2 border-white/30 border-t-white animate-spin` div repeated
 * across every submit button, plus the larger indigo page-level variants.
 */

const SIZE_CLASSES = {
  xs: 'w-3.5 h-3.5 border-2',
  sm: 'w-5 h-5 border-2',
  md: 'w-10 h-10 border-2',
  lg: 'w-16 h-16 border-2',
} as const

const COLOR_CLASSES = {
  // For spinners sitting inside a filled, colored button (e.g. primary/danger).
  white: 'border-white/30 border-t-white',
  // For spinners on their own — page loading states, empty panels.
  indigo: 'border-indigo-500/20 border-t-indigo-500',
  slate: 'border-slate-300 dark:border-slate-700 border-t-slate-300',
} as const

export type LoadingSpinnerSize = keyof typeof SIZE_CLASSES
export type LoadingSpinnerColor = keyof typeof COLOR_CLASSES

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize
  color?: LoadingSpinnerColor
  className?: string
  label?: string
}

export function LoadingSpinner({
  size = 'sm',
  color = 'indigo',
  className = '',
  label = 'Loading',
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block rounded-full animate-spin ${SIZE_CLASSES[size]} ${COLOR_CLASSES[color]} ${className}`}
    />
  )
}
