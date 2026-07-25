/**
 * Fabric.js configuration and initialization utilities
 * Provides centralized configuration for canvas instances
 */

import { Canvas, Object as FabricObject, TMat2D } from 'fabric'

/**
 * Default canvas configuration options
 * Optimized for infinite canvas with smooth interactions
 */
export const CANVAS_CONFIG = {
  backgroundColor: '#f0f0f0',
  selection: true,
  selectionColor: 'rgba(59, 130, 246, 0.1)',
  selectionBorderColor: '#3b82f6',
  selectionLineWidth: 1,
  renderOnAddRemove: true,
  enableRetinaScaling: true,
  // Performance optimization for 100+ objects
  skipOffscreen: true,
  // Infinite canvas default viewport transform matrix [a, b, c, d, e, f]
  viewportTransform: [1, 0, 0, 1, 0, 0] as TMat2D,
}

/**
 * Object creation defaults for different types
 */
export const OBJECT_DEFAULTS = {
  text: {
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#1a1a1a',
    backgroundColor: 'transparent',
    padding: 8,
    cornerSize: 8,
    cornerColor: '#3b82f6',
    borderColor: '#3b82f6',
    borderScaleFactor: 2,
    transparentCorners: false,
    hasControls: true,
    hasBorders: true,
  },
  shape: {
    fill: '#3b82f6',
    stroke: '#2563eb',
    strokeWidth: 2,
    cornerSize: 8,
    cornerColor: '#3b82f6',
    borderColor: '#3b82f6',
    transparentCorners: false,
    hasControls: true,
    hasBorders: true,
  },
  sticky: {
    fill: '#fef3c7',
    stroke: '#f59e0b',
    strokeWidth: 1,
    cornerSize: 8,
    cornerColor: '#f59e0b',
    borderColor: '#f59e0b',
    transparentCorners: false,
    hasControls: true,
    hasBorders: true,
    width: 200,
    height: 200,
  },
  image: {
    cornerSize: 8,
    cornerColor: '#3b82f6',
    borderColor: '#3b82f6',
    transparentCorners: false,
    hasControls: true,
    hasBorders: true,
  },
} as const

/**
 * Zoom and pan configuration
 */
export const ZOOM_CONFIG = {
  minZoom: 0.1,
  maxZoom: 5,
  zoomStep: 0.1,
  smoothZoomDuration: 300,
  wheelZoomSpeed: 0.001,
} as const

/**
 * Performance optimization thresholds
 */
export const PERFORMANCE_CONFIG = {
  maxObjectsBeforeOptimization: 100,
  renderIntervalMs: 16, // ~60fps
  objectCacheSize: 50,
} as const

// WeakMap store to keep resize handlers without polluting the Canvas instance with `any`
const resizeHandlers = new WeakMap<Canvas, () => void>()

/**
 * Initialize a Fabric.js canvas with optimized settings
 */
export function initializeCanvas(
  canvasElement: HTMLCanvasElement,
  options: Partial<typeof CANVAS_CONFIG> = {}
): Canvas {
  const parentWidth = canvasElement.parentElement?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 800)
  const parentHeight = canvasElement.parentElement?.clientHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 600)

  const config = {
    ...CANVAS_CONFIG,
    ...options,
    width: parentWidth,
    height: parentHeight,
  }

  const canvas = new Canvas(canvasElement, config)

  // Enable object caching for performance
  FabricObject.prototype.objectCaching = true

  // Set default rendering options
  canvas.renderOnAddRemove = true
  canvas.skipOffscreen = true

  // Handle window resize
  const handleResize = () => {
    if (canvasElement.parentElement) {
      canvas.setDimensions({
        width: canvasElement.parentElement.clientWidth,
        height: canvasElement.parentElement.clientHeight,
      })
      canvas.renderAll()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
    resizeHandlers.set(canvas, handleResize)
  }

  return canvas
}

/**
 * Clean up canvas resources
 */
export function disposeCanvas(canvas: Canvas): void {
  const handleResize = resizeHandlers.get(canvas)
  if (handleResize && typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
    resizeHandlers.delete(canvas)
  }
  void canvas.dispose()
}