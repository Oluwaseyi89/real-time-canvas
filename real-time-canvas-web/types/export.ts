/**
 * Export types for canvas export functionality
 * Defines export formats, options, and configuration
 */

/**
 * Supported export formats
 */
export type ExportFormat = 'png' | 'svg' | 'json'

/**
 * Export configuration options
 */
export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean
  includeHistory?: boolean
  quality?: number // For PNG (0-1)
  scale?: number // Scale factor for export
  backgroundColor?: string
}

/**
 * PNG export options
 */
export interface PNGExportOptions {
  quality: number // 0-1
  scale: number
  backgroundColor?: string
  includeObjects?: boolean
}

/**
 * SVG export options
 */
export interface SVGExportOptions {
  scale: number
  includeMetadata?: boolean
  includeStyles?: boolean
  viewBox?: { x: number; y: number; width: number; height: number }
}

/**
 * JSON export options
 */
export interface JSONExportOptions {
  includeMetadata: boolean
  includeHistory: boolean
  prettyPrint: boolean
  includeVersion: boolean
  includeUserData: boolean
}

/**
 * Canvas export data for JSON format
 */
export interface CanvasExportData {
  version: string
  exportedAt: string
  metadata: {
    roomId: string
    userId: string
    username: string
    objectCount: number
    exportOptions: Partial<ExportOptions>
  }
  objects: Array<{
    id: string
    type: string
    data: Record<string, unknown>
    position: { x: number; y: number }
    size: { width: number; height: number }
    rotation: number
    zIndex: number
    version: number
    createdAt: string
    updatedAt: string
    createdBy?: string
  }>
  history?: Array<{
    timestamp: string
    action: string
    objectId: string
    userId: string
  }>
}

/**
 * Export progress status
 */
export interface ExportProgress {
  isExporting: boolean
  progress: number
  format: ExportFormat | null
  error: string | null
}
