'use client'

import { createContext, useContext, ReactNode } from 'react'
import { createStore, StoreApi, useStore as useZustandStore } from 'zustand'

interface CanvasState {
  objects: any[]
  selectedObjects: any[]
  zoom: number
  pan: { x: number; y: number }
  addObject: (obj: any) => void
  removeObject: (id: string) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
}

const createCanvasStore = () =>
  createStore<CanvasState>((set) => ({
    objects: [],
    selectedObjects: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
    removeObject: (id) =>
      set((state) => ({
        objects: state.objects.filter((obj) => obj.id !== id),
      })),
    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),
  }))

const StoreContext = createContext<StoreApi<CanvasState> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = createCanvasStore()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore<T>(selector: (state: CanvasState) => T) {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useStore must be used within StoreProvider')
  }
  return useZustandStore(store, selector)
}
