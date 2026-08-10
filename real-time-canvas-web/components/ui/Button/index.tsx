/**
 * Shared button component. Extracted from the ~15 near-identical hand-rolled
 * button strings across the dialogs, login page, and dashboard (primary
 * indigo CTA, secondary slate outline, danger rose, ghost text-link, plus an
 * icon-only square variant).
 */

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-lg shadow-indigo-950/50',
  secondary:
    'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-500/50',
  ghost:
    'bg-transparent border border-transparent text-indigo-400 hover:text-indigo-300',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-xs gap-1.5',
  lg: 'px-5 py-3 text-xs gap-2',
  icon: 'p-2.5 aspect-square',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  fullWidth?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    fullWidth = false,
    icon,
    disabled,
    className = '',
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        font-medium rounded-xl transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...rest}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="xs" color={variant === 'secondary' || variant === 'ghost' ? 'slate' : 'white'} />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
})
