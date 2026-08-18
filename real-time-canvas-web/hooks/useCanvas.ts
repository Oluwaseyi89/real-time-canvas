/**
 * Custom hook for canvas management
 * Provides canvas initialization, interaction, and state management
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Canvas,
  FabricObject,
  Point,
  TPointerEvent,
  ModifiedEvent,
  FabricObjectProps,
  ITextProps,
  RectProps,
  CircleProps,
  ImageProps,
  Rect,
  Circle,
  Triangle,
  Line,
  ActiveSelection,
  Group,
  PencilBrush,
} from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { useDrawingStore, DrawableShapeType } from '@/store/drawingStore'
import { initializeCanvas, disposeCanvas, ZOOM_CONFIG } from '@/lib/canvas/fabricConfig'
import { CanvasRenderer, createRenderer } from '@/lib/canvas/renderer'
import { ObjectFactory, CanvasObject, WithCustomProps } from '@/lib/canvas/objectFactory'

/** Live drag-preview outline shown while drawing a shape — never touches
 * the store/broadcast pipeline (no id/type custom props), purely visual. */
function createShapePreview(type: DrawableShapeType, x: number, y: number, fill: string, stroke: string): FabricObject {
  const common = {
    left: x,
    top: y,
    fill: hexToRgba(fill, 0.25),
    stroke,
    strokeWidth: 2,
    strokeDashArray: [6, 4],
    selectable: false,
    evented: false,
    objectCaching: false,
  }
  switch (type) {
    case 'circle':
      return new Circle({ ...common, radius: 0 })
    case 'triangle':
      return new Triangle({ ...common, width: 0, height: 0 })
    case 'line':
      return new Line([x, y, x, y], {
        stroke,
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        objectCaching: false,
      })
    default:
      return new Rect({ ...common, width: 0, height: 0 })
  }
}

function updateShapePreview(preview: FabricObject, type: DrawableShapeType, x1: number, y1: number, x2: number, y2: number) {
  if (type === 'line') {
    // Fabric's Line renders using width/height/left/top, which are only
    // computed once at construction time — setting x1/y1/x2/y2 alone leaves
    // those stale, so the line visually stays anchored at its starting
    // (zero-size) bounds no matter how far the pointer moves. Recomputing
    // them alongside the coordinates is what actually makes the preview
    // track the drag.
    ;(preview as Line).set({
      x1,
      y1,
      x2,
      y2,
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    })
    preview.setCoords()
    return
  }

  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  if (type === 'circle') {
    preview.set({ left, top, radius: Math.max(width, height) / 2 })
  } else {
    preview.set({ left, top, width, height })
  }
  preview.setCoords()
}

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return hex
  const [, r, g, b] = match
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
}

/** Final left/top/width-height (or radius/endpoints) for a drawn shape.
 * A real drag uses its own bounds; a plain tap falls back to the same
 * default size the old "Add Shape" button always placed, centered on the
 * tap point instead of a fixed canvas position. */
function computeShapeOptions(type: DrawableShapeType, x1: number, y1: number, x2: number, y2: number, isDrag: boolean) {
  if (type === 'line') {
    if (!isDrag) {
      const halfLength = 60
      return { x1: x1 - halfLength, y1, x2: x1 + halfLength, y2: y1 }
    }
    return { x1, y1, x2, y2 }
  }

  if (!isDrag) {
    if (type === 'circle') {
      const radius = 50
      return { left: x1 - radius, top: y1 - radius, radius }
    }
    const width = 100
    const height = 100
    return { left: x1 - width / 2, top: y1 - height / 2, width, height }
  }

  const left = Math.min(x1, x2)
  const top = Math.min(y1, y2)
  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  if (type === 'circle') {
    return { left, top, radius: Math.max(width, height) / 2 }
  }
  return { left, top, width, height }
}

// Event payload types for Fabric v6 canvas events
interface FabricSelectionEvent {
  selected?: FabricObject[]
  deselected?: FabricObject[]
  e?: TPointerEvent
}

interface FabricObjectEvent {
  target?: FabricObject
  e?: TPointerEvent
}

