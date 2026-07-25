/**
 * Minimap renderer
 * Renders a small overview of the canvas with user positions
 */

import { Canvas, Object as FabricObject } from 'fabric'
import type { MinimapConfig, RadarUser, RadarObject, ViewportRect } from '@/types/minimap'

export class MinimapRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: MinimapConfig
  private objects: FabricObject[] = []
  private users: RadarUser[] = []
  private viewport: ViewportRect = { x: 0, y: 0, width: 0, height: 0 }
  private canvasWidth: number = 0
  private canvasHeight: number = 0

  constructor(canvas: HTMLCanvasElement, config: MinimapConfig) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.config = config
    this.setupCanvas()
  }

  /**
   * Setup canvas dimensions
   */
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = this.config.width * dpr
    this.canvas.height = this.config.height * dpr
    this.canvas.style.width = `${this.config.width}px`
    this.canvas.style.height = `${this.config.height}px`
    this.ctx.scale(dpr, dpr)
  }

  /**
   * Update minimap data
   */
  update(
    objects: FabricObject[],
    users: RadarUser[],
    viewport: ViewportRect,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.objects = objects
    this.users = users
    this.viewport = viewport
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.render()
  }

  /**
   * Render the minimap
   */
  private render(): void {
    const ctx = this.ctx
    const { width, height } = this.config

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background
    ctx.fillStyle = this.config.backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    if (this.config.showGrid) {
      this.drawGrid()
    }

    // Draw objects
    if (this.config.showObjectPreview) {
      this.drawObjects()
    }

    // Draw viewport
    this.drawViewport()

    // Draw users
    this.drawUsers()

    // Draw border
    this.drawBorder()
  }

  /**
   * Draw grid lines
   */
  private drawGrid(): void {
    const ctx = this.ctx
    const { width, height, gridSize, gridColor } = this.config

    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5

    for (let x = gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  /**
   * Draw canvas objects on minimap
   */
  private drawObjects(): void {
    const ctx = this.ctx
    const { width, height } = this.config

    // Calculate scale to fit all objects in minimap
    const scaleX = width / this.canvasWidth
    const scaleY = height / this.canvasHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    // Center objects
    const offsetX = (width - this.canvasWidth * scale) / 2
    const offsetY = (height - this.canvasHeight * scale) / 2

    this.objects.forEach((obj) => {
      const left = obj.left || 0
      const top = obj.top || 0
      const objWidth = obj.width || 20
      const objHeight = obj.height || 20

      const x = offsetX + left * scale
      const y = offsetY + top * scale
      const w = objWidth * scale
      const h = objHeight * scale

      // Skip if too small
      if (w < 1 || h < 1) return

      ctx.fillStyle = this.getObjectColor(obj)
      ctx.fillRect(x, y, Math.max(w, 1), Math.max(h, 1))
    })
  }

  /**
   * Draw viewport rectangle
   */
  private drawViewport(): void {
    const ctx = this.ctx
    const { width, height } = this.config

    const scaleX = width / this.canvasWidth
    const scaleY = height / this.canvasHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    const offsetX = (width - this.canvasWidth * scale) / 2
    const offsetY = (height - this.canvasHeight * scale) / 2

    const vx = offsetX + this.viewport.x * scale
    const vy = offsetY + this.viewport.y * scale
    const vw = this.viewport.width * scale
    const vh = this.viewport.height * scale

    // Draw viewport rectangle
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(vx, vy, vw, vh)
    ctx.setLineDash([])

    // Draw viewport corner handles
    const handleSize = 4
    ctx.fillStyle = '#3b82f6'
    ;[
      [vx, vy],
      [vx + vw, vy],
      [vx, vy + vh],
      [vx + vw, vy + vh],
    ].forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize)
    })
  }

  /**
   * Draw user dots with labels
   */
  private drawUsers(): void {
    const ctx = this.ctx
    const { width, height, userDotRadius, showUserLabels } = this.config

    const scaleX = width / this.canvasWidth
    const scaleY = height / this.canvasHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    const offsetX = (width - this.canvasWidth * scale) / 2
    const offsetY = (height - this.canvasHeight * scale) / 2

    this.users.forEach((user) => {
      const x = offsetX + user.position.x * scale
      const y = offsetY + user.position.y * scale

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, userDotRadius * 3)
      gradient.addColorStop(0, `${user.color}40`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, userDotRadius * 3, 0, Math.PI * 2)
      ctx.fill()

      // Draw dot
      ctx.shadowColor = 'rgba(0,0,0,0.2)'
      ctx.shadowBlur = 4
      ctx.fillStyle = user.color
      ctx.beginPath()
      ctx.arc(x, y, userDotRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Draw label
      if (showUserLabels) {
        ctx.fillStyle = user.color
        ctx.font = '8px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(user.username, x, y - userDotRadius - 4)
      }
    })
  }

  /**
   * Draw border
   */
  private drawBorder(): void {
    const ctx = this.ctx
    const { width, height, borderColor, borderWidth, cornerRadius } = this.config

    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth
    ctx.roundRect(0, 0, width, height, cornerRadius)
    ctx.stroke()
  }

  /**
   * Get color for object based on type
   */
  private getObjectColor(obj: FabricObject): string {
    const type = obj.type || 'unknown'
    const colors: Record<string, string> = {
      text: '#6b7280',
      rect: '#3b82f6',
      circle: '#ef4444',
      triangle: '#10b981',
      image: '#8b5cf6',
      sticky: '#f59e0b',
      stickyGroup: '#f59e0b',
      audio: '#ec4899',
      default: '#9ca3af',
    }
    return colors[type] || colors.default
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<MinimapConfig>): void {
    this.config = { ...this.config, ...config }
    this.setupCanvas()
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.ctx.clearRect(0, 0, this.config.width, this.config.height)
  }
}
