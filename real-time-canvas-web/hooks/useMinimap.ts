/**
 * Custom hook for minimap management
 * Provides minimap rendering and interaction
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useCollaborationStore } from '@/store/collaborationStore'
import { useMinimapStore } from '@/store/minimapStore'
import { MinimapRenderer } from '@/lib/canvas/MinimapRenderer'
import type { RadarUser, ViewportRect } from '@/types/minimap'
import { Canvas, Object as FabricObject } from 'fabric'

export function useMinimap() {
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<MinimapRenderer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const animationFrameRef = useRef<number | null>(null)

  const { canvas, objects, viewport, zoom, pan } = useCanvasStore()
  const { users } = useCollaborationStore()
  const { config, isVisible, isCollapsed } = useMinimapStore()

  /**
   * Initialize minimap renderer
   */
  const initRenderer = useCallback(() => {
    if (!minimapCanvasRef.current) return

    rendererRef.current = new MinimapRenderer(
      minimapCanvasRef.current,
      config
    )
    setIsReady(true)
  }, [config])

  /**
   * Get radar users from collaboration store
   */
  const getRadarUsers = useCallback((): RadarUser[] => {
    const userList: RadarUser[] = []
    users.forEach((user) => {
      if (user.isActive && user.cursor) {
        userList.push({
          userId: user.userId,
          username: user.username,
          position: { x: user.cursor.x, y: user.cursor.y },
          color: getUserColor(user.userId),
          isActive: user.isActive,
        })
      }
    })
    return userList
  }, [users])

  /**
   * Get viewport rectangle
   */
  const getViewport = useCallback((): ViewportRect => {
    const canvasWidth = canvas?.getWidth() || 800
    const canvasHeight = canvas?.getHeight() || 600

    // Calculate viewport in canvas coordinates
    const vpt = canvas?.viewportTransform || [1, 0, 0, 1, 0, 0]
    const scale = vpt[0] || 1
    const panX = vpt[4] || 0
    const panY = vpt[5] || 0

    return {
      x: -panX / scale,
      y: -panY / scale,
      width: canvasWidth / scale,
      height: canvasHeight / scale,
    }
  }, [canvas])

  /**
   * Get canvas objects for minimap
   */
  const getCanvasObjects = useCallback((): FabricObject[] => {
    return canvas?.getObjects() || []
  }, [canvas])

  /**
   * Get canvas dimensions
   */
  const getCanvasDimensions = useCallback((): { width: number; height: number } => {
    const canvasWidth = canvas?.getWidth() || 800
    const canvasHeight = canvas?.getHeight() || 600

    // Calculate total canvas bounds
    const objects = canvas?.getObjects() || []
    let maxX = canvasWidth
    let maxY = canvasHeight

    objects.forEach((obj) => {
      const rect = obj.getBoundingRect()
      const right = rect.left + rect.width
      const bottom = rect.top + rect.height
      maxX = Math.max(maxX, Math.abs(right))
      maxY = Math.max(maxY, Math.abs(bottom))
    })

    // Add padding
    const padding = 100
    return {
      width: maxX + padding,
      height: maxY + padding,
    }
  }, [canvas])

  /**
   * Render minimap
   */
  const renderMinimap = useCallback(() => {
    if (!rendererRef.current || !isVisible || isCollapsed) return

    const objects = getCanvasObjects()
    const users = getRadarUsers()
    const viewport = getViewport()
    const dimensions = getCanvasDimensions()

    rendererRef.current.update(
      objects,
      users,
      viewport,
      dimensions.width,
      dimensions.height
    )
  }, [isVisible, isCollapsed, getCanvasObjects, getRadarUsers, getViewport, getCanvasDimensions])

  /**
   * Animation loop for continuous updates
   */
  const animate = useCallback(() => {
    renderMinimap()
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [renderMinimap])

  /**
   * Handle minimap click for navigation
   */
  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvas || !minimapCanvasRef.current) return

      const rect = minimapCanvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Convert minimap coordinates to canvas coordinates
      const dims = getCanvasDimensions()
      const configWidth = config.width
      const configHeight = config.height

      const scaleX = dims.width / configWidth
      const scaleY = dims.height / configHeight
      const scale = Math.min(scaleX, scaleY) * 0.9

      const offsetX = (configWidth - dims.width * scale) / 2
      const offsetY = (configHeight - dims.height * scale) / 2

      const canvasX = (x - offsetX) / scale
      const canvasY = (y - offsetY) / scale

      // Center viewport on clicked position
      const viewportWidth = canvas.getWidth()
      const viewportHeight = canvas.getHeight()
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]

      vpt[4] = -canvasX * vpt[0] + viewportWidth / 2
      vpt[5] = -canvasY * vpt[3] + viewportHeight / 2

      canvas.setViewportTransform(vpt as [number, number, number, number, number, number])
      canvas.requestRenderAll()
    },
    [canvas, config, getCanvasDimensions]
  )

  // Initialize renderer
  useEffect(() => {
    if (minimapCanvasRef.current) {
      initRenderer()
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current = null
      }
    }
  }, [initRenderer])

  // Start animation loop
  useEffect(() => {
    if (isReady && isVisible && !isCollapsed) {
      animate()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isReady, isVisible, isCollapsed, animate])

  // Update when config changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(config)
    }
  }, [config])

  return {
    minimapCanvasRef,
    isReady,
    isVisible,
    isCollapsed,
    handleMinimapClick,
    renderMinimap,
  }
}

/**
 * Generate consistent color for a user
 */
function getUserColor(userId: string): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#06b6d4', '#8b5cf6', '#d946ef',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