interface UseCanvasOptions {
  onObjectAdded?: (obj: FabricObject) => void
  onObjectRemoved?: (obj: FabricObject) => void
  onObjectSelected?: (obj: FabricObject) => void
  onObjectModified?: (obj: FabricObject) => void
  onObjectMoving?: (obj: FabricObject) => void
  onZoomChange?: (zoom: number) => void
  onPanChange?: (pan: { x: number; y: number }) => void
}

/**
 * Main canvas hook for managing canvas lifecycle and interactions
 */
export function useCanvas(options: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerElRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const stuckTransformCleanupRef = useRef<(() => void) | null>(null)

  // The room page mounts the container behind its own `isReady` gate, which
  // is false on the very first render — so a plain useRef here is still
  // null the one time an effect with a real dependency array would check
  // it, and never gets checked again. A callback ref fires exactly when the
  // element actually attaches, so this tick is a real dependency the
  // initialization effect below can react to.
  const [containerMountTick, setContainerMountTick] = useState(0)
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node
    setContainerMountTick((tick) => tick + 1)
  }, [])

  // Keep options ref updated to prevent unnecessary re-binding of canvas listeners
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const [isInitialized, setIsInitialized] = useState(false)

  const {
    canvas,
    setCanvas,
    setZoom,
    setPan,
    setViewport,
    zoom,
    pan,
    isReady,
  } = useCanvasStore()

  /**
   * Set up canvas event listeners
   */
  const setupCanvasEvents = useCallback((fabricCanvas: Canvas) => {
    // Object added event
    fabricCanvas.on('object:added', (e: FabricObjectEvent) => {
      if (e.target) {
        optionsRef.current.onObjectAdded?.(e.target)
      }
    })

    // Object removed event
    fabricCanvas.on('object:removed', (e: FabricObjectEvent) => {
      if (e.target) {
        optionsRef.current.onObjectRemoved?.(e.target)
      }
    })

    // Freehand (pencil) stroke completed — Fabric's own isDrawingMode brush
    // already constructed the Path and added it to canvas by the time this
    // fires, but object:added saw it before it had any id/type (the app's
    // onObjectAdded guard skips untagged objects), so it never broadcast.
    // Tagging it here and re-invoking onObjectAdded directly is what
    // actually syncs it — same object, same callback, just called once more
    // now that it's tagged.
    fabricCanvas.on('path:created', (e: { path: FabricObject }) => {
      const tagged = ObjectFactory.tagObject(e.path, 'path')
      optionsRef.current.onObjectAdded?.(tagged)
    })

    // Object selected event
    fabricCanvas.on('selection:created', (e: FabricSelectionEvent) => {
      if (e.selected && e.selected.length > 0) {
        optionsRef.current.onObjectSelected?.(e.selected[0])
      }
    })

    // Object modified event using native Fabric v6 ModifiedEvent type
    fabricCanvas.on('object:modified', (e: ModifiedEvent<TPointerEvent>) => {
      if (e.target) {
        optionsRef.current.onObjectModified?.(e.target)
      }
    })

    // Fires continuously while an object is being dragged — used for
    // physics drag-release velocity tracking (see the room page).
    fabricCanvas.on('object:moving', (e: FabricObjectEvent) => {
      if (e.target) {
        optionsRef.current.onObjectMoving?.(e.target)
      }
    })

    // Mouse wheel: plain scroll pans the canvas (matches every other
    // infinite-canvas app — Figma, Miro, etc.), Ctrl/Cmd+wheel zooms. This
    // also covers trackpad pinch-to-zoom, which browsers report as a wheel
    // event with ctrlKey set to true rather than as its own gesture.
    fabricCanvas.on('mouse:wheel', (opt: { e: WheelEvent }) => {
      const e = opt.e

      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY
        const currentZoom = fabricCanvas.getZoom()

        let newZoom = currentZoom - delta * ZOOM_CONFIG.wheelZoomSpeed
        newZoom = Math.min(Math.max(newZoom, ZOOM_CONFIG.minZoom), ZOOM_CONFIG.maxZoom)

        const pointer = fabricCanvas.getScenePoint(e)

        fabricCanvas.zoomToPoint(
          new Point(pointer.x, pointer.y),
          newZoom
        )

        setZoom(newZoom)
        optionsRef.current.onZoomChange?.(newZoom)
      } else {
        // Shift+wheel lets a plain vertical mouse wheel scroll horizontally
        // (standard browser convention); trackpads already report deltaX
        // directly for two-finger horizontal scroll.
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY

        const vpt = fabricCanvas.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0]
        vpt[4] -= dx
        vpt[5] -= dy
        fabricCanvas.setViewportTransform(vpt as [number, number, number, number, number, number])
        fabricCanvas.requestRenderAll()

        setPan({ x: vpt[4], y: vpt[5] })
        optionsRef.current.onPanChange?.({ x: vpt[4], y: vpt[5] })
      }

      e.preventDefault()
      e.stopPropagation()
    })

    // Mouse drag for pan
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0

    // Shape drawing: click-drag on empty canvas while a shape type is
    // selected in the Shape tool panel (drawingStore, set by ShapeTool)
    // draws that shape live instead of the default selection box. A plain
    // click (no real drag) falls back to a default-sized shape centered on
    // the click, same as the tool's own "Add Shape" button.
    let shapeDraft: { type: DrawableShapeType; startX: number; startY: number; preview: FabricObject } | null = null
    const DRAW_CLICK_THRESHOLD = 6

    fabricCanvas.on('mouse:down', (opt: { e: TPointerEvent; target?: FabricObject }) => {
      const e = opt.e as MouseEvent
      const drawType = useDrawingStore.getState().drawingShapeType

      if (drawType && e.button === 0 && !opt.target) {
        const pointer = fabricCanvas.getScenePoint(e)
        const { shapeFillColor, shapeStrokeColor } = useDrawingStore.getState()
        const preview = createShapePreview(drawType, pointer.x, pointer.y, shapeFillColor, shapeStrokeColor)
        fabricCanvas.add(preview)
        fabricCanvas.selection = false
        shapeDraft = { type: drawType, startX: pointer.x, startY: pointer.y, preview }
        return
      }

      if (e.button === 1 || e.button === 2) {
        isDragging = true
        const pointer = fabricCanvas.getScenePoint(e)
        lastPosX = pointer.x
        lastPosY = pointer.y
        fabricCanvas.selection = false
        fabricCanvas.defaultCursor = 'grab'
      }
    })

    fabricCanvas.on('mouse:move', (opt: { e: TPointerEvent }) => {
      const e = opt.e as MouseEvent

      if (shapeDraft) {
        const pointer = fabricCanvas.getScenePoint(e)
        updateShapePreview(shapeDraft.preview, shapeDraft.type, shapeDraft.startX, shapeDraft.startY, pointer.x, pointer.y)
        fabricCanvas.requestRenderAll()
        return
      }

      if (isDragging) {
        const pointer = fabricCanvas.getScenePoint(e)
        const dx = pointer.x - lastPosX
        const dy = pointer.y - lastPosY

        const vpt = fabricCanvas.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0]
        vpt[4] += dx
        vpt[5] += dy
        fabricCanvas.setViewportTransform(vpt as [number, number, number, number, number, number])
        fabricCanvas.requestRenderAll()

        setPan({ x: vpt[4], y: vpt[5] })
        optionsRef.current.onPanChange?.({ x: vpt[4], y: vpt[5] })

        lastPosX = pointer.x
        lastPosY = pointer.y
      }
    })

    fabricCanvas.on('mouse:up', (opt: { e: TPointerEvent }) => {
      if (shapeDraft) {
        const { type, startX, startY, preview } = shapeDraft
        shapeDraft = null
        fabricCanvas.remove(preview)
        fabricCanvas.selection = true

        const e = opt.e as MouseEvent
        const pointer = fabricCanvas.getScenePoint(e)
        const dx = Math.abs(pointer.x - startX)
        const dy = Math.abs(pointer.y - startY)
        const isDrag = dx > DRAW_CLICK_THRESHOLD || dy > DRAW_CLICK_THRESHOLD
        const { shapeFillColor, shapeStrokeColor } = useDrawingStore.getState()

        const renderer = useCanvasStore.getState().renderer
        if (renderer) {
          const shapeOptions = computeShapeOptions(type, startX, startY, pointer.x, pointer.y, isDrag)
          let obj
          if (type === 'line') {
            const { x1, y1, x2, y2 } = shapeOptions as { x1: number; y1: number; x2: number; y2: number }
            obj = ObjectFactory.createLine([x1, y1, x2, y2], { stroke: shapeStrokeColor })
          } else {
            const factoryOptions = { ...shapeOptions, fill: shapeFillColor, stroke: shapeStrokeColor }
            obj =
              type === 'circle'
                ? ObjectFactory.createCircle(factoryOptions)
                : type === 'triangle'
                  ? ObjectFactory.createTriangle(factoryOptions)
                  : ObjectFactory.createRectangle(factoryOptions)
          }
          renderer.addObject(obj, obj.id)
          useCanvasStore.getState().addObject(obj)
        }
        return
      }

      if (isDragging) {
        isDragging = false
        fabricCanvas.selection = true
        fabricCanvas.defaultCursor = 'default'
      }
    })

    // Safety net for a rare Fabric v6 condition where an object transform
    // (drag/resize) never gets finalized: Fabric tracks the in-progress
    // transform on `_currentTransform` and normally clears it from its own
    // document-level mouseup listener (added in `_onMouseDown`, so it still
    // fires even if the pointer leaves the canvas mid-drag) — but if that
    // listener doesn't run to completion for this particular mouseup, the
    // transform is left stuck, and every future mousemove keeps applying it
    // to the object regardless of whether any button is actually held,
    // since Fabric's own transform-continuation check only looks at whether
    // `_currentTransform` is set, not the real button state. A window-level
    // capture-phase listener sees every mouseup delivered to the page
    // (after Fabric's own document listener has already had its turn, so
    // this is a no-op on the overwhelmingly common case where Fabric
    // finalized normally) and force-completes any transform still marked
    // in-progress, using Fabric's own finalize routine so the usual
    // object:modified sync/broadcast still fires for the final position.
    const forceFinalizeStuckTransform = (e: MouseEvent) => {
      const canvasWithInternals = fabricCanvas as unknown as {
        _currentTransform: unknown
        _finalizeCurrentTransform?: (e: MouseEvent) => void
      }
      if (canvasWithInternals._currentTransform) {
        canvasWithInternals._finalizeCurrentTransform?.(e)
        canvasWithInternals._currentTransform = null
        fabricCanvas.requestRenderAll()
      }
    }
    window.addEventListener('mouseup', forceFinalizeStuckTransform)
    stuckTransformCleanupRef.current = () => {
      window.removeEventListener('mouseup', forceFinalizeStuckTransform)
    }

    // Prevent default right-click context menu on canvas wrapper element
    if (fabricCanvas.getSelectionElement()) {
      const wrapper = fabricCanvas.getSelectionElement().parentElement
      if (wrapper) {
        wrapper.addEventListener('contextmenu', (e: Event) => e.preventDefault())
      }
    }

    // Touch gestures — the wrapper sets touch-action: none so the browser
    // never takes over scroll/pinch-zoom, but until now nothing replaced
    // it, so touch users had no way to pan or zoom at all. Fabric's own
    // mouse:* events only ever track a single pointer, so pinch-zoom (which
    // needs both touch points at once) is handled here directly rather than
    // through Fabric. Single-finger drag reuses that same native touchstart
    // hit-test so a finger starting on an object still drags/selects it
    // exactly as before, instead of panning the canvas out from under it.
    const upperCanvasEl = fabricCanvas.upperCanvasEl
    let touchMode: 'none' | 'pan' | 'pinch' = 'none'
    let lastTouchPoints: { x: number; y: number }[] = []
    let lastPinchDistance = 0

    const getTouchPoints = (e: TouchEvent) =>
      Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }))

    const getMidpoint = (points: { x: number; y: number }[]) => ({
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    })

    const getDistance = (points: { x: number; y: number }[]) => {
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Mirrors the scene-point delta approach the mouse-drag pan handler
    // above already uses, so touch panning behaves consistently with it.
    const applyPanDelta = (scenePoint: Point, lastScenePoint: Point) => {
      const dx = scenePoint.x - lastScenePoint.x
      const dy = scenePoint.y - lastScenePoint.y
      const vpt = fabricCanvas.viewportTransform ? [...fabricCanvas.viewportTransform] : [1, 0, 0, 1, 0, 0]
      vpt[4] += dx
      vpt[5] += dy
      fabricCanvas.setViewportTransform(vpt as [number, number, number, number, number, number])
      setPan({ x: vpt[4], y: vpt[5] })
      optionsRef.current.onPanChange?.({ x: vpt[4], y: vpt[5] })
    }

    const handleTouchStart = (e: TouchEvent) => {
      const points = getTouchPoints(e)

      if (points.length === 1) {
        // Only take over as a canvas pan when the finger starts on empty
        // space — a finger starting on an object should drag/select it via
        // Fabric's own touch handling instead, unchanged from before.
        const hitTarget = fabricCanvas.findTarget(e)
        touchMode = hitTarget ? 'none' : 'pan'
      } else if (points.length >= 2) {
        touchMode = 'pinch'
        lastPinchDistance = getDistance(points)
        fabricCanvas.selection = false
      }

      lastTouchPoints = points
      if (touchMode !== 'none') e.preventDefault()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (touchMode === 'none') return
      const points = getTouchPoints(e)
      if (points.length === 0) return

      if (touchMode === 'pan' && points.length === 1 && lastTouchPoints.length === 1) {
        const last = lastTouchPoints[0]
        const lastEvent = { clientX: last.x, clientY: last.y, target: upperCanvasEl } as unknown as TPointerEvent
        applyPanDelta(fabricCanvas.getScenePoint(e), fabricCanvas.getScenePoint(lastEvent))
        fabricCanvas.requestRenderAll()
      } else if (touchMode === 'pinch' && points.length >= 2) {
        const distance = getDistance(points)
        const midpoint = getMidpoint(points)
        const midpointEvent = { clientX: midpoint.x, clientY: midpoint.y, target: upperCanvasEl } as unknown as TPointerEvent

        if (lastPinchDistance > 0) {
          const currentZoom = fabricCanvas.getZoom()
          let newZoom = currentZoom * (distance / lastPinchDistance)
          newZoom = Math.min(Math.max(newZoom, ZOOM_CONFIG.minZoom), ZOOM_CONFIG.maxZoom)

          fabricCanvas.zoomToPoint(fabricCanvas.getScenePoint(midpointEvent), newZoom)
          setZoom(newZoom)
          optionsRef.current.onZoomChange?.(newZoom)
        }

        if (lastTouchPoints.length >= 2) {
          const lastMidpoint = getMidpoint(lastTouchPoints)
          const lastMidpointEvent = { clientX: lastMidpoint.x, clientY: lastMidpoint.y, target: upperCanvasEl } as unknown as TPointerEvent
          applyPanDelta(fabricCanvas.getScenePoint(midpointEvent), fabricCanvas.getScenePoint(lastMidpointEvent))
        }

        fabricCanvas.requestRenderAll()
        lastPinchDistance = distance
      }

      lastTouchPoints = points
      e.preventDefault()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const points = getTouchPoints(e)
      if (points.length < 2) lastPinchDistance = 0
      if (points.length === 0) {
        touchMode = 'none'
        fabricCanvas.selection = true
      } else if (points.length === 1) {
        // Dropped from a pinch down to one finger — start a fresh pan from
        // here instead of jumping using the stale two-finger delta.
        touchMode = 'pan'
      }
      lastTouchPoints = points
    }

    upperCanvasEl.addEventListener('touchstart', handleTouchStart, { passive: false })
    upperCanvasEl.addEventListener('touchmove', handleTouchMove, { passive: false })
    upperCanvasEl.addEventListener('touchend', handleTouchEnd, { passive: false })
    upperCanvasEl.addEventListener('touchcancel', handleTouchEnd, { passive: false })
  }, [setZoom, setPan])

  /**
   * Initialize the canvas instance
   */
  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !containerElRef.current) {
      console.warn('[useCanvas] Canvas refs not available')
      return
    }

    try {
      const width = containerElRef.current.clientWidth
      const height = containerElRef.current.clientHeight

      // Initialize Fabric.js canvas
      const fabricCanvas = initializeCanvas(canvasRef.current)
      fabricCanvas.setDimensions({ width, height })

      // Update store viewport state
      setViewport({ width, height })

      // Initialize renderer — kept on the local ref (used to track whether
      // *this* hook call owns the canvas, for init/cleanup guarding) and
      // also published to the shared store, since that's the only copy
      // every other useCanvas() call site (each tool panel) can actually
      // see. See the store's `renderer` field for why.
      rendererRef.current = createRenderer(fabricCanvas)
      useCanvasStore.getState().setRenderer(rendererRef.current)

      // Store canvas instance in global store
      setCanvas(fabricCanvas)

      // Bind canvas event listeners
      setupCanvasEvents(fabricCanvas)

      setIsInitialized(true)
      console.log('[useCanvas] Canvas initialized successfully')
    } catch (error) {
      console.error('[useCanvas] Failed to initialize canvas:', error)
    }
  }, [setCanvas, setViewport, setupCanvasEvents])

  /**
   * Factory helpers to create & render elements. These read the renderer
   * from the shared store, not the local rendererRef — this hook is called
   * independently by every tool panel (TextTool, ShapeTool, ...) purely to
   * get at these functions, and each of those calls has its own local
   * rendererRef that's always null (their canvasRef/containerElRef never
   * attach to real DOM, so their own init effect never runs). Checking the
   * local ref here meant every tool's "Add" button silently no-oped —
   * addText() etc always returned undefined, no matter how well the actual
   * canvas had initialized elsewhere.
   */
  const addText = useCallback((text: string, options?: WithCustomProps<ITextProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const obj = ObjectFactory.createText(text, {
      left: 100,
      top: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addRectangle = useCallback((options?: WithCustomProps<RectProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const obj = ObjectFactory.createRectangle({
      width: 100,
      height: 100,
      left: 100,
      top: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addCircle = useCallback((options?: WithCustomProps<CircleProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const obj = ObjectFactory.createCircle({
      radius: 50,
      left: 100,
      top: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addTriangle = useCallback((options?: WithCustomProps<FabricObjectProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const factoryFn = (ObjectFactory as any).createTriangle
      ? (ObjectFactory as any).createTriangle
      : (opts: any) =>
          ObjectFactory.createRectangle({
            width: 100,
            height: 100,
            left: 100,
            top: 100,
            ...opts,
          })

    const obj = factoryFn({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addStickyNote = useCallback((text: string, options?: WithCustomProps<RectProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const obj = ObjectFactory.createStickyNote(text, {
      left: 100,
      top: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addImage = useCallback(async (url: string, options?: WithCustomProps<ImageProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    try {
      const obj = await ObjectFactory.createImage(url, {
        left: 100,
        top: 100,
        ...options,
      })

      renderer.addObject(obj, obj.id)
      useCanvasStore.getState().addObject(obj)

      return obj
    } catch (error) {
      console.error('[useCanvas] Failed to add image:', error)
      throw error
    }
  }, [])

  const addAudio = useCallback((audioUrl: string, options?: WithCustomProps<RectProps>) => {
    const renderer = useCanvasStore.getState().renderer
    if (!renderer) return

    const obj = ObjectFactory.createAudioObject(audioUrl, {
      left: 100,
      top: 100,
      ...options,
    })

    renderer.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  /**
   * Removal & Clear Actions
   */
  const removeObject = useCallback((id: string) => {
    const { objects, renderer } = useCanvasStore.getState()
    const obj = objects.find((o) => (o as CanvasObject).id === id)

    if (obj && renderer) {
      renderer.removeObject(obj, id)
      useCanvasStore.getState().removeObject(id)
    }
  }, [])

  const clearAll = useCallback(() => {
    const renderer = useCanvasStore.getState().renderer
    if (renderer) {
      renderer.clearAll()
      useCanvasStore.getState().clearAllObjects()
    }
  }, [])

  /**
   * Zoom & View Transformations
   */
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + ZOOM_CONFIG.zoomStep, ZOOM_CONFIG.maxZoom)
    setZoom(newZoom)
    if (canvas) {
      canvas.setZoom(newZoom)
      canvas.requestRenderAll()
    }
  }, [zoom, canvas, setZoom])

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - ZOOM_CONFIG.zoomStep, ZOOM_CONFIG.minZoom)
    setZoom(newZoom)
    if (canvas) {
      canvas.setZoom(newZoom)
      canvas.requestRenderAll()
    }
  }, [zoom, canvas, setZoom])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    if (canvas) {
      canvas.setZoom(1)
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
      canvas.requestRenderAll()
    }
  }, [canvas, setZoom, setPan])

  const fitToView = useCallback(() => {
    if (!canvas) return

    const objects = canvas.getObjects()
    if (objects.length === 0) return

    type RectBounds = { left: number; top: number; width: number; height: number } | null

    const rect = objects.reduce<RectBounds>((bounds, obj) => {
      const objBounds = obj.getBoundingRect()
      if (!bounds) return objBounds
      return {
        left: Math.min(bounds.left, objBounds.left),
        top: Math.min(bounds.top, objBounds.top),
        width: Math.max(bounds.left + bounds.width, objBounds.left + objBounds.width) - Math.min(bounds.left, objBounds.left),
        height: Math.max(bounds.top + bounds.height, objBounds.top + objBounds.height) - Math.min(bounds.top, objBounds.top),
      }
    }, null)

    if (rect) {
      const viewportWidth = canvas.getWidth()
      const viewportHeight = canvas.getHeight()
      const scaleX = (viewportWidth * 0.8) / rect.width
      const scaleY = (viewportHeight * 0.8) / rect.height
      const scale = Math.min(scaleX, scaleY, ZOOM_CONFIG.maxZoom)

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const vpt: [number, number, number, number, number, number] = [
        scale,
        0,
        0,
        scale,
        viewportWidth / 2 - centerX * scale,
        viewportHeight / 2 - centerY * scale,
      ]

      canvas.setViewportTransform(vpt)
      canvas.requestRenderAll()

      setZoom(scale)
      setPan({ x: vpt[4], y: vpt[5] })
    }
  }, [canvas, setZoom, setPan])

  // Canvas Initialization and Lifecycle Cleanup. `containerMountTick` is the
  // real dependency here — the container element is gated behind the room
  // page's own `isReady` check, which is false on the very first render, so
  // this effect's ref reads used to be null the one time a normal
  // dependency array happened to trigger a run, and never got rechecked
  // once the container actually mounted a render later. The callback ref
  // that sets containerMountTick fires exactly when that happens, giving
  // this effect something real to react to.
  //
  // The guard below deliberately reads `rendererRef.current`, not the
  // `isInitialized` state, and neither `isInitialized` nor `canvas` (the
  // Zustand-stored Fabric instance) appear in the dependency array, even
  // though the cleanup touches both. Both are *set as a side effect of this
  // same effect's own body* (initCanvas() calls setIsInitialized(true) and
  // setCanvas()), so depending on either creates a feedback loop: the value
  // changes -> effect reruns -> cleanup tears down what was just built ->
  // state resets -> body reinitializes -> sets the value again -> repeat
  // forever.
  //
  // The cleanup itself only runs its disposal when `rendererRef.current` is
  // still set — this hook isn't only called by the room page that owns the
  // real <canvas> element; every tool panel (TextTool, ShapeTool, ...) also
  // calls useCanvas() purely to get at addText/addRectangle/etc, giving each
  // of them their own independent rendererRef that never gets set (their
  // guard above never passes, since their containerElRef/canvasRef are
  // never attached to real DOM). Reading the shared store's canvas
  // unconditionally in cleanup meant any tool panel unmounting — e.g. its
  // popover closing after adding an object — disposed the page's real,
  // shared canvas out from under everyone else. Gating on this instance's
  // own rendererRef makes cleanup a no-op for every call site except the one
  // that actually created the canvas.
  useEffect(() => {
    if (!rendererRef.current && containerElRef.current && canvasRef.current) {
      initCanvas()
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current = null
        useCanvasStore.getState().setRenderer(null)
        const currentCanvas = useCanvasStore.getState().canvas
        if (currentCanvas) {
          disposeCanvas(currentCanvas)
        }
        stuckTransformCleanupRef.current?.()
        stuckTransformCleanupRef.current = null
        setIsInitialized(false)
      }
    }
  }, [initCanvas, containerMountTick])

  // Window Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (containerElRef.current && canvas) {
        const width = containerElRef.current.clientWidth
        const height = containerElRef.current.clientHeight
        canvas.setDimensions({ width, height })
        setViewport({ width, height })
        canvas.requestRenderAll()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvas, setViewport])

  // Freehand (pencil) drawing mode — armed by PencilTool through
  // drawingStore rather than touching the canvas directly, the same
  // indirection ShapeTool uses for drawingShapeType. Subscribing outside
  // React's own state (zustand's subscribe, not the useDrawingStore hook)
  // avoids re-rendering this component on every stroke-color tweak; this
  // effect only exists to mirror store state onto the live Fabric canvas.
  useEffect(() => {
    if (!canvas) return

    const applyPencilState = (state: ReturnType<typeof useDrawingStore.getState>) => {
      // Fabric v6 never constructs a default brush itself — isDrawingMode
      // alone does nothing until freeDrawingBrush actually exists, since
      // Canvas's own mouse handlers guard every brush call with
      // `this.freeDrawingBrush && ...`. Created lazily, once, the first
      // time pencil mode is armed.
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new PencilBrush(canvas)
      }
      canvas.isDrawingMode = state.pencilActive
      if (state.pencilActive) {
        canvas.freeDrawingBrush.color =
          state.shapeStrokeColor === 'transparent' ? '#1a1a1a' : state.shapeStrokeColor
        canvas.freeDrawingBrush.width = state.pencilWidth
      }
    }

    applyPencilState(useDrawingStore.getState())
    return useDrawingStore.subscribe(applyPencilState)
  }, [canvas])

  /**
   * Selection actions — read the canvas fresh from the store rather than
   * closing over the `canvas` variable above, matching every add*() helper
   * in this file, so callers from tool panels (whose own useCanvas() call
   * never has a real canvas) still reach the room page's actual instance.
   */
  const deselectAll = useCallback(() => {
    const activeCanvas = useCanvasStore.getState().canvas
    if (!activeCanvas || !activeCanvas.getActiveObject()) return
    activeCanvas.discardActiveObject()
    activeCanvas.requestRenderAll()
  }, [])

  const deleteSelected = useCallback(() => {
    const activeCanvas = useCanvasStore.getState().canvas
    if (!activeCanvas) return
    const active = activeCanvas.getActiveObjects()
    if (active.length === 0) return
    activeCanvas.discardActiveObject()
    // canvas.remove() fires 'object:removed' per object, which the room
    // page's onObjectRemoved already turns into a broadcast + time-travel
    // record + physics body cleanup — nothing further to sync here.
    active.forEach((obj) => activeCanvas.remove(obj))
    activeCanvas.requestRenderAll()
  }, [])

  // Grouping/ungrouping only needs to run the raw Fabric add/remove calls —
  // same reasoning as deleteSelected above, onObjectAdded/onObjectRemoved
  // already broadcast+record whatever gets added or removed, regardless of
  // why.
  const groupSelection = useCallback(() => {
    const activeCanvas = useCanvasStore.getState().canvas
    if (!activeCanvas) return
    const active = activeCanvas.getActiveObject()
    if (!active || active.type !== 'activeselection') return

    const objects = (active as ActiveSelection).getObjects().slice()
    if (objects.length < 2) return

    activeCanvas.discardActiveObject()
    objects.forEach((obj) => activeCanvas.remove(obj))

    const group = ObjectFactory.createGroup(objects as (FabricObject & Partial<CanvasObject>)[])
    activeCanvas.add(group)
    activeCanvas.setActiveObject(group)
    activeCanvas.requestRenderAll()
  }, [])

  const ungroupSelection = useCallback(() => {
    const activeCanvas = useCanvasStore.getState().canvas
    if (!activeCanvas) return
    const active = activeCanvas.getActiveObject()
    if (!active || active.type !== 'group') return

    const groupObj = active as Group
    const objects = groupObj.removeAll()
    activeCanvas.remove(groupObj)
    objects.forEach((obj) => activeCanvas.add(obj))

    const selection = new ActiveSelection(objects, { canvas: activeCanvas })
    activeCanvas.setActiveObject(selection)
    activeCanvas.requestRenderAll()
  }, [])

  return {
    canvasRef,
    containerRef,
    isReady,
    isInitialized,
    zoom,
    pan,
    addText,
    addRectangle,
    addCircle,
    addTriangle,
    addStickyNote,
    addImage,
    addAudio,
    removeObject,
    clearAll,
    deselectAll,
    deleteSelected,
    groupSelection,
    ungroupSelection,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    renderer: useCanvasStore.getState().renderer,
  }
}