'use client'

/**
 * Shared toast notification. There was no toast component anywhere in the
 * app — every "copied!"/success signal was hand-rolled as local
 * setTimeout-driven state mutating the trigger button in place (see
 * RoomList's copy-code icon swap, RoomInvite's copy-link color swap). This
 * gives those call sites a real, detached, auto-dismissing notification
 * instead, built on @radix-ui/react-toast (already an installed but unused
 * dependency) for correct stacking/ARIA/swipe-to-dismiss behavior.
 *
 * Usage: wrap the app once in <ToastProvider> (done in app/layout.tsx),
 * then call `const { toast } = useToast()` anywhere and
 * `toast({ title: 'Copied!', variant: 'success' })`.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react'
import * as RadixToast from '@radix-ui/react-toast'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  /** ms before auto-dismiss. Defaults to 3000. */
  duration?: number
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'duration'>> {
  id: string
  description?: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'bg-emerald-950/95 border-emerald-800/80 text-emerald-200',
  error: 'bg-rose-950/95 border-rose-800/80 text-rose-200',
  info: 'bg-slate-950/95 border-slate-800 text-slate-200',
}

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: '✓',
  error: '⚠️',
  info: 'ℹ️',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const toast = useCallback((options: ToastOptions) => {
    const id = String(idRef.current++)
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'info',
        duration: options.duration ?? 3000,
      },
    ])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id)
            }}
            className={`
              flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-2xl
              backdrop-blur-xl text-xs font-medium animate-slide-in-right
              data-[swipe=cancel]:translate-x-0
              data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
              data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
              ${VARIANT_CLASSES[t.variant]}
            `.trim().replace(/\s+/g, ' ')}
          >
            <span aria-hidden="true">{VARIANT_ICON[t.variant]}</span>
            <div className="space-y-0.5 flex-1 min-w-0">
              <RadixToast.Title className="font-semibold">{t.title}</RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="text-[11px] opacity-80">
                  {t.description}
                </RadixToast.Description>
              )}
            </div>
            <RadixToast.Close
              aria-label="Dismiss"
              className="text-current opacity-60 hover:opacity-100 cursor-pointer leading-none"
            >
              ✕
            </RadixToast.Close>
          </RadixToast.Root>
        ))}

        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm outline-none list-none m-0 p-0" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
