/**
 * PNG export functionality for canvas
 */

import { Canvas } from 'fabric'
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

    // Swapped only for the duration of this call, always restored below.
    // Safe to mutate on the live canvas: toDataURL/toCanvasElement render
    // to a detached offscreen canvas element, never to this canvas's own
    // visible context, so the live view never flashes the export's
    // background color.
    const previousBackground = this.canvas.backgroundColor
    this.canvas.backgroundColor = backgroundColor

    let dataUrl: string
    try {
      // Fabric's own toDataURL/toCanvasElement composes the requested
      // `multiplier` with the canvas's CURRENT viewportTransform (pan +
      // zoom) before rendering — internally: newZoom = zoom * multiplier,
      // with the pan offset scaled the same way. The previous implementation
      // instead cloned every object and scaled only each clone's raw
      // left/top/width/height by `scale`, in absolute object-space,
      // completely ignoring pan/zoom — so a panned-away object rendered off
      // the fixed-size output canvas (silently missing from the export) and
      // a zoomed-out view exported as if it were sitting at 100%. Using
      // Fabric's own renderer here instead of re-deriving that coordinate
      // math is what makes the export actually match what's on screen.
      dataUrl = this.canvas.toDataURL({
        format: 'png',
        quality,
        multiplier: scale,
        // Excludes every object from the render without touching their
        // `visible` property (which would need its own save/restore pass).
        filter: includeObjects ? undefined : () => false,
      })
    } finally {
      this.canvas.backgroundColor = previousBackground
    }

    const response = await fetch(dataUrl)
    return response.blob()
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