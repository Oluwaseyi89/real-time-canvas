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
} from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { initializeCanvas, disposeCanvas, ZOOM_CONFIG } from '@/lib/canvas/fabricConfig'
import { CanvasRenderer, createRenderer } from '@/lib/canvas/renderer'
import { ObjectFactory, CanvasObject, WithCustomProps } from '@/lib/canvas/objectFactory'
import { ITextProps, RectProps, CircleProps, ImageProps } from 'fabric'

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
  onZoomChange?: (zoom: number) => void
  onPanChange?: (pan: { x: number; y: number }) => void
}

/**
 * Main canvas hook for managing canvas lifecycle and interactions
 */
export function useCanvas(options: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)

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

    // Mouse wheel zoom handling
    fabricCanvas.on('mouse:wheel', (opt: { e: WheelEvent }) => {
      const e = opt.e
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

      e.preventDefault()
      e.stopPropagation()
    })

    // Mouse drag for pan
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0

    fabricCanvas.on('mouse:down', (opt: { e: TPointerEvent }) => {
      const e = opt.e as MouseEvent
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
      if (isDragging) {
        const e = opt.e as MouseEvent
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

    fabricCanvas.on('mouse:up', () => {
      if (isDragging) {
        isDragging = false
        fabricCanvas.selection = true
        fabricCanvas.defaultCursor = 'default'
      }
    })

    // Prevent default right-click context menu on canvas wrapper element
    if (fabricCanvas.getSelectionElement()) {
      const wrapper = fabricCanvas.getSelectionElement().parentElement
      if (wrapper) {
        wrapper.addEventListener('contextmenu', (e: Event) => e.preventDefault())
      }
    }
  }, [setZoom, setPan])

  /**
   * Initialize the canvas instance
   */
  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) {
      console.warn('[useCanvas] Canvas refs not available')
      return
    }

    try {
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      // Initialize Fabric.js canvas
      const fabricCanvas = initializeCanvas(canvasRef.current)
      fabricCanvas.setDimensions({ width, height })

      // Update store viewport state
      setViewport({ width, height })

      // Initialize renderer
      rendererRef.current = createRenderer(fabricCanvas)

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
   * Factory helpers to create & render elements
   */
  const addText = useCallback((text: string, options?: WithCustomProps<ITextProps>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createText(text, {
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addRectangle = useCallback((options?: WithCustomProps<RectProps>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createRectangle({
      width: 100,
      height: 100,
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addCircle = useCallback((options?: WithCustomProps<CircleProps>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createCircle({
      radius: 50,
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addStickyNote = useCallback((text: string, options?: WithCustomProps<RectProps>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createStickyNote(text, {
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj)

    return obj
  }, [])

  const addImage = useCallback(async (url: string, options?: WithCustomProps<ImageProps>) => {
    if (!rendererRef.current) return

    try {
      const obj = await ObjectFactory.createImage(url, {
        left: 100,
        top: 100,
        ...options,
      })

      rendererRef.current.addObject(obj, obj.id)
      useCanvasStore.getState().addObject(obj)

      return obj
    } catch (error) {
      console.error('[useCanvas] Failed to add image:', error)
      throw error
    }
  }, [])

  /**
   * Removal & Clear Actions
   */
  const removeObject = useCallback((id: string) => {
    const { objects } = useCanvasStore.getState()
    const obj = objects.find((o) => (o as CanvasObject).id === id)

    if (obj && rendererRef.current) {
      rendererRef.current.removeObject(obj, id)
      useCanvasStore.getState().removeObject(id)
    }
  }, [])

  const clearAll = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearAll()
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

  // Canvas Initialization and Lifecycle Cleanup
  useEffect(() => {
    if (!isInitialized && containerRef.current && canvasRef.current) {
      initCanvas()
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      if (canvas) {
        disposeCanvas(canvas)
      }
      setIsInitialized(false)
    }
  }, [initCanvas, isInitialized, canvas])

  // Window Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        canvas.setDimensions({ width, height })
        setViewport({ width, height })
        canvas.requestRenderAll()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvas, setViewport])

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
    addStickyNote,
    addImage,
    removeObject,
    clearAll,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    renderer: rendererRef.current,
  }
}