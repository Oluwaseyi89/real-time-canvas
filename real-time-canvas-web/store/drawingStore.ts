/**
 * Zustand store for shape-drawing state: which shape type (if any) the
 * canvas should draw on click-drag, whether freehand (pencil) mode is
 * armed, and the fill/outline colors new shapes get created with.
 * Separate from canvasStore's object data — this is "current drawing
 * style," read live (via getState()) from useCanvas.ts's mouse handlers
 * and set by ShapeTool/PencilTool / the color palette, neither of which
 * otherwise has a way to reach the other.
 */

import { create } from 'zustand'

export type DrawableShapeType = 'rect' | 'circle' | 'triangle' | 'line'

interface DrawingState {
  // Set while the Shape tool panel is open with a shape type selected —
  // canvas mousedown/drag on empty space draws that shape instead of the
  // default selection box. Null when no shape tool is active.
  drawingShapeType: DrawableShapeType | null
  shapeFillColor: string
  shapeStrokeColor: string

  // Set while the Pencil tool panel is open — useCanvas.ts mirrors this
  // onto canvas.isDrawingMode, so freehand strokes only intercept the
  // canvas while that panel is actually active.
  pencilActive: boolean
  pencilWidth: number

  setDrawingShapeType: (type: DrawableShapeType | null) => void
  setShapeFillColor: (color: string) => void
  setShapeStrokeColor: (color: string) => void
  setPencilActive: (active: boolean) => void
  setPencilWidth: (width: number) => void
}

export const useDrawingStore = create<DrawingState>((set) => ({
  drawingShapeType: null,
  // Matches the pre-existing shape defaults in fabricConfig.ts's
  // OBJECT_DEFAULTS.shape, so switching to the store doesn't change the
  // look of a shape placed before anyone's touched the palette.
  shapeFillColor: '#3b82f6',
  shapeStrokeColor: '#2563eb',
  pencilActive: false,
  pencilWidth: 3,

  setDrawingShapeType: (drawingShapeType) => set({ drawingShapeType }),
  setShapeFillColor: (shapeFillColor) => set({ shapeFillColor }),
  setShapeStrokeColor: (shapeStrokeColor) => set({ shapeStrokeColor }),
  setPencilActive: (pencilActive) => set({ pencilActive }),
  setPencilWidth: (pencilWidth) => set({ pencilWidth }),
}))
