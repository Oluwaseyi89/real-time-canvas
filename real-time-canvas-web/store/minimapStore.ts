/**
 * Zustand store for minimap state management
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MinimapState, MinimapConfig, MinimapPosition } from '@/types/minimap'

const DEFAULT_CONFIG: MinimapConfig = {
  width: 240,
  height: 160,
  scale: 0.1,
  backgroundColor: '#f8f9fa',
  borderColor: '#e5e7eb',
  borderWidth: 1,
  cornerRadius: 8,
  showGrid: true,
  gridColor: '#e5e7eb',
  gridSize: 20,
  showUserLabels: true,
  userDotRadius: 4,
  showObjectPreview: true,
}

const DEFAULT_POSITION: MinimapPosition = {
  x: 16,
  y: 16,
  anchor: 'bottom-right',
}

interface MinimapStore extends MinimapState {
  // Actions
  toggleVisibility: () => void
  setVisible: (visible: boolean) => void
  toggleCollapse: () => void
  setPosition: (position: MinimapPosition) => void
  setConfig: (config: Partial<MinimapConfig>) => void
  reset: () => void
}

export const useMinimapStore = create<MinimapStore>()(
  persist(
    (set, get) => ({
      // Docked/hidden by default — the room page's feature dock is now the
      // single source of truth for whether the minimap panel is open, and
      // mounts this component only when its "Radar" dock icon is active.
      isVisible: false,
      isCollapsed: false,
      position: DEFAULT_POSITION,
      zoom: 1,
      config: DEFAULT_CONFIG,

      toggleVisibility: () => {
        set((state) => ({ isVisible: !state.isVisible }))
      },

      setVisible: (visible: boolean) => {
        set({ isVisible: visible })
      },

      toggleCollapse: () => {
        set((state) => ({ isCollapsed: !state.isCollapsed }))
      },

      setPosition: (position: MinimapPosition) => {
        set({ position })
      },

      setConfig: (config: Partial<MinimapConfig>) => {
        set((state) => ({
          config: { ...state.config, ...config },
        }))
      },

      reset: () => {
        set({
          isVisible: false,
          isCollapsed: false,
          position: DEFAULT_POSITION,
          zoom: 1,
          config: DEFAULT_CONFIG,
        })
      },
    }),
    {
      name: 'minimap-store',
      partialize: (state) => ({
        isVisible: state.isVisible,
        isCollapsed: state.isCollapsed,
        position: state.position,
        config: state.config,
      }),
    }
  )
)
