/**
 * SVG export functionality for canvas
 */

import { Canvas } from 'fabric'
import type { SVGExportOptions } from '@/types/export'

export class SVGExporter {
  private canvas: Canvas

  constructor(canvas: Canvas) {
    this.canvas = canvas
  }

  /**
   * Export canvas as SVG with options
   */
  async export(options: SVGExportOptions): Promise<string> {
    const {
      scale = 1,
      includeMetadata = true,
      includeStyles = true,
      viewBox,
    } = options

    // Get canvas dimensions
    const width = this.canvas.getWidth() * scale
    const height = this.canvas.getHeight() * scale

    // Use Fabric's toSVG method with Fabric v6 compatible TSVGExportOptions
    const svgString = this.canvas.toSVG({
      suppressPreamble: !includeMetadata,
      viewBox: viewBox ? {
        x: viewBox.x,
        y: viewBox.y,
        width: viewBox.width,
        height: viewBox.height,
      } : undefined,
      width: `${width}px`,
      height: `${height}px`,
    })

    let finalSVG = svgString

    // Add custom styles if needed
    if (includeStyles) {
      const styleTag = `
        <style>
          .fabric-object { 
            vector-effect: non-scaling-stroke;
          }
        </style>
      `
      finalSVG = finalSVG.replace('</svg>', `${styleTag}</svg>`)
    }

    // Add metadata
    if (includeMetadata) {
      const metadata = `
        <!-- 
          Exported from Real-Time Collaborative Canvas
          Date: ${new Date().toISOString()}
          Objects: ${this.canvas.getObjects().length}
          Scale: ${scale}x
        -->
      `
      finalSVG = finalSVG.replace('<svg', `${metadata}\n<svg`)
    }

    return finalSVG
  }

  /**
   * Export and download SVG
   */
  async download(filename: string, options: SVGExportOptions): Promise<void> {
    const svgContent = await this.export(options)
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.svg') ? filename : `${filename}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /**
   * Get SVG as string
   */
  async getSVGString(options: SVGExportOptions): Promise<string> {
    return this.export(options)
  }
}

/**
 * Create an SVG exporter instance
 */
export function createSVGExporter(canvas: Canvas): SVGExporter {
  return new SVGExporter(canvas)
}