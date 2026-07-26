/**
 * JSON export functionality for canvas
 */

import { Canvas, FabricObject } from 'fabric'
import type { JSONExportOptions, CanvasExportData, ExportOptions } from '@/types/export'
import { v4 as uuidv4 } from 'uuid'

interface CustomFabricObject extends FabricObject {
  id?: string
  zIndex?: number
  version?: number
  createdAt?: string
  updatedAt?: string
  createdBy?: string
}

export class JSONExporter {
  private canvas: Canvas
  private roomId: string
  private userId: string
  private username: string

  constructor(canvas: Canvas, roomId: string, userId: string, username: string) {
    this.canvas = canvas
    this.roomId = roomId
    this.userId = userId
    this.username = username
  }

  /**
   * Export canvas as JSON with options
   */
  async export(options: JSONExportOptions): Promise<CanvasExportData> {
    const {
      includeMetadata = true,
      includeHistory = false,
      includeVersion = true,
      includeUserData = true,
    } = options

    const objects = this.canvas.getObjects()
    const version = includeVersion ? '1.0.0' : undefined

    // Strictly map options that exist on Partial<ExportOptions>
    const exportOptionsMeta: Partial<ExportOptions> = {
      format: 'json',
      includeMetadata,
      includeHistory,
    }

    // Build export data
    const exportData: CanvasExportData = {
      version: version || '1.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        roomId: this.roomId,
        userId: this.userId,
        username: this.username,
        objectCount: objects.length,
        exportOptions: exportOptionsMeta,
      },
      objects: objects.map((obj) => {
        const fabricObj = obj as CustomFabricObject
        return {
          id: fabricObj.id || uuidv4(),
          type: fabricObj.type || 'unknown',
          data: typeof fabricObj.toObject === 'function' ? fabricObj.toObject() : {},
          position: {
            x: fabricObj.left || 0,
            y: fabricObj.top || 0,
          },
          size: {
            width: fabricObj.width || 0,
            height: fabricObj.height || 0,
          },
          rotation: fabricObj.angle || 0,
          zIndex: fabricObj.zIndex || 0,
          version: fabricObj.version || 1,
          createdAt: fabricObj.createdAt || new Date().toISOString(),
          updatedAt: fabricObj.updatedAt || new Date().toISOString(),
          createdBy: includeUserData ? fabricObj.createdBy || this.username : undefined,
        }
      }),
      history: includeHistory ? [] : undefined,
    }

    return exportData
  }

  /**
   * Export and download JSON
   */
  async download(filename: string, options: JSONExportOptions): Promise<void> {
    const data = await this.export(options)
    const jsonString = options.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /**
   * Get JSON as string
   */
  async getJSONString(options: JSONExportOptions): Promise<string> {
    const data = await this.export(options)
    return options.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data)
  }
}

/**
 * Create a JSON exporter instance
 */
export function createJSONExporter(
  canvas: Canvas,
  roomId: string,
  userId: string,
  username: string
): JSONExporter {
  return new JSONExporter(canvas, roomId, userId, username)
}