/**
 * Zustand store for export state management
 */

import { create } from 'zustand'
import type { ExportOptions, ExportProgress, ExportFormat } from '@/types/export'

interface ExportStore {
  // State
  isExporting: boolean
  progress: number
  format: ExportFormat | null
  error: string | null
  exportHistory: Array<{ format: ExportFormat; timestamp: string; filename: string }>

  // Actions
  setExporting: (isExporting: boolean) => void
  setProgress: (progress: number) => void
  setFormat: (format: ExportFormat | null) => void
  setError: (error: string | null) => void
  addToHistory: (entry: { format: ExportFormat; filename: string }) => void
  reset: () => void
}

export const useExportStore = create<ExportStore>((set, get) => ({
  isExporting: false,
  progress: 0,
  format: null,
  error: null,
  exportHistory: [],

  setExporting: (isExporting: boolean) => {
    set({ isExporting })
  },

  setProgress: (progress: number) => {
    set({ progress: Math.min(Math.max(progress, 0), 100) })
  },

  setFormat: (format: ExportFormat | null) => {
    set({ format })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  addToHistory: (entry: { format: ExportFormat; filename: string }) => {
    set((state) => ({
      exportHistory: [
        {
          ...entry,
          timestamp: new Date().toISOString(),
        },
        ...state.exportHistory,
      ].slice(0, 50), // Keep last 50 exports
    }))
  },

  reset: () => {
    set({
      isExporting: false,
      progress: 0,
      format: null,
      error: null,
    })
  },
}))
