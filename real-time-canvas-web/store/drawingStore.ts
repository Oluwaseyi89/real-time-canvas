/**
 * Zustand store for shape-drawing state: which shape type (if any) the
 * canvas should draw on click-drag, and the fill/outline colors new shapes
 * get created with. Separate from canvasStore's object data — this is
 * "current drawing style," read live (via getState()) from useCanvas.ts's
 * mouse handlers and set by ShapeTool / the color palette, neither of which
 * otherwise has a way to reach the other.
 */

import { create } from 'zustand'

export type DrawableShapeType = 'rect' | 'circle' | 'triangle'

interface DrawingState {
  // Set while the Shape tool panel is open with a shape type selected —
  // canvas mousedown/drag on empty space draws that shape instead of the
  // default selection box. Null when no shape tool is active.
  drawingShapeType: DrawableShapeType | null
  shapeFillColor: string
  shapeStrokeColor: string

  setDrawingShapeType: (type: DrawableShapeType | null) => void
  setShapeFillColor: (color: string) => void
  setShapeStrokeColor: (color: string) => void
}

export const useDrawingStore = create<DrawingState>((set) => ({
  drawingShapeType: null,
  // Matches the pre-existing shape defaults in fabricConfig.ts's
  // OBJECT_DEFAULTS.shape, so switching to the store doesn't change the
  // look of a shape placed before anyone's touched the palette.
  shapeFillColor: '#3b82f6',
  shapeStrokeColor: '#2563eb',

  setDrawingShapeType: (drawingShapeType) => set({ drawingShapeType }),
  setShapeFillColor: (shapeFillColor) => set({ shapeFillColor }),
  setShapeStrokeColor: (shapeStrokeColor) => set({ shapeStrokeColor }),
}))
