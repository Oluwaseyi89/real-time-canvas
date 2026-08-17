/**
 * Shared text input. Extracted from the identical
 * `bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl ...` field repeated
 * across the dialogs and login page (which had also drifted into a couple
 * of near-but-not-quite-identical variants — this is the single source now).
 */

import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  error?: string
  hint?: string
  /** Renders inside the field on the right — e.g. a "Paste" action button. */
  rightElement?: ReactNode
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, rightElement, containerClassName = '', className = '', id, ...rest },
  ref
) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`
            flex-1 w-full bg-slate-100/80 dark:bg-slate-900/80 border rounded-xl px-3.5 py-2.5
            text-slate-900 dark:text-slate-100 text-xs outline-none transition-all
            placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium
            focus:ring-1
            ${error
              ? 'border-rose-800/80 focus:border-rose-500/80 focus:ring-rose-500/50'
              : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500/80 focus:ring-indigo-500/50'}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...rest}
        />
        {rightElement}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-[11px] text-rose-400">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
})
