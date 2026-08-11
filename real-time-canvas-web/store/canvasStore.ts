/**
 * Zustand store for canvas state management
 * Handles canvas objects, selection, zoom, pan, and rendering state
 */

import { create } from 'zustand'
import { Canvas, Object as FabricObject } from 'fabric'
import type { CanvasRenderer } from '@/lib/canvas/renderer'

interface CanvasState {
  // Core state
  canvas: Canvas | null
  // useCanvas() is called independently by the room page (which owns the
  // real <canvas> element) *and* by every tool panel (TextTool, ShapeTool,
  // ...), purely to get at addText/addRectangle/etc — each of those calls
  // gets its own local, always-null renderer ref, since their refs never
  // attach to real DOM. Storing the renderer here, the same way `canvas`
  // already is, is what lets any of those call sites actually reach the one
  // renderer the page created — without it, every tool's add call silently
  // no-oped on its own dead local ref.
  renderer: CanvasRenderer | null
  objects: FabricObject[]
  selectedObjects: string[]
  isReady: boolean

  // View state
  zoom: number
  pan: { x: number; y: number }
  viewport: { width: number; height: number }

  // Interaction state
  activeTool: string | null
  isDrawing: boolean
  isDragging: boolean

  // Physics state
  physicsEnabled: boolean
  physicsGravity: { x: number; y: number }

  // Actions
  setCanvas: (canvas: Canvas) => void
  setRenderer: (renderer: CanvasRenderer | null) => void
  addObject: (obj: FabricObject) => void
  removeObject: (id: string) => void
  updateObject: (id: string, props: Partial<FabricObject>) => void
  selectObject: (id: string) => void
  deselectObject: (id: string) => void
  clearSelection: () => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setViewport: (viewport: { width: number; height: number }) => void
  setActiveTool: (tool: string | null) => void
  setIsDrawing: (isDrawing: boolean) => void
  setIsDragging: (isDragging: boolean) => void
  clearAllObjects: () => void
  setReady: (ready: boolean) => void
  reset: () => void
  setPhysicsEnabled: (enabled: boolean) => void
  setPhysicsGravity: (gravity: { x: number; y: number }) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state
  canvas: null,
  renderer: null,
  objects: [],
  selectedObjects: [],
  isReady: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  viewport: { width: 0, height: 0 },
  activeTool: null,
  isDrawing: false,
  isDragging: false,
  physicsEnabled: true,
  physicsGravity: { x: 0, y: 1 },

  /**
   * Set the canvas instance
   */
  setCanvas: (canvas: Canvas) => {
    set({ canvas, isReady: true })
  },

  /**
   * Set the shared renderer instance
   */
  setRenderer: (renderer: CanvasRenderer | null) => {
    set({ renderer })
  },

  /**
   * Add an object to the canvas
   */
  addObject: (obj: FabricObject) => {
    const { canvas, objects } = get()
    if (canvas) {
      canvas.add(obj)
      canvas.renderAll()
    }
    set({ objects: [...objects, obj] })
  },

  /**
   * Remove an object from the canvas by ID
   */
  removeObject: (id: string) => {
    const { canvas, objects } = get()
    const obj = objects.find((o: any) => o.id === id)

    if (canvas && obj) {
      canvas.remove(obj)
      canvas.renderAll()
    }

    set({
      objects: objects.filter((o: any) => (o as any).id !== id),
      selectedObjects: get().selectedObjects.filter((sid) => sid !== id),
    })
  },

  /**
   * Update an object's properties
   */
  updateObject: (id: string, props: Partial<FabricObject>) => {
    const { canvas, objects } = get()
    const obj = objects.find((o: any) => (o as any).id === id)

    if (canvas && obj) {
      obj.set(props as any)
      canvas.renderAll()
    }

    set({
      objects: objects.map((o: any) =>
        (o as any).id === id ? { ...o, ...props } : o
      ),
    })
  },

  /**
   * Select an object by ID
   */
  selectObject: (id: string) => {
    const { canvas, selectedObjects } = get()
    if (canvas) {
      const obj = canvas.getObjects().find((o: any) => (o as any).id === id)
      if (obj) {
        canvas.setActiveObject(obj)
        canvas.renderAll()
      }
    }
    if (!selectedObjects.includes(id)) {
      set({ selectedObjects: [...selectedObjects, id] })
    }
  },

  /**
   * Deselect an object by ID
   */
  deselectObject: (id: string) => {
    const { canvas } = get()
    if (canvas) {
      canvas.discardActiveObject()
      canvas.renderAll()
    }
    set({
      selectedObjects: get().selectedObjects.filter((sid) => sid !== id),
    })
  },

  /**
   * Clear all selections
   */
  clearSelection: () => {
    const { canvas } = get()
    if (canvas) {
      canvas.discardActiveObject()
      canvas.renderAll()
    }
    set({ selectedObjects: [] })
  },

  /**
   * Set the zoom level
   */
  setZoom: (zoom: number) => {
    const { canvas } = get()
    if (canvas) {
      canvas.setZoom(zoom)
      canvas.renderAll()
    }
    set({ zoom })
  },

  /**
   * Set the pan position
   */
  setPan: (pan: { x: number; y: number }) => {
    const { canvas } = get()
    if (canvas) {
      canvas.setViewportTransform([1, 0, 0, 1, pan.x, pan.y])
      canvas.renderAll()
    }
    set({ pan })
  },

  /**
   * Set the viewport dimensions
   */
  setViewport: (viewport: { width: number; height: number }) => {
    const { canvas } = get()
    if (canvas) {
      canvas.setWidth(viewport.width)
      canvas.setHeight(viewport.height)
      canvas.renderAll()
    }
    set({ viewport })
  },

  /**
   * Set the active tool
   */
  setActiveTool: (tool: string | null) => {
    set({ activeTool: tool })
  },

  /**
   * Set drawing state
   */
  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing })
  },

  /**
   * Set dragging state
   */
  setIsDragging: (isDragging: boolean) => {
    set({ isDragging })
  },

  /**
   * Clear all objects from the canvas
   */
  clearAllObjects: () => {
    const { canvas } = get()
    if (canvas) {
      canvas.clear()
      canvas.renderAll()
    }
    set({ objects: [], selectedObjects: [] })
  },

  /**
   * Set ready state
   */
  setReady: (ready: boolean) => {
    set({ isReady: ready })
  },

  /**
   * Reset the store to initial state
   */
  reset: () => {
    const { canvas } = get()
    if (canvas) {
      canvas.clear()
      canvas.renderAll()
    }
    set({
      objects: [],
      selectedObjects: [],
      zoom: 1,
      pan: { x: 0, y: 0 },
      activeTool: null,
      isDrawing: false,
      isDragging: false,
    })
  },

  /**
   * Enable/disable physics
   */
  setPhysicsEnabled: (enabled: boolean) => {
    set({ physicsEnabled: enabled })
  },

  /**
   * Set physics gravity
   */
  setPhysicsGravity: (gravity: { x: number; y: number }) => {
    set({ physicsGravity: gravity })
  },
}))
