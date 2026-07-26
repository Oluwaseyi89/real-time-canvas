/**
 * PNG export functionality for canvas
 */

import { Canvas, Object as FabricObject } from 'fabric'
import type { PNGExportOptions } from '@/types/export'

export class PNGExporter {
  private canvas: Canvas

  constructor(canvas: Canvas) {
    this.canvas = canvas
  }

  /**
   * Export canvas as PNG with options
   */
  async export(options: PNGExportOptions): Promise<Blob> {
    const {
      quality = 1,
      scale = 1,
      backgroundColor = '#ffffff',
      includeObjects = true,
    } = options

    // Get canvas dimensions
    const originalWidth = this.canvas.getWidth()
    const originalHeight = this.canvas.getHeight()

    // Calculate scaled dimensions
    const width = originalWidth * scale
    const height = originalHeight * scale

    // Create a temporary canvas for export
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempContext = tempCanvas.getContext('2d')!

    // Fill background
    tempContext.fillStyle = backgroundColor
    tempContext.fillRect(0, 0, width, height)

    if (includeObjects) {
      // Get all objects
      const objects = this.canvas.getObjects()

      // Create a temporary Fabric canvas for rendering
      const tempFabricCanvas = new Canvas(tempCanvas)

      // Set dimensions
      tempFabricCanvas.setWidth(width)
      tempFabricCanvas.setHeight(height)

      // Add objects with scaling asynchronously (Fabric v6 clone returns a Promise)
      for (const obj of objects) {
        const clone = await obj.clone()
        if (clone) {
          // Apply scaling properties safely
          clone.scaleX = (clone.scaleX || 1) * scale
          clone.scaleY = (clone.scaleY || 1) * scale
          clone.left = (clone.left || 0) * scale
          clone.top = (clone.top || 0) * scale
          clone.width = (clone.width || 0) * scale
          clone.height = (clone.height || 0) * scale
          
          tempFabricCanvas.add(clone)
        }
      }

      // Render to temp canvas
      tempFabricCanvas.requestRenderAll()
    }

    // Convert to blob
    return new Promise((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to generate PNG blob'))
          }
        },
        'image/png',
        quality
      )
    })
  }

  /**
   * Export and download PNG
   */
  async download(filename: string, options: PNGExportOptions): Promise<void> {
    const blob = await this.export(options)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/**
 * Create a PNG exporter instance
 */
export function createPNGExporter(canvas: Canvas): PNGExporter {
  return new PNGExporter(canvas)
}