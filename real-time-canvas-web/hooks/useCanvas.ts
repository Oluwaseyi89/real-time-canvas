/**
 * Custom hook for canvas management
 * Provides canvas initialization, interaction, and state management
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
import { initializeCanvas, disposeCanvas, ZOOM_CONFIG } from '@/lib/canvas/fabricConfig'
import { CanvasRenderer, createRenderer } from '@/lib/canvas/renderer'
import { ObjectFactory } from '@/lib/canvas/objectFactory'

interface UseCanvasOptions {
  onObjectAdded?: (obj: fabric.Object) => void
  onObjectRemoved?: (obj: fabric.Object) => void
  onObjectSelected?: (obj: fabric.Object) => void
  onObjectModified?: (obj: fabric.Object) => void
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
   * Initialize the canvas
   */
  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) {
      console.warn('Canvas refs not available')
      return
    }

    try {
      // Initialize Fabric.js canvas
      const fabricCanvas = initializeCanvas(canvasRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })

      // Set initial viewport
      setViewport({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })

      // Create renderer
      rendererRef.current = createRenderer(fabricCanvas)

      // Store canvas in store
      setCanvas(fabricCanvas)

      // Set up event listeners
      setupCanvasEvents(fabricCanvas)

      setIsInitialized(true)

      // Callback
      console.log('[useCanvas] Canvas initialized successfully')
    } catch (error) {
      console.error('[useCanvas] Failed to initialize canvas:', error)
    }
  }, [])

  /**
   * Set up canvas event listeners
   */
  const setupCanvasEvents = useCallback((fabricCanvas: fabric.Canvas) => {
    // Object added event
    fabricCanvas.on('object:added', (e) => {
      if (e.target) {
        options.onObjectAdded?.(e.target)
      }
    })

    // Object removed event
    fabricCanvas.on('object:removed', (e) => {
      if (e.target) {
        options.onObjectRemoved?.(e.target)
      }
    })

    // Object selected event
    fabricCanvas.on('selection:created', (e) => {
      if (e.selected && e.selected.length > 0) {
        options.onObjectSelected?.(e.selected[0])
      }
    })

    // Object modified event
    fabricCanvas.on('object:modified', (e) => {
      if (e.target) {
        options.onObjectModified?.(e.target)
      }
    })

    // Mouse wheel for zoom
    fabricCanvas.on('mouse:wheel', (e) => {
      const delta = e.e.deltaY
      const pointer = fabricCanvas.getPointer(e.e)
      const currentZoom = fabricCanvas.getZoom()

      let newZoom = currentZoom - delta * ZOOM_CONFIG.wheelZoomSpeed
      newZoom = Math.min(Math.max(newZoom, ZOOM_CONFIG.minZoom), ZOOM_CONFIG.maxZoom)

      // Zoom at cursor position
      fabricCanvas.zoomToPoint(
        new fabric.Point(pointer.x, pointer.y),
        newZoom
      )

      setZoom(newZoom)
      options.onZoomChange?.(newZoom)

      e.e.preventDefault()
      e.e.stopPropagation()
    })

    // Mouse drag for pan
    let isDragging = false
    let lastPosX = 0
    let lastPosY = 0

    fabricCanvas.on('mouse:down', (e) => {
      if (e.e.button === 1 || e.e.button === 2) {
        // Middle or right click
        isDragging = true
        const pointer = fabricCanvas.getPointer(e.e)
        lastPosX = pointer.x
        lastPosY = pointer.y
        fabricCanvas.selection = false
        fabricCanvas.defaultCursor = 'grab'
      }
    })

    fabricCanvas.on('mouse:move', (e) => {
      if (isDragging) {
        const pointer = fabricCanvas.getPointer(e.e)
        const dx = pointer.x - lastPosX
        const dy = pointer.y - lastPosY

        const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0]
        vpt[4] += dx
        vpt[5] += dy
        fabricCanvas.setViewportTransform(vpt)
        fabricCanvas.renderAll()

        setPan({ x: vpt[4], y: vpt[5] })
        options.onPanChange?.({ x: vpt[4], y: vpt[5] })

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

    // Prevent context menu on canvas
    fabricCanvas.wrapperEl.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
  }, [])

  /**
   * Add a text object to the canvas
   */
  const addText = useCallback((text: string, options?: Partial<fabric.ITextOptions>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createText(text, {
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj as any)

    return obj
  }, [])

  /**
   * Add a rectangle shape
   */
  const addRectangle = useCallback((options?: Partial<fabric.IRectOptions>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createRectangle({
      width: 100,
      height: 100,
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj as any)

    return obj
  }, [])

  /**
   * Add a circle shape
   */
  const addCircle = useCallback((options?: Partial<fabric.ICircleOptions>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createCircle({
      radius: 50,
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj as any)

    return obj
  }, [])

  /**
   * Add a sticky note
   */
  const addStickyNote = useCallback((text: string, options?: Partial<fabric.IRectOptions>) => {
    if (!rendererRef.current) return

    const obj = ObjectFactory.createStickyNote(text, {
      left: 100,
      top: 100,
      ...options,
    })

    rendererRef.current.addObject(obj, obj.id)
    useCanvasStore.getState().addObject(obj as any)

    return obj
  }, [])

  /**
   * Add an image
   */
  const addImage = useCallback(async (url: string, options?: Partial<fabric.IImageOptions>) => {
    if (!rendererRef.current) return

    try {
      const obj = await ObjectFactory.createImage(url, {
        left: 100,
        top: 100,
        ...options,
      })

      rendererRef.current.addObject(obj, obj.id)
      useCanvasStore.getState().addObject(obj as any)

      return obj
    } catch (error) {
      console.error('[useCanvas] Failed to add image:', error)
      throw error
    }
  }, [])

  /**
   * Remove an object by ID
   */
  const removeObject = useCallback((id: string) => {
    const { objects } = useCanvasStore.getState()
    const obj = objects.find((o) => o.id === id)

    if (obj && rendererRef.current) {
      rendererRef.current.removeObject(obj, id)
      useCanvasStore.getState().removeObject(id)
    }
  }, [])

  /**
   * Clear all objects
   */
  const clearAll = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clearAll()
      useCanvasStore.getState().clearAllObjects()
    }
  }, [])

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    const currentZoom = zoom
    const newZoom = Math.min(currentZoom + ZOOM_CONFIG.zoomStep, ZOOM_CONFIG.maxZoom)
    setZoom(newZoom)
    if (canvas) {
      canvas.setZoom(newZoom)
      canvas.renderAll()
    }
  }, [zoom, canvas])

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    const currentZoom = zoom
    const newZoom = Math.max(currentZoom - ZOOM_CONFIG.zoomStep, ZOOM_CONFIG.minZoom)
    setZoom(newZoom)
    if (canvas) {
      canvas.setZoom(newZoom)
      canvas.renderAll()
    }
  }, [zoom, canvas])

  /**
   * Reset view to default
   */
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    if (canvas) {
      canvas.setZoom(1)
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
      canvas.renderAll()
    }
  }, [canvas])

  /**
   * Fit objects to view
   */
  const fitToView = useCallback(() => {
    if (!canvas) return

    const objects = canvas.getObjects()
    if (objects.length === 0) return

    const rect = canvas.getObjects().reduce((bounds, obj) => {
      const objBounds = obj.getBoundingRect()
      if (!bounds) return objBounds
      return {
        left: Math.min(bounds.left, objBounds.left),
        top: Math.min(bounds.top, objBounds.top),
        width: Math.max(bounds.left + bounds.width, objBounds.left + objBounds.width) - Math.min(bounds.left, objBounds.left),
        height: Math.max(bounds.top + bounds.height, objBounds.top + objBounds.height) - Math.min(bounds.top, objBounds.top),
      }
    }, null as fabric.IRect | null)

    if (rect) {
      const viewportWidth = canvas.getWidth()
      const viewportHeight = canvas.getHeight()
      const scaleX = (viewportWidth * 0.8) / rect.width
      const scaleY = (viewportHeight * 0.8) / rect.height
      const scale = Math.min(scaleX, scaleY, ZOOM_CONFIG.maxZoom)

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      vpt[0] = scale
      vpt[3] = scale
      vpt[4] = viewportWidth / 2 - centerX * scale
      vpt[5] = viewportHeight / 2 - centerY * scale

      canvas.setViewportTransform(vpt)
      canvas.renderAll()

      setZoom(scale)
      setPan({ x: vpt[4], y: vpt[5] })
    }
  }, [canvas])

  // Initialize canvas on mount
  useEffect(() => {
    if (!isInitialized && containerRef.current && canvasRef.current) {
      initCanvas()
    }

    // Cleanup on unmount
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        canvas.setWidth(width)
        canvas.setHeight(height)
        setViewport({ width, height })
        canvas.renderAll()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvas])

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
