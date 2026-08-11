'use client'

/**
 * Shared modal. Extracted from the identical overlay+panel+header shell
 * hand-built three times over (CreateRoomDialog, JoinRoomDialog,
 * ExportModal). Built on Radix Dialog rather than a hand-rolled
 * `fixed inset-0` div — real focus trap, ESC-to-close, and portal rendering
 * instead of reimplementing them, since @radix-ui/react-dialog was already
 * an installed (but entirely unused) dependency.
 */

import { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

export type ModalSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
}

export function Modal({ isOpen, onClose, title, icon, children, footer, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md animate-fade-in" />
        <Dialog.Content
          // No Dialog.Description in this shell — content varies per caller
          // and isn't always describable in one line. This is Radix's own
          // documented way to suppress the "missing description" a11y
          // warning without inventing a description no one asked for.
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 ${SIZE_CLASSES[size]} p-4 outline-none animate-scale-in`}
        >
          <div className="bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-5">
              <Dialog.Title className="flex items-center gap-2 text-lg font-bold tracking-wide text-slate-100">
                {icon && <span className="text-xl">{icon}</span>}
                <span>{title}</span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {children}

            {footer && (
              <div className="flex gap-2.5 pt-3 mt-4 border-t border-slate-800/80">{footer}</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
